(() => {
'use strict';

// ---------- tunable parameters ----------
const TEMPO = 92;          // bpm, 60-140
const FALL_SECONDS = 2.6;  // note fall time, 1.4-4 (difficulty)
const SHOW_KEYS = true;

const LANE_PCT = [16.66, 50, 83.33];
const COLORS = ['#FF6B6B', '#FFD93D', '#4DA8FF'];
const DARKS = ['#a72e2e', '#a8860f', '#1f5c9e'];
const FREQS = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.00, A: 440.00 };
const LANE_OF = { C: 0, D: 0, E: 1, F: 1, G: 2, A: 2 };
const WORDS = ['Hebat!', 'Keren!', 'Mantap!', 'Yeay!', 'Wow!'];

const SONGS = {
  twinkle: [['C',1],['C',1],['G',1],['G',1],['A',1],['A',1],['G',2],['F',1],['F',1],['E',1],['E',1],['D',1],['D',1],['C',2],['G',1],['G',1],['F',1],['F',1],['E',1],['E',1],['D',2],['G',1],['G',1],['F',1],['F',1],['E',1],['E',1],['D',2],['C',1],['C',1],['G',1],['G',1],['A',1],['A',1],['G',2],['F',1],['F',1],['E',1],['E',1],['D',1],['D',1],['C',2]],
  mary: [['E',1],['D',1],['C',1],['D',1],['E',1],['E',1],['E',2],['D',1],['D',1],['D',2],['E',1],['G',1],['G',2],['E',1],['D',1],['C',1],['D',1],['E',1],['E',1],['E',1],['E',1],['D',1],['D',1],['E',1],['D',1],['C',2]],
  farm: [['C',1],['C',1],['C',1],['G',1],['A',1],['A',1],['G',2],['E',1],['E',1],['D',1],['D',1],['C',2],['G',2],['C',1],['C',1],['C',1],['G',1],['A',1],['A',1],['G',2],['E',1],['E',1],['D',1],['D',1],['C',2]],
};

// ---------- DOM refs ----------
const $ = (id) => document.getElementById(id);
const bgVideo = $('bgVideo');
const scoreValue = $('scoreValue');
const comboCard = $('comboCard');
const comboValue = $('comboValue');
const notesLayer = $('notesLayer');
const burstsLayer = $('burstsLayer');
const feedbackEl = $('feedback');
const startScreen = $('startScreen');
const endScreen = $('endScreen');
const starsText = $('starsText');
const resultLine = $('resultLine');
const finalScore = $('finalScore');
const buttons = Array.from(document.querySelectorAll('.tapBtn'));

if (!SHOW_KEYS) buttons.forEach((b) => { b.querySelector('.keyLabel').textContent = ''; });

// ---------- state ----------
let phase = 'start'; // start | play | end
let score = 0, combo = 0, hits = 0, total = 0;
let ctx = null;
let pending = [];        // scheduled, not yet spawned: {id, lane, hitTime, freq}
let notes = [];           // active on-screen notes: {id, lane, hitTime, freq, el}
let lastHitTime = 0;
let rafId = null;
let feedbackSeq = 0;
let wordIdx = 0;

function now() { return ctx ? ctx.currentTime : 0; }

// ---------- audio synthesis ----------
function playTone(freq) {
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  g.connect(ctx.destination);
  const o = ctx.createOscillator();
  o.type = 'triangle'; o.frequency.value = freq;
  o.connect(g); o.start(t); o.stop(t + 0.6);

  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.08, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  g2.connect(ctx.destination);
  const o2 = ctx.createOscillator();
  o2.type = 'sine'; o2.frequency.value = freq * 2;
  o2.connect(g2); o2.start(t); o2.stop(t + 0.35);
}

function playClick() {
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  g.connect(ctx.destination);
  const o = ctx.createOscillator();
  o.type = 'sine'; o.frequency.value = 160;
  o.connect(g); o.start(t); o.stop(t + 0.13);
}

// ---------- gameplay ----------
function startGame(songId) {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  if (bgVideo.paused) bgVideo.play().catch(() => {});

  const beat = 60 / TEMPO;
  let t = ctx.currentTime + 1.6;
  let id = 0;
  pending = SONGS[songId].map(([n, b]) => {
    const p = { id: id++, lane: LANE_OF[n], hitTime: t, freq: FREQS[n] };
    t += b * beat;
    return p;
  });
  total = pending.length;
  hits = 0;
  lastHitTime = t;

  notesLayer.innerHTML = '';
  burstsLayer.innerHTML = '';
  notes = [];
  score = 0; combo = 0;
  scoreValue.textContent = '0';
  updateCombo();

  startScreen.style.display = 'none';
  endScreen.style.display = 'none';
  phase = 'play';

  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function loop() {
  if (phase !== 'play') return;
  const t = ctx.currentTime;
  let missed = false;

  while (pending.length && pending[0].hitTime - FALL_SECONDS <= t) {
    const p = pending.shift();
    spawnNote(p, t);
  }

  for (let i = notes.length - 1; i >= 0; i--) {
    if (t > notes[i].hitTime + 0.25) {
      notes[i].el.remove();
      notes.splice(i, 1);
      missed = true;
    }
  }
  if (missed) { combo = 0; updateCombo(); }

  if (!pending.length && !notes.length && t > lastHitTime + 1) {
    endGame();
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function spawnNote(p, t) {
  const el = document.createElement('div');
  el.className = 'note';
  const c = COLORS[p.lane], d = DARKS[p.lane];
  el.style.left = `calc(${LANE_PCT[p.lane]}% - 31px)`;
  el.style.background = `radial-gradient(circle at 50% 32%, #ffffff 0%, ${c} 42%, ${d} 100%)`;
  el.style.boxShadow = `0 0 18px ${c}, 0 4px 12px rgba(0,0,0,.45), inset 0 -6px 10px rgba(0,0,0,.3)`;
  el.style.animationDuration = FALL_SECONDS + 's';
  el.style.animationDelay = (p.hitTime - FALL_SECONDS - t) + 's';
  notesLayer.appendChild(el);
  notes.push({ ...p, el });
}

function hit(lane) {
  if (phase !== 'play') return;
  const t = ctx.currentTime;
  let best = null, bestDiff = Infinity;
  for (const n of notes) {
    if (n.lane !== lane) continue;
    const diff = Math.abs(t - n.hitTime);
    if (diff <= 0.22 && diff < bestDiff) { best = n; bestDiff = diff; }
  }

  flashLane(lane);

  if (best) {
    hits++;
    playTone(best.freq);
    combo++;
    score += 100 + Math.min(combo, 10) * 10;
    scoreValue.textContent = String(score);
    updateCombo();
    spawnBurst(lane);
    showFeedback(WORDS[wordIdx++ % WORDS.length]);
    best.el.remove();
    notes = notes.filter((n) => n !== best);
  } else {
    playClick();
  }
}

function updateCombo() {
  if (phase === 'play' && combo >= 2) {
    comboCard.style.display = '';
    comboValue.textContent = 'x' + combo;
  } else {
    comboCard.style.display = 'none';
  }
}

function flashLane(lane) {
  const btn = buttons[lane];
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 170);
}

function showFeedback(word) {
  feedbackEl.textContent = word;
  feedbackEl.classList.remove('pop');
  // Force reflow so re-adding the class restarts the animation.
  void feedbackEl.offsetWidth;
  feedbackEl.classList.add('pop');
}

const FLAME_ANGLES = [-55, -28, 0, 28, 55];
const FLAME_SIZES = [13, 16, 18, 15, 12];
const FLAME_DURS = [0.5, 0.58, 0.62, 0.55, 0.48];

function spawnBurst(lane) {
  const wrap = document.createElement('div');
  wrap.className = 'burst';
  wrap.style.left = LANE_PCT[lane] + '%';

  const flash = document.createElement('div');
  flash.className = 'flash';
  wrap.appendChild(flash);

  const ring = document.createElement('div');
  ring.className = 'ring';
  wrap.appendChild(ring);

  for (let i = 0; i < 5; i++) {
    const arm = document.createElement('div');
    arm.className = 'flameArm';
    arm.style.transform = `rotate(${FLAME_ANGLES[i]}deg)`;
    const flame = document.createElement('div');
    flame.className = 'flame';
    const s = FLAME_SIZES[i];
    flame.style.width = s + 'px';
    flame.style.height = s + 'px';
    flame.style.margin = -(s / 2) + 'px';
    flame.style.animation = `flameUp ${FLAME_DURS[i]}s ease-out forwards`;
    arm.appendChild(flame);
    wrap.appendChild(arm);
  }

  burstsLayer.appendChild(wrap);
  setTimeout(() => wrap.remove(), 700);
}

function endGame() {
  phase = 'end';
  const ratio = total ? hits / total : 0;
  const stars = ratio >= 0.85 ? 3 : ratio >= 0.55 ? 2 : 1;
  starsText.textContent = '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars);
  resultLine.textContent = stars === 3 ? 'Luar Biasa!' : stars === 2 ? 'Hebat Sekali!' : 'Terus Berlatih!';
  finalScore.textContent = 'Skor: ' + score;
  updateCombo();
  endScreen.style.display = '';
}

function backToMenu() {
  phase = 'start';
  cancelAnimationFrame(rafId);
  notesLayer.innerHTML = '';
  burstsLayer.innerHTML = '';
  notes = []; pending = [];
  endScreen.style.display = 'none';
  startScreen.style.display = '';
}

// ---------- input ----------
document.querySelectorAll('.songBtn').forEach((btn) => {
  btn.addEventListener('click', () => startGame(btn.dataset.song));
});
$('replayBtn').addEventListener('click', backToMenu);
$('homeBtn').addEventListener('click', () => { window.location.href = '../../site/index.html'; });

buttons.forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(Number(btn.dataset.lane)); });
});

const KEY_MAP = { a: 0, arrowleft: 0, s: 1, arrowdown: 1, d: 2, arrowright: 2 };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const lane = KEY_MAP[e.key.toLowerCase()];
  if (lane !== undefined) hit(lane);
});

bgVideo.muted = true;
bgVideo.loop = true;
bgVideo.playsInline = true;
bgVideo.play().catch(() => {});
})();
