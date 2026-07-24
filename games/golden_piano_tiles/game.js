(() => {
'use strict';

// ---------- constants (from design prototype) ----------
const BPM = 100;
const APPROACH = 2.0;   // seconds for tile head to reach hit line
const HITWIN = 0.24;    // hit window around headTime
const LATE = 0.20;      // miss if headTime + LATE passed without hit
const HS_KEY = 'goldenTilesHigh';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const song = $('song');
const bgVideo = $('bgVideo');
const tilesLayer = $('tilesLayer');
const scoreValue = $('scoreValue');
const comboValue = $('comboValue');
const progressFill = $('progressFill');
const comboPopup = $('comboPopup');
const hud = $('hud');
const menuScreen = $('menuScreen');
const overScreen = $('overScreen');
const highScoreLine = $('highScoreLine');
const resultTitle = $('resultTitle');
const finalScore = $('finalScore');
const bestBadge = $('bestBadge');
const bestLine = $('bestLine');
const bestComboLine = $('bestComboLine');
const btnMain = $('btnMain');
const btnReplay = $('btnReplay');
const btnMenu = $('btnMenu');
const tapZones = Array.from(document.querySelectorAll('.tapZone'));

// ---------- state ----------
let phase = 'menu'; // menu | playing | over
let score = 0;
let combo = 0;
let bestCombo = 0;
let highScore = parseInt(localStorage.getItem(HS_KEY) || '0', 10);
let isNewBest = false;
let result = 'lost';

let tiles = [];
let beatmap = [];
let spawnIdx = 0;
let pressed = [false, false, false];
let raf = null;
let songDur = 210;
let H = 800;
let hitY = 640;
let pps = 320;
let tileH = 100;
let leadIn = 2.6;
let missBeat = null;
let ac = null;

// ---------- init ----------
function refreshHighScoreUI() {
  if (highScore > 0) {
    highScoreLine.hidden = false;
    highScoreLine.textContent = `🏆 Skor tertinggi: ${highScore}`;
  } else {
    highScoreLine.hidden = true;
  }
}

function measure() {
  H = tilesLayer.clientHeight || stage.clientHeight || 800;
  hitY = H * 0.80;
  pps = hitY / APPROACH;
  tileH = H * 0.13;
  leadIn = APPROACH + 0.6;
}

song.addEventListener('loadedmetadata', () => {
  if (song.duration && isFinite(song.duration)) songDur = song.duration;
});

// keep bg video muted + looping
try {
  bgVideo.muted = true;
  bgVideo.volume = 0;
  const vp = bgVideo.play();
  if (vp && vp.catch) vp.catch(() => {});
} catch (_) {}

refreshHighScoreUI();

// ---------- audio sfx ----------
function initAudio() {
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
}

function blip(freq, dur, vol, type) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function sfxHit() { blip(1760, 0.14, 0.16, 'sine'); }
function sfxMiss() { blip(150, 0.35, 0.28, 'sawtooth'); }

// ---------- beatmap ----------
function pickLane(prev) {
  let l = Math.floor(Math.random() * 3);
  if (l === prev && Math.random() < 0.7) l = (l + 1 + Math.floor(Math.random() * 2)) % 3;
  return l;
}

function generateBeatmap() {
  const spb = 60 / BPM;
  const patterns = [
    [{ d: 1 }, { d: 1 }, { d: 0.5 }, { d: 0.5 }, { d: 1 }],
    [{ d: 0.5 }, { d: 0.5 }, { d: 0.5 }, { d: 0.5 }, { d: 2, hold: true }],
    [{ d: 1 }, { d: 0.5 }, { d: 0.5 }, { d: 1 }, { d: 1 }],
    [{ d: 1 }, { d: 1 }, { d: 3, hold: true }],
    [{ d: 0.5 }, { d: 0.5 }, { d: 1 }, { d: 0.5 }, { d: 0.5 }, { d: 1 }],
    [{ d: 1 }, { d: 0.5 }, { d: 0.5 }, { d: 2, hold: true }],
  ];
  const map = [];
  let t = leadIn;
  let prev = -1;
  const end = songDur - 2.5;
  while (t < end) {
    const pat = patterns[Math.floor(Math.random() * patterns.length)];
    for (const step of pat) {
      if (t >= end) break;
      const lane = pickLane(prev);
      prev = lane;
      map.push({
        headTime: t,
        dur: step.hold ? step.d * spb : 0,
        hold: !!step.hold,
        lane,
        done: false,
        hit: false,
        holding: false,
        missed: false,
        el: null,
        body: null,
        height: 0,
      });
      t += step.d * spb;
    }
  }
  return map;
}

// ---------- tile DOM ----------
function createTileEl(b) {
  const el = document.createElement('div');
  const h = b.hold ? Math.max(tileH, b.dur * pps) : tileH;
  b.height = h;
  el.className = 'tile';
  el.style.left = `${b.lane * (100 / 3)}%`;
  el.style.height = `${h}px`;

  if (b.hold) {
    el.innerHTML = `
      <div class="tile-body hold">
        <div class="hold-stripes"></div>
        <div class="hold-coin"></div>
        <div class="hold-label">TAHAN</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="tile-body">
        <div class="tile-star"></div>
      </div>`;
  }

  tilesLayer.appendChild(el);
  b.el = el;
  b.body = el.querySelector('.tile-body');
}

// ---------- HUD ----------
function updateHud() {
  scoreValue.textContent = String(score);
  comboValue.textContent = String(combo);
  if (combo >= 5) {
    comboPopup.hidden = false;
    comboPopup.textContent = `${combo} combo!`;
    // re-trigger animation
    comboPopup.style.animation = 'none';
    void comboPopup.offsetWidth;
    comboPopup.style.animation = 'comboPop 0.35s ease-out';
  } else {
    comboPopup.hidden = true;
  }
}

function setPhase(next) {
  phase = next;
  menuScreen.hidden = next !== 'menu';
  overScreen.hidden = next !== 'over';
  hud.hidden = next !== 'playing';
  if (next !== 'playing') comboPopup.hidden = true;
}

// ---------- game control ----------
function startGame() {
  initAudio();
  measure();
  tilesLayer.innerHTML = '';
  tiles = [];
  pressed = [false, false, false];
  missBeat = null;
  score = 0;
  combo = 0;
  bestCombo = 0;
  isNewBest = false;
  result = 'lost';
  spawnIdx = 0;
  beatmap = generateBeatmap();
  updateHud();
  progressFill.style.width = '0%';
  setPhase('playing');

  try {
    bgVideo.muted = true;
    bgVideo.volume = 0;
    bgVideo.currentTime = 0;
    const vp = bgVideo.play();
    if (vp && vp.catch) vp.catch(() => {});
  } catch (_) {}

  song.currentTime = 0;
  song.volume = 1;
  song.onended = () => {
    if (phase === 'playing') endGame('win');
  };
  const p = song.play();
  if (p && p.catch) p.catch(() => {});

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function goMenu() {
  cancelAnimationFrame(raf);
  tilesLayer.innerHTML = '';
  tiles = [];
  song.pause();
  song.currentTime = 0;
  setPhase('menu');
  refreshHighScoreUI();
}

function endGame(res) {
  cancelAnimationFrame(raf);
  song.pause();
  result = res;

  if (res === 'lost') {
    sfxMiss();
    if (missBeat && missBeat.body) missBeat.body.classList.add('missed');
  }

  if (score > highScore) {
    highScore = score;
    isNewBest = true;
    localStorage.setItem(HS_KEY, String(score));
  } else {
    isNewBest = false;
  }

  const delay = res === 'lost' ? 450 : 200;
  setTimeout(() => {
    resultTitle.textContent = res === 'win' ? 'Kamu hebat! 🌟' : 'Yah, meleset!';
    resultTitle.style.color = res === 'win' ? '#e8952d' : '#e8712d';
    finalScore.textContent = String(score);
    bestComboLine.textContent = `Combo terbaik: ${bestCombo}`;
    if (isNewBest) {
      bestBadge.hidden = false;
      bestLine.hidden = true;
    } else {
      bestBadge.hidden = true;
      if (highScore > 0) {
        bestLine.hidden = false;
        bestLine.textContent = `Tertinggi: ${highScore}`;
      } else {
        bestLine.hidden = true;
      }
    }
    setPhase('over');
  }, delay);
}

// ---------- scoring / feedback ----------
function scoreHit(base) {
  sfxHit();
  combo += 1;
  score += base + Math.floor(combo / 10);
  bestCombo = Math.max(bestCombo, combo);
  updateHud();
}

function popTile(b) {
  if (b.body) b.body.classList.add('popping');
  burst(b);
}

function burst(b) {
  const cx = (b.lane + 0.5) * (tilesLayer.clientWidth / 3);
  const cy = hitY;
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('div');
    const ang = (i / 7) * Math.PI * 2;
    const d = 32 + Math.random() * 24;
    p.className = 'particle';
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = i % 2 ? '#ffe07a' : '#ffffff';
    p.style.boxShadow = '0 0 8px #ffe07a';
    tilesLayer.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(ang) * d}px, ${Math.sin(ang) * d}px) scale(0.3)`;
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 550);
  }
}

function completeHold(b) {
  b.done = true;
  b.hit = true;
  scoreHit(2);
  popTile(b);
}

function breakHold(b) {
  b.done = true;
  if (b.body) b.body.classList.add('broken');
  combo = 0;
  updateHud();
}

function shakeStage() {
  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
}

// ---------- input ----------
function laneDown(lane, e) {
  if (e && e.target && e.target.setPointerCapture) {
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
  }
  pressed[lane] = true;
  if (phase !== 'playing') return;

  const at = song.currentTime || 0;
  let best = null;
  let bestDiff = 1e9;
  for (const b of tiles) {
    if (b.lane !== lane || b.done || b.hit || b.holding) continue;
    const diff = Math.abs(b.headTime - at);
    if (diff <= HITWIN && diff < bestDiff) {
      best = b;
      bestDiff = diff;
    }
  }

  if (best) {
    if (best.hold) {
      best.holding = true;
      if (best.body) best.body.classList.add('holding');
      sfxHit();
    } else {
      best.hit = true;
      best.done = true;
      scoreHit(1);
      popTile(best);
    }
  } else {
    sfxMiss();
    combo = 0;
    updateHud();
    shakeStage();
  }
}

function laneUp(lane) {
  pressed[lane] = false;
}

// ---------- loop ----------
function loop() {
  if (phase !== 'playing') return;
  const at = song.currentTime || 0;

  // spawn
  while (spawnIdx < beatmap.length && beatmap[spawnIdx].headTime - at <= APPROACH + 0.5) {
    const b = beatmap[spawnIdx];
    createTileEl(b);
    tiles.push(b);
    spawnIdx++;
  }

  let lost = false;
  for (const b of tiles) {
    if (!b.el) continue;
    const bottomY = hitY + (at - b.headTime) * pps;
    const topY = bottomY - (b.height || tileH);
    b.el.style.transform = `translateY(${topY}px)`;

    if (b.done) continue;

    if (b.hold && b.holding) {
      if (at >= b.headTime + b.dur) completeHold(b);
      else if (!pressed[b.lane]) breakHold(b);
      continue;
    }

    if (!b.hit && !b.holding && at > b.headTime + LATE) {
      b.missed = true;
      lost = true;
      missBeat = b;
      break;
    }
  }

  // recycle off-screen tiles
  tiles = tiles.filter((b) => {
    if (!b.el) return true;
    const bottomY = hitY + (at - b.headTime) * pps;
    const topY = bottomY - (b.height || tileH);
    if (topY > H + 60) {
      b.el.remove();
      b.el = null;
      return false;
    }
    return true;
  });

  progressFill.style.width = `${Math.min(100, (at / songDur) * 100)}%`;

  if (lost) {
    endGame('lost');
    return;
  }

  raf = requestAnimationFrame(loop);
}

// ---------- wire events ----------
btnMain.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  startGame();
});
btnReplay.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  startGame();
});
btnMenu.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  goMenu();
});

tapZones.forEach((zone) => {
  const lane = parseInt(zone.dataset.lane, 10);
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    laneDown(lane, e);
  });
  zone.addEventListener('pointerup', () => laneUp(lane));
  zone.addEventListener('pointercancel', () => laneUp(lane));
  zone.addEventListener('pointerleave', () => laneUp(lane));
});

// keyboard: A/S/D or 1/2/3
const KEY_LANES = {
  KeyA: 0, KeyS: 1, KeyD: 2,
  Digit1: 0, Digit2: 1, Digit3: 2,
  Numpad1: 0, Numpad2: 1, Numpad3: 2,
};
const keyHeld = new Set();

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'Enter') {
    if (phase === 'menu' || phase === 'over') {
      e.preventDefault();
      startGame();
    }
    return;
  }
  const lane = KEY_LANES[e.code];
  if (lane === undefined) return;
  e.preventDefault();
  if (keyHeld.has(e.code)) return;
  keyHeld.add(e.code);
  laneDown(lane);
});

window.addEventListener('keyup', (e) => {
  keyHeld.delete(e.code);
  const lane = KEY_LANES[e.code];
  if (lane !== undefined) laneUp(lane);
});

// remeasure on resize
window.addEventListener('resize', () => {
  if (phase === 'playing') measure();
});

setPhase('menu');
})();
