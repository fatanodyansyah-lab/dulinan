(() => {
  'use strict';

  // ---------- constants ----------
  const STORAGE_KEY = 'dulinan_puzzle_planet';
  const TOTAL_LEVELS = 8;
  const PREVIEW_MS = 2000;
  const PREVIEW_MAX = 2;
  const SLIDE_MS = 180;
  const MAX_SIZE = 4;

  // Star thresholds by grid size (moves)
  const STAR_THRESHOLDS = {
    3: [18, 32], // 3★ ≤18, 2★ ≤32, else 1★
    4: [55, 95]
  };

  // ---------- image themes (procedural) ----------
  const THEMES = [
    { id: 'blue', name: 'Planet Biru', emoji: '🌍', draw: drawBluePlanet },
    { id: 'rings', name: 'Planet Cincin', emoji: '🪐', draw: drawRingPlanet },
    { id: 'rocket', name: 'Roket Bintang', emoji: '🚀', draw: drawRocketStars },
    { id: 'alien', name: 'Alien Lucu', emoji: '👽', draw: drawCuteAlien },
    { id: 'galaxy', name: 'Galaxy', emoji: '🌌', draw: drawGalaxy },
    { id: 'moon', name: 'Bulan Keju', emoji: '🌙', draw: drawMoonCheese },
    { id: 'comet', name: 'Komet', emoji: '☄️', draw: drawComet },
    { id: 'nebula', name: 'Nebula Pink', emoji: '💫', draw: drawNebula }
  ];

  // ---------- state ----------
  const state = {
    mode: 'levels', // levels | chill
    level: 1,
    size: 3,
    themeIndex: 0,
    tiles: [], // values 0..n²-2, blank = n²-1
    blank: 0,
    moves: 0,
    previewLeft: PREVIEW_MAX,
    animating: false,
    solved: false,
    imageUrl: '',
    tileUrls: [],
    unlocked: 1,
    stars: {}, // level -> 0..3
    bestMoves: {}, // level -> min moves
    mute: false,
    chillTheme: 0
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const elMenu = $('screen-menu');
  const elPlay = $('screen-play');
  const elBoard = $('board');
  const elWin = $('win-overlay');
  const elConfetti = $('confetti-layer');
  const elLevelList = $('level-list');
  const elChill = $('chill-panel');
  const elCarousel = $('image-carousel');
  const elHudMoves = $('hud-moves');
  const elHudStars = $('hud-stars');
  const elHudBest = $('hud-best');
  const elHudMode = $('hud-mode-label');
  const elPreviewLeft = $('preview-left');
  const elPreviewFlash = $('preview-flash');
  const elTutorial = $('tutorial-hint');
  const elWinStars = $('win-stars');
  const elWinDetail = $('win-detail');
  const elBtnNext = $('btn-next');
  const elMute = $('muteBtn');
  const elMenuUnlocked = $('menu-unlocked');
  const elMenuStars = $('menu-stars');

  // ---------- storage ----------
  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.unlocked) state.unlocked = Math.max(1, Math.min(TOTAL_LEVELS, data.unlocked | 0));
      if (data.stars && typeof data.stars === 'object') state.stars = data.stars;
      if (data.bestMoves && typeof data.bestMoves === 'object') state.bestMoves = data.bestMoves;
      if (typeof data.mute === 'boolean') state.mute = data.mute;
    } catch (e) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unlocked: state.unlocked,
        stars: state.stars,
        bestMoves: state.bestMoves,
        mute: state.mute
      }));
    } catch (e) { /* ignore */ }
  }

  // ---------- audio (Web Audio, offline) ----------
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, type, vol, when) {
    if (state.mute) return;
    try {
      const c = getCtx();
      if (!c) return;
      const t0 = (when || 0) + c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol || 0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  function sfxPop() {
    tone(520, 0.08, 'triangle', 0.1);
    tone(780, 0.06, 'sine', 0.06, 0.04);
  }

  function sfxWhoosh() {
    if (state.mute) return;
    try {
      const c = getCtx();
      if (!c) return;
      const t0 = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, t0);
      o.frequency.exponentialRampToValueAtTime(60, t0 + 0.25);
      g.gain.setValueAtTime(0.06, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + 0.3);
    } catch (e) { /* ignore */ }
  }

  function sfxJingle() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.11, i * 0.12));
  }

  function updateMuteUI() {
    elMute.textContent = state.mute ? '🔇' : '🔊';
    elMute.setAttribute('aria-label', state.mute ? 'Nyalakan suara' : 'Matikan suara');
  }

  // ---------- procedural art ----------
  function makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return c;
  }

  function bgSpace(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#1a0a40');
    g.addColorStop(0.5, '#2a1060');
    g.addColorStop(1, '#0d0624');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + 13) % s;
      const y = (i * 53 + 29) % s;
      const r = (i % 3) * 0.4 + 0.6;
      ctx.beginPath();
      ctx.fillStyle = i % 5 === 0 ? 'rgba(255,211,77,.9)' : 'rgba(255,255,255,.85)';
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlanet(ctx, cx, cy, r, c1, c2, c3) {
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, c1);
    g.addColorStop(0.55, c2);
    g.addColorStop(1, c3);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    // highlight
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.35, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fill();
  }

  function drawBluePlanet(ctx, s) {
    bgSpace(ctx, s);
    drawPlanet(ctx, s * 0.5, s * 0.52, s * 0.32, '#7ad0ff', '#3aa0ff', '#1a5fb4');
    // continents
    ctx.fillStyle = 'rgba(90,200,120,.55)';
    ctx.beginPath();
    ctx.ellipse(s * 0.42, s * 0.45, s * 0.1, s * 0.07, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.58, s * 0.58, s * 0.12, s * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRingPlanet(ctx, s) {
    bgSpace(ctx, s);
    // rings behind
    ctx.save();
    ctx.translate(s * 0.5, s * 0.5);
    ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255,200,120,.55)';
    ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.42, s * 0.12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,160,80,.4)';
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.36, s * 0.1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawPlanet(ctx, s * 0.5, s * 0.5, s * 0.22, '#ffe0a0', '#e8a040', '#a06020');
    // rings front
    ctx.save();
    ctx.translate(s * 0.5, s * 0.5);
    ctx.rotate(-0.35);
    ctx.strokeStyle = 'rgba(255,210,140,.7)';
    ctx.lineWidth = s * 0.035;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.42, s * 0.12, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  function drawRocketStars(ctx, s) {
    bgSpace(ctx, s);
    // big stars
    [[0.2, 0.25], [0.75, 0.2], [0.8, 0.7], [0.25, 0.75]].forEach(([x, y], i) => {
      drawStar(ctx, s * x, s * y, s * (0.04 + i * 0.008), '#ffd34d');
    });
    // rocket body
    const cx = s * 0.5, cy = s * 0.52;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.25);
    // body
    const body = ctx.createLinearGradient(-s * 0.08, 0, s * 0.08, 0);
    body.addColorStop(0, '#ff8fb1');
    body.addColorStop(0.5, '#fff');
    body.addColorStop(1, '#ff5e8a');
    ctx.fillStyle = body;
    roundRect(ctx, -s * 0.08, -s * 0.2, s * 0.16, s * 0.38, s * 0.08);
    ctx.fill();
    // nose
    ctx.fillStyle = '#ff5e8a';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.28);
    ctx.lineTo(s * 0.08, -s * 0.12);
    ctx.lineTo(-s * 0.08, -s * 0.12);
    ctx.closePath();
    ctx.fill();
    // window
    ctx.beginPath();
    ctx.arc(0, -s * 0.05, s * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = '#7ad0ff';
    ctx.fill();
    ctx.strokeStyle = '#3aa0ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // fins
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, s * 0.08);
    ctx.lineTo(-s * 0.16, s * 0.18);
    ctx.lineTo(-s * 0.08, s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.08);
    ctx.lineTo(s * 0.16, s * 0.18);
    ctx.lineTo(s * 0.08, s * 0.16);
    ctx.closePath();
    ctx.fill();
    // flame
    const fl = ctx.createLinearGradient(0, s * 0.16, 0, s * 0.32);
    fl.addColorStop(0, '#fff7c0');
    fl.addColorStop(0.4, '#ffb400');
    fl.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, s * 0.16);
    ctx.quadraticCurveTo(0, s * 0.34, s * 0.04, s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCuteAlien(ctx, s) {
    bgSpace(ctx, s);
    const cx = s * 0.5, cy = s * 0.52;
    // head
    const g = ctx.createRadialGradient(cx - s * 0.05, cy - s * 0.08, s * 0.05, cx, cy, s * 0.28);
    g.addColorStop(0, '#c8ff9a');
    g.addColorStop(1, '#6ecf3a');
    ctx.beginPath();
    ctx.ellipse(cx, cy, s * 0.26, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    // eyes
    [[-0.09, -0.04], [0.09, -0.04]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.ellipse(cx + s * dx, cy + s * dy, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1033';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + s * dx + s * 0.015, cy + s * dy - s * 0.02, s * 0.025, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
    // smile
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.08, s * 0.08, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = '#3a7a20';
    ctx.lineWidth = s * 0.015;
    ctx.lineCap = 'round';
    ctx.stroke();
    // antennae
    ctx.strokeStyle = '#6ecf3a';
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, cy - s * 0.22);
    ctx.quadraticCurveTo(cx - s * 0.18, cy - s * 0.38, cx - s * 0.12, cy - s * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.1, cy - s * 0.22);
    ctx.quadraticCurveTo(cx + s * 0.18, cy - s * 0.38, cx + s * 0.12, cy - s * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#ff5fd2';
    ctx.beginPath();
    ctx.arc(cx - s * 0.12, cy - s * 0.4, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + s * 0.12, cy - s * 0.4, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGalaxy(ctx, s) {
    bgSpace(ctx, s);
    const cx = s * 0.5, cy = s * 0.5;
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * 0.45);
      const arm = ctx.createRadialGradient(0, 0, s * 0.02, 0, 0, s * 0.42);
      arm.addColorStop(0, 'rgba(200,160,255,.7)');
      arm.addColorStop(0.4, 'rgba(120,80,220,.35)');
      arm.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.fillStyle = arm;
      ctx.beginPath();
      ctx.ellipse(s * 0.12, 0, s * 0.28, s * 0.08, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // core
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.12);
    core.addColorStop(0, '#fff8d0');
    core.addColorStop(0.4, '#ffb0e0');
    core.addColorStop(1, 'rgba(100,40,180,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // critter silhouette
    ctx.fillStyle = 'rgba(255,200,120,.85)';
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.18, cy - s * 0.15, s * 0.06, s * 0.05, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + s * 0.15, cy - s * 0.2, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMoonCheese(ctx, s) {
    bgSpace(ctx, s);
    drawPlanet(ctx, s * 0.5, s * 0.52, s * 0.3, '#fff6c8', '#f0d878', '#c8a840');
    // craters
    [[0.4, 0.42, 0.05], [0.55, 0.55, 0.07], [0.48, 0.62, 0.04], [0.6, 0.4, 0.035]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,140,40,.4)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * x - s * r * 0.2, s * y - s * r * 0.2, s * r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,200,.25)';
      ctx.fill();
    });
  }

  function drawComet(ctx, s) {
    bgSpace(ctx, s);
    // tail
    const tail = ctx.createLinearGradient(s * 0.15, s * 0.35, s * 0.55, s * 0.55);
    tail.addColorStop(0, 'rgba(122,208,255,0)');
    tail.addColorStop(0.5, 'rgba(122,208,255,.45)');
    tail.addColorStop(1, 'rgba(255,255,255,.9)');
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.3);
    ctx.quadraticCurveTo(s * 0.35, s * 0.4, s * 0.55, s * 0.52);
    ctx.quadraticCurveTo(s * 0.35, s * 0.55, s * 0.12, s * 0.45);
    ctx.closePath();
    ctx.fill();
    // head
    const head = ctx.createRadialGradient(s * 0.58, s * 0.52, 0, s * 0.58, s * 0.52, s * 0.12);
    head.addColorStop(0, '#fff');
    head.addColorStop(0.4, '#7ad0ff');
    head.addColorStop(1, 'rgba(58,160,255,0)');
    ctx.fillStyle = head;
    ctx.beginPath();
    ctx.arc(s * 0.58, s * 0.52, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    drawStar(ctx, s * 0.75, s * 0.28, s * 0.05, '#ffd34d');
    drawStar(ctx, s * 0.28, s * 0.7, s * 0.04, '#ff8fb1');
  }

  function drawNebula(ctx, s) {
    bgSpace(ctx, s);
    const clouds = [
      [0.4, 0.45, 0.35, '#ff5fd2', 0.45],
      [0.6, 0.55, 0.3, '#a78bff', 0.4],
      [0.5, 0.4, 0.25, '#7ad0ff', 0.35],
      [0.35, 0.6, 0.22, '#ff8fb1', 0.35]
    ];
    clouds.forEach(([x, y, r, col, a]) => {
      const g = ctx.createRadialGradient(s * x, s * y, 0, s * x, s * y, s * r);
      g.addColorStop(0, col.replace(')', `,${a})`).replace('rgb', 'rgba').replace('#', ''));
      // simpler alpha
      ctx.save();
      ctx.globalAlpha = a;
      const gg = ctx.createRadialGradient(s * x, s * y, 0, s * x, s * y, s * r);
      gg.addColorStop(0, col);
      gg.addColorStop(1, 'transparent');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    drawStar(ctx, s * 0.3, s * 0.3, s * 0.035, '#fff');
    drawStar(ctx, s * 0.7, s * 0.35, s * 0.04, '#ffd34d');
    drawStar(ctx, s * 0.55, s * 0.7, s * 0.03, '#fff');
  }

  function drawStar(ctx, x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.4;
      // better star
    }
    // classic 5-point
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.4;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function buildThemeImage(themeIndex) {
    const size = 512;
    const canvas = makeCanvas(size);
    const ctx = canvas.getContext('2d');
    const theme = THEMES[themeIndex % THEMES.length];
    theme.draw(ctx, size);
    return canvas.toDataURL('image/png');
  }

  function sliceTiles(imageUrl, gridSize) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cell = Math.floor(img.width / gridSize);
        const urls = [];
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            const canvas = makeCanvas(cell);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, c * cell, r * cell, cell, cell, 0, 0, cell, cell);
            urls.push(canvas.toDataURL('image/png'));
          }
        }
        resolve(urls);
      };
      img.onerror = () => resolve([]);
      img.src = imageUrl;
    });
  }

  // ---------- puzzle math ----------
  function blankValue(size) {
    return size * size - 1;
  }

  function indexToRC(i, size) {
    return { r: Math.floor(i / size), c: i % size };
  }

  function rcToIndex(r, c, size) {
    return r * size + c;
  }

  function neighbors(index, size) {
    const { r, c } = indexToRC(index, size);
    const out = [];
    if (r > 0) out.push(rcToIndex(r - 1, c, size));
    if (r < size - 1) out.push(rcToIndex(r + 1, c, size));
    if (c > 0) out.push(rcToIndex(r, c - 1, size));
    if (c < size - 1) out.push(rcToIndex(r, c + 1, size));
    return out;
  }

  function inversionCount(arr, blankVal) {
    let inv = 0;
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      if (arr[i] === blankVal) continue;
      for (let j = i + 1; j < n; j++) {
        if (arr[j] === blankVal) continue;
        if (arr[i] > arr[j]) inv++;
      }
    }
    return inv;
  }

  /**
   * n-puzzle solvability:
   * - odd width: inversions even
   * - even width: (inversions + blankRowFromTop) odd  <=>  (inversions + blankRowFromBottom) even
   */
  function isSolvable(arr, size) {
    const blankVal = blankValue(size);
    const inv = inversionCount(arr, blankVal);
    const blankIdx = arr.indexOf(blankVal);
    const blankRow = Math.floor(blankIdx / size);
    if (size % 2 === 1) {
      return inv % 2 === 0;
    }
    // even width: solvable if (inv + blankRow) is odd
    return (inv + blankRow) % 2 === 1;
  }

  function isSolved(arr) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== i) return false;
    }
    return true;
  }

  /** Always-solvable shuffle: random legal moves from solved, then verify parity. */
  function shuffleSolvable(size) {
    const n = size * size;
    const blankVal = blankValue(size);
    const tiles = Array.from({ length: n }, (_, i) => i);
    let blank = blankVal;

    // Enough random legal slides so it looks scrambled
    const steps = size === 3 ? 60 + Math.floor(Math.random() * 40) : 120 + Math.floor(Math.random() * 80);
    let last = -1;
    for (let s = 0; s < steps; s++) {
      const opts = neighbors(blank, size).filter((i) => i !== last);
      const pick = opts[Math.floor(Math.random() * opts.length)];
      tiles[blank] = tiles[pick];
      tiles[pick] = blankVal;
      last = blank;
      blank = pick;
    }

    // Avoid already-solved
    if (isSolved(tiles)) {
      const opts = neighbors(blank, size);
      const pick = opts[0];
      tiles[blank] = tiles[pick];
      tiles[pick] = blankVal;
      blank = pick;
    }

    // Parity safety net (should always pass after legal moves)
    if (!isSolvable(tiles, size)) {
      // swap two non-blank tiles to flip parity if somehow broken
      const a = tiles.findIndex((v) => v !== blankVal);
      const b = tiles.findIndex((v, i) => i !== a && v !== blankVal);
      if (a >= 0 && b >= 0) {
        const t = tiles[a];
        tiles[a] = tiles[b];
        tiles[b] = t;
      }
    }

    return { tiles, blank };
  }

  function starsForMoves(size, moves) {
    const [s3, s2] = STAR_THRESHOLDS[size] || [40, 80];
    if (moves <= s3) return 3;
    if (moves <= s2) return 2;
    return 1;
  }

  function starString(n) {
    return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
  }

  function emptyStarString(n) {
    // show earned yellow-ish via emoji, rest hollow
    return starString(n);
  }

  // ---------- UI screens ----------
  function showScreen(name) {
    elMenu.hidden = name !== 'menu';
    elPlay.hidden = name !== 'play';
    if (name !== 'play') {
      elWin.hidden = true;
      elConfetti.innerHTML = '';
    }
  }

  function totalStarsEarned() {
    let t = 0;
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      t += state.stars[i] || 0;
    }
    return t;
  }

  function nextPlayLevel() {
    // Continue from highest unlocked, or replay last if all open
    return Math.min(state.unlocked, TOTAL_LEVELS);
  }

  function renderMenu() {
    elMenuUnlocked.textContent = String(state.unlocked);
    elMenuStars.textContent = `${totalStarsEarned()} / ${TOTAL_LEVELS * 3} ⭐`;

    const playLv = nextPlayLevel();
    const playSub = $('btn-play-now-sub');
    if (playSub) {
      playSub.textContent = `Level ${playLv} · ${playLv <= 4 ? '3×3' : '4×4'}`;
    }

    elLevelList.innerHTML = '';
    for (let lv = 1; lv <= TOTAL_LEVELS; lv++) {
      const locked = lv > state.unlocked;
      const size = lv <= 4 ? 3 : 4;
      const theme = THEMES[(lv - 1) % THEMES.length];
      const stars = state.stars[lv] || 0;
      const isCurrent = lv === playLv && !locked;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-card' + (locked ? ' is-locked' : '') + (isCurrent ? ' is-current' : '');
      btn.disabled = locked;
      btn.setAttribute('aria-label', locked ? `Level ${lv} terkunci` : `Main level ${lv}, ${theme.name}`);

      const thumbUrl = buildThemeImage((lv - 1) % THEMES.length);

      btn.innerHTML = `
        <div class="level-thumb" style="background-image:url('${thumbUrl}')"></div>
        <div class="level-num">Level ${lv} · ${size}×${size}</div>
        <div class="level-stars">${locked ? '🔒' : emptyStarString(stars)}</div>
        ${!locked ? `<div class="level-cta">${isCurrent ? 'MAIN' : 'Pilih'}</div>` : ''}
      `;
      if (!locked) {
        btn.addEventListener('click', () => startLevel(lv));
      }
      elLevelList.appendChild(btn);
    }

    // carousel for chill mode
    elCarousel.innerHTML = '';
    THEMES.forEach((theme, i) => {
      const url = buildThemeImage(i);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'planet-card' + (i === state.chillTheme ? ' is-selected' : '');
      card.style.backgroundImage = `url('${url}')`;
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', i === state.chillTheme ? 'true' : 'false');
      card.setAttribute('aria-label', theme.name);
      card.addEventListener('click', () => {
        state.chillTheme = i;
        elCarousel.querySelectorAll('.planet-card').forEach((el, j) => {
          el.classList.toggle('is-selected', j === i);
          el.setAttribute('aria-selected', j === i ? 'true' : 'false');
        });
      });
      elCarousel.appendChild(card);
    });
  }

  function setChillVisible(on) {
    elChill.hidden = !on;
    const sectionLevels = $('section-levels');
    const btnPlayNow = $('btn-play-now');
    const btnChill = $('btn-chill');
    if (sectionLevels) sectionLevels.hidden = !!on;
    if (btnPlayNow) btnPlayNow.hidden = !!on;
    if (btnChill) btnChill.hidden = !!on;
  }

  async function startLevel(level) {
    state.mode = 'levels';
    state.level = level;
    state.size = level <= 4 ? 3 : 4;
    state.themeIndex = (level - 1) % THEMES.length;
    await beginGame();
  }

  async function startChill() {
    state.mode = 'chill';
    state.level = 0;
    state.size = 3;
    state.themeIndex = state.chillTheme;
    await beginGame();
  }

  async function beginGame() {
    state.moves = 0;
    state.previewLeft = PREVIEW_MAX;
    state.animating = false;
    state.solved = false;
    elWin.hidden = true;
    elConfetti.innerHTML = '';
    elPreviewFlash.hidden = true;

    state.imageUrl = buildThemeImage(state.themeIndex);
    state.tileUrls = await sliceTiles(state.imageUrl, state.size);

    const shuffled = shuffleSolvable(state.size);
    state.tiles = shuffled.tiles;
    state.blank = shuffled.blank;

    updateHud();
    renderBoard(false);
    showScreen('play');

    // Tutorial hint for level 1
    if (state.mode === 'levels' && state.level === 1) {
      elTutorial.hidden = false;
      // one-time visual hint: pulse a movable tile
      setTimeout(() => {
        const movables = neighbors(state.blank, state.size);
        if (movables.length) {
          const el = elBoard.querySelector(`[data-index="${movables[0]}"]`);
          if (el) el.classList.add('is-hint');
        }
      }, 400);
    } else {
      elTutorial.hidden = true;
    }

    sfxWhoosh();
  }

  function updateHud() {
    elHudMoves.textContent = String(state.moves);
    if (state.mode === 'chill') {
      elHudMode.textContent = 'Santai';
      elHudStars.textContent = '✨';
      elHudBest.textContent = '—';
      elBtnNext.hidden = true;
    } else {
      elHudMode.textContent = `Level ${state.level}`;
      const earned = state.stars[state.level] || 0;
      elHudStars.textContent = emptyStarString(earned);
      const best = state.bestMoves[state.level];
      elHudBest.textContent = best != null ? String(best) : '—';
      elBtnNext.hidden = false;
    }
    elPreviewLeft.textContent = `(${state.previewLeft})`;
    $('btn-preview').disabled = state.previewLeft <= 0 || state.solved;
  }

  function boardMetrics() {
    const size = state.size;
    const gap = 4;
    const boardW = elBoard.clientWidth || Math.min(window.innerWidth - 32, 360);
    const cell = (boardW - gap * (size + 1)) / size;
    return { size, gap, boardW, cell };
  }

  function valuePositionMap() {
    const posOf = new Array(state.size * state.size);
    state.tiles.forEach((val, idx) => { posOf[val] = idx; });
    return posOf;
  }

  function renderBoard(withAnim) {
    const { size, gap, cell } = boardMetrics();
    const blankVal = blankValue(size);
    const posOf = valuePositionMap();

    if (!elBoard.dataset.built || elBoard.dataset.size !== String(size)) {
      elBoard.innerHTML = '';
      elBoard.dataset.built = '1';
      elBoard.dataset.size = String(size);
      for (let v = 0; v < size * size; v++) {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'tile';
        tile.dataset.value = String(v);
        // Pointer handlers for tap + drag/slide
        tile.addEventListener('pointerdown', onTilePointerDown);
        elBoard.appendChild(tile);
      }
    }

    const children = elBoard.children;
    for (let v = 0; v < size * size; v++) {
      const tile = children[v];
      if (tile.classList.contains('is-dragging')) continue;
      const idx = posOf[v];
      const { r, c } = indexToRC(idx, size);
      const left = gap + c * (cell + gap);
      const top = gap + r * (cell + gap);
      tile.style.width = cell + 'px';
      tile.style.height = cell + 'px';
      tile.style.left = left + 'px';
      tile.style.top = top + 'px';
      tile.style.transform = '';
      tile.dataset.index = String(idx);

      if (v === blankVal) {
        tile.classList.add('is-blank');
        tile.style.backgroundImage = 'none';
        tile.setAttribute('aria-label', 'Lubang bintang');
        tile.tabIndex = -1;
      } else {
        tile.classList.remove('is-blank');
        tile.style.backgroundImage = state.tileUrls[v] ? `url('${state.tileUrls[v]}')` : '';
        tile.setAttribute('aria-label', `Ubin ${v + 1}`);
        tile.tabIndex = 0;
      }

      if (withAnim) {
        tile.classList.add('is-moving');
        setTimeout(() => tile.classList.remove('is-moving'), SLIDE_MS);
      }
    }
  }

  // ---------- pointer drag / swipe ----------
  const drag = {
    active: false,
    value: -1,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    moved: false,
    pointerId: null,
    canSlide: false,
    dirX: 0, // unit toward blank: -1,0,1
    dirY: 0,
    maxDrag: 0,
    el: null
  };

  function resetDragVisual() {
    if (drag.el) {
      drag.el.classList.remove('is-dragging');
      drag.el.style.transform = '';
      try { drag.el.releasePointerCapture(drag.pointerId); } catch (e) { /* ignore */ }
    }
    drag.active = false;
    drag.value = -1;
    drag.el = null;
    drag.pointerId = null;
    drag.moved = false;
    drag.canSlide = false;
  }

  function onTilePointerDown(e) {
    if (state.animating || state.solved) return;
    if (e.button != null && e.button !== 0) return;

    const tile = e.currentTarget;
    const value = parseInt(tile.dataset.value, 10);
    const blankVal = blankValue(state.size);
    if (value === blankVal || tile.classList.contains('is-blank')) return;

    const posOf = valuePositionMap();
    const tileIdx = posOf[value];
    const blankIdx = state.blank;
    const adj = neighbors(blankIdx, state.size).includes(tileIdx);

    const { r: tr, c: tc } = indexToRC(tileIdx, state.size);
    const { r: br, c: bc } = indexToRC(blankIdx, state.size);

    drag.active = true;
    drag.value = value;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.dx = 0;
    drag.dy = 0;
    drag.moved = false;
    drag.pointerId = e.pointerId;
    drag.el = tile;
    drag.canSlide = adj;
    drag.dirX = adj ? (bc - tc) : 0;
    drag.dirY = adj ? (br - tr) : 0;
    drag.maxDrag = boardMetrics().cell + boardMetrics().gap;

    tile.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag.active || e.pointerId !== drag.pointerId) return;
    drag.dx = e.clientX - drag.startX;
    drag.dy = e.clientY - drag.startY;
    if (Math.abs(drag.dx) > 6 || Math.abs(drag.dy) > 6) drag.moved = true;

    if (!drag.canSlide || !drag.el) return;

    // Project movement onto axis toward blank only
    let along = drag.dx * drag.dirX + drag.dy * drag.dirY;
    along = Math.max(0, Math.min(drag.maxDrag, along));
    const tx = along * drag.dirX;
    const ty = along * drag.dirY;
    drag.el.classList.add('is-dragging');
    drag.el.style.transform = `translate(${tx}px, ${ty}px)`;
  }

  function onPointerUp(e) {
    if (!drag.active || (drag.pointerId != null && e.pointerId !== drag.pointerId)) return;

    const value = drag.value;
    const wasMoved = drag.moved;
    const canSlide = drag.canSlide;
    const dx = drag.dx;
    const dy = drag.dy;
    const along = dx * drag.dirX + dy * drag.dirY;
    const threshold = drag.maxDrag * 0.28;
    const el = drag.el;

    resetDragVisual();
    if (el) el.style.transform = '';

    if (value < 0) return;

    // Drag far enough toward blank → commit move
    if (canSlide && wasMoved && along >= threshold) {
      tryMoveValue(value);
      return;
    }

    // Pure tap (little movement) on tile adjacent to blank → move
    if (!wasMoved && canSlide) {
      tryMoveValue(value);
      return;
    }

    // Swipe: move the tile that sits on the opposite side of the blank
    // (finger right → tile left of blank slides into the hole)
    if (wasMoved) {
      trySwipeDirection(dx, dy);
    }
  }

  function trySwipeDirection(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 18 && absY < 18) return false;

    const blankIdx = state.blank;
    const { r: br, c: bc } = indexToRC(blankIdx, state.size);
    let tr = br;
    let tc = bc;
    if (absX > absY) {
      // horizontal: finger right → tile on left of blank
      tc = dx > 0 ? bc - 1 : bc + 1;
    } else {
      // vertical: finger down → tile above blank
      tr = dy > 0 ? br - 1 : br + 1;
    }
    if (tr < 0 || tr >= state.size || tc < 0 || tc >= state.size) return false;
    const tileIdx = rcToIndex(tr, tc, state.size);
    const value = state.tiles[tileIdx];
    return tryMoveValue(value);
  }

  function tryMoveValue(value) {
    if (state.animating || state.solved) return false;
    const blankVal = blankValue(state.size);
    if (value === blankVal || value == null) return false;

    const posOf = valuePositionMap();
    const tileIdx = posOf[value];
    if (tileIdx == null) return false;
    const blankIdx = state.blank;
    if (!neighbors(blankIdx, state.size).includes(tileIdx)) return false;

    state.tiles[blankIdx] = value;
    state.tiles[tileIdx] = blankVal;
    state.blank = tileIdx;
    state.moves++;
    sfxPop();
    updateHud();

    state.animating = true;
    renderBoard(true);
    setTimeout(() => {
      state.animating = false;
      if (isSolved(state.tiles)) onWin();
    }, SLIDE_MS + 10);

    if (!elTutorial.hidden) elTutorial.hidden = true;
    return true;
  }

  function onWin() {
    state.solved = true;
    sfxJingle();

    let stars = 0;
    if (state.mode === 'levels') {
      stars = starsForMoves(state.size, state.moves);
      const prev = state.stars[state.level] || 0;
      if (stars > prev) state.stars[state.level] = stars;

      const prevBest = state.bestMoves[state.level];
      if (prevBest == null || state.moves < prevBest) {
        state.bestMoves[state.level] = state.moves;
      }

      // Unlock next level (never decrease)
      state.unlocked = Math.max(
        state.unlocked,
        Math.min(TOTAL_LEVELS, state.level + 1)
      );
      save();
      updateHud();

      elWinStars.textContent = starString(stars);
      elWinDetail.textContent = `Level ${state.level} · ${state.moves} gerakan` +
        (state.bestMoves[state.level] === state.moves ? ' · Rekor baru! 🏆' : '');
      elBtnNext.textContent = state.level >= TOTAL_LEVELS ? 'Mode Santai ✨' : 'Level Berikutnya';
      elBtnNext.hidden = false;
    } else {
      elWinStars.textContent = '✨✨✨';
      elWinDetail.textContent = `Selesai dalam ${state.moves} gerakan · Mode Santai`;
      elBtnNext.hidden = true;
    }

    spawnConfetti();
    elWin.hidden = false;
  }

  function spawnConfetti() {
    const cols = ['#ffd34d', '#ff5fd2', '#7ad0ff', '#ff8fb1', '#a78bff', '#5dd6b0', '#fff'];
    let html = '';
    for (let i = 0; i < 48; i++) {
      const left = Math.random() * 100;
      const w = 6 + Math.random() * 8;
      const h = 8 + Math.random() * 10;
      const dur = 2.2 + Math.random() * 2.2;
      const delay = Math.random() * 0.8;
      const radius = Math.random() > 0.5 ? '50%' : '2px';
      html += `<div class="confetti-piece" style="left:${left}%;width:${w}px;height:${h}px;background:${cols[i % cols.length]};border-radius:${radius};animation-duration:${dur}s;animation-delay:${delay}s"></div>`;
    }
    elConfetti.innerHTML = html;
  }

  function doShuffle() {
    if (state.animating) return;
    state.moves = 0;
    state.solved = false;
    state.previewLeft = PREVIEW_MAX;
    elWin.hidden = true;
    elConfetti.innerHTML = '';
    const shuffled = shuffleSolvable(state.size);
    state.tiles = shuffled.tiles;
    state.blank = shuffled.blank;
    updateHud();
    renderBoard(false);
    sfxWhoosh();
  }

  function doPreview() {
    if (state.previewLeft <= 0 || state.solved || !elPreviewFlash.hidden) return;
    state.previewLeft--;
    updateHud();
    elPreviewFlash.style.backgroundImage = `url('${state.imageUrl}')`;
    elPreviewFlash.hidden = false;
    sfxPop();
    setTimeout(() => {
      elPreviewFlash.hidden = true;
    }, PREVIEW_MS);
  }

  // ---------- events ----------
  $('btn-play-now').addEventListener('click', () => {
    sfxPop();
    startLevel(nextPlayLevel());
  });
  $('btn-chill').addEventListener('click', () => {
    setChillVisible(true);
    sfxPop();
  });
  $('btn-back-levels').addEventListener('click', () => {
    setChillVisible(false);
    sfxPop();
  });
  $('btn-start-chill').addEventListener('click', () => startChill());
  $('btn-shuffle').addEventListener('click', doShuffle);
  $('btn-preview').addEventListener('click', doPreview);
  $('btn-menu').addEventListener('click', () => {
    setChillVisible(false);
    showScreen('menu');
    renderMenu();
  });
  $('btn-replay').addEventListener('click', () => {
    elWin.hidden = true;
    beginGame();
  });
  $('btn-next').addEventListener('click', () => {
    if (state.mode === 'levels' && state.level < TOTAL_LEVELS) {
      startLevel(state.level + 1);
    } else {
      setChillVisible(true);
      showScreen('menu');
      renderMenu();
    }
  });
  $('btn-win-menu').addEventListener('click', () => {
    elWin.hidden = true;
    setChillVisible(false);
    showScreen('menu');
    renderMenu();
  });
  elMute.addEventListener('click', () => {
    state.mute = !state.mute;
    updateMuteUI();
    save();
    if (!state.mute) sfxPop();
  });

  // Global pointer listeners for drag/slide
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  window.addEventListener('resize', () => {
    if (!elPlay.hidden) renderBoard(false);
  });

  // Expose for tests / debug
  window.__puzzlePlanet = {
    isSolvable,
    shuffleSolvable,
    inversionCount,
    isSolved,
    blankValue,
    STORAGE_KEY
  };

  // ---------- init ----------
  loadSave();
  updateMuteUI();
  setChillVisible(false);
  renderMenu();
  showScreen('menu');
})();
