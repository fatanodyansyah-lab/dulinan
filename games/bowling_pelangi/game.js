(() => {
  "use strict";

  const MAX_ROUNDS = 5;
  const PINS_PER_ROUND = 10;
  const STORAGE_BEST = "dulinan_bowling_pelangi_best";
  const STORAGE_SOUND = "dulinan_bowling_pelangi_sound";
  const TAU = Math.PI * 2;
  const RAINBOW = ["#ed35d6", "#258ed8", "#42c9f3", "#48e266", "#fff143", "#ff9d2f", "#f03c4d"];
  const CONFETTI_COLORS = ["#ffec4a", "#3de1d1", "#ff6978", "#68ed77", "#fff", "#b44ff2"];

  const $ = (id) => document.getElementById(id);
  const canvas = $("gameCanvas");
  const context = canvas.getContext("2d");
  const introOverlay = $("introOverlay");
  const resultOverlay = $("resultOverlay");
  const startButton = $("startButton");
  const replayButton = $("replayButton");
  const rollButton = $("rollButton");
  const soundButton = $("soundButton");
  const scoreValue = $("scoreValue");
  const roundValue = $("roundValue");
  const bestValue = $("bestValue");
  const roundDots = $("roundDots");
  const aimHint = $("aimHint");
  const laneControls = $("laneControls");
  const statusToast = $("statusToast");
  const confettiLayer = $("confettiLayer");
  const resultMedal = $("resultMedal");
  const resultTitle = $("resultTitle");
  const resultCopy = $("resultCopy");
  const finalScore = $("finalScore");
  const bestNote = $("bestNote");
  const newBest = $("newBest");
  const liveRegion = $("liveRegion");

  const view = {
    width: 390,
    height: 780,
    dpr: 1,
    centerX: 195,
    horizonY: 215,
    laneBottomY: 805,
    topHalf: 48,
    bottomHalf: 270,
    ballStartY: 630,
    pinStartY: 300,
    landscape: false,
  };

  const state = {
    phase: "intro",
    score: 0,
    round: 1,
    best: readBest(),
    bestBeforeGame: 0,
    muted: localStorage.getItem(STORAGE_SOUND) === "off",
    ballX: 0,
    ballProgress: 0,
    ballSpin: 0,
    rollSpeed: 0,
    dragging: false,
    pointerId: null,
    pins: [],
    particles: [],
    ambient: [],
    impactDone: false,
    knockedThisRound: 0,
    roundScores: [],
    waitUntil: 0,
    lastFrame: performance.now(),
    shake: 0,
    toastTimer: 0,
    announceTimer: 0,
  };

  let audioContext = null;
  let backgroundGradient = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeInCubic(value) {
    return value * value * value;
  }

  function easeOutCubic(value) {
    return 1 - ((1 - value) ** 3);
  }

  function readBest() {
    try {
      const stored = Number.parseInt(localStorage.getItem(STORAGE_BEST) || "0", 10);
      return Number.isFinite(stored) ? clamp(stored, 0, MAX_ROUNDS * PINS_PER_ROUND) : 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(STORAGE_BEST, String(state.best));
    } catch {
      // Game tetap dapat dimainkan ketika penyimpanan browser dibatasi.
    }
  }

  function blockAccidentalZoom() {
    const stopMultiTouch = (event) => {
      if (event.touches && event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("touchstart", stopMultiTouch, { passive: false });
    document.addEventListener("touchmove", stopMultiTouch, { passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
    });
    document.addEventListener("wheel", (event) => {
      if (event.ctrlKey) event.preventDefault();
    }, { passive: false });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    view.width = Math.max(300, rect.width);
    view.height = Math.max(480, rect.height);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.centerX = view.width / 2;
    view.landscape = view.width / view.height > 1.08;

    canvas.width = Math.round(view.width * view.dpr);
    canvas.height = Math.round(view.height * view.dpr);
    context.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    if (view.landscape) {
      view.horizonY = clamp(view.height * .26, 125, 185);
      view.laneBottomY = view.height + 40;
      view.topHalf = clamp(view.width * .075, 66, 100);
      view.bottomHalf = clamp(view.width * .42, 320, 510);
      view.ballStartY = view.height - 72;
      view.pinStartY = view.horizonY + clamp(view.height * .16, 74, 105);
    } else {
      view.horizonY = clamp(view.height * .265, 165, 230);
      view.laneBottomY = view.height + 25;
      view.topHalf = clamp(view.width * .12, 39, 65);
      view.bottomHalf = view.width * .69;
      view.ballStartY = view.height - clamp(view.height * .19, 132, 160);
      view.pinStartY = view.horizonY + clamp(view.height * .105, 61, 90);
    }

    backgroundGradient = context.createLinearGradient(0, 0, 0, view.height);
    backgroundGradient.addColorStop(0, "#e240ef");
    backgroundGradient.addColorStop(.48, "#bd2ddb");
    backgroundGradient.addColorStop(1, "#7922bb");
    createAmbient();
  }

  function laneHalfAt(y) {
    const amount = clamp((y - view.horizonY) / (view.laneBottomY - view.horizonY), 0, 1);
    return lerp(view.topHalf, view.bottomHalf, amount);
  }

  function laneX(worldX, y) {
    return view.centerX + worldX * laneHalfAt(y) * .88;
  }

  function screenToWorldX(screenX) {
    return clamp((screenX - view.centerX) / (laneHalfAt(view.ballStartY) * .88), -.78, .78);
  }

  function createAmbient() {
    const count = view.landscape ? 42 : 28;
    state.ambient = Array.from({ length: count }, (_, index) => ({
      x: ((index * 73) % 101) / 100 * view.width,
      y: ((index * 47 + 13) % 97) / 100 * view.height * .7,
      size: 2 + (index % 4),
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      angle: (index * .93) % TAU,
      speed: .25 + (index % 5) * .07,
    }));
  }

  function createPins() {
    const layout = [
      { x: -.33, row: 0 }, { x: -.11, row: 0 }, { x: .11, row: 0 }, { x: .33, row: 0 },
      { x: -.23, row: 1 }, { x: 0, row: 1 }, { x: .23, row: 1 },
      { x: -.12, row: 2 }, { x: .12, row: 2 },
      { x: 0, row: 3 },
    ];

    state.pins = layout.map((pin, index) => ({
      id: index,
      x: pin.x,
      row: pin.row,
      hit: false,
      fall: 0,
      rotation: 0,
      direction: pin.x <= state.ballX ? -1 : 1,
      driftX: 0,
      driftY: 0,
      delay: 0,
    }));
  }

  function renderRoundDots() {
    const fragment = document.createDocumentFragment();
    for (let index = 1; index <= MAX_ROUNDS; index += 1) {
      const dot = document.createElement("i");
      if (index < state.round) dot.className = "is-done";
      if (index === state.round && state.phase !== "finished") dot.className = "is-active";
      fragment.appendChild(dot);
    }
    roundDots.replaceChildren(fragment);
  }

  function updateHud() {
    scoreValue.textContent = String(state.score);
    bestValue.textContent = String(state.best);
    roundValue.textContent = String(clamp(state.round, 1, MAX_ROUNDS));
    renderRoundDots();
  }

  function setControlsVisible(visible) {
    laneControls.classList.toggle("is-hidden", !visible);
    aimHint.classList.toggle("is-hidden", !visible);
    rollButton.disabled = !visible;
  }

  function resetRound() {
    state.phase = "aiming";
    state.ballX = 0;
    state.ballProgress = 0;
    state.ballSpin = 0;
    state.rollSpeed = 0;
    state.impactDone = false;
    state.knockedThisRound = 0;
    state.waitUntil = 0;
    state.shake = 0;
    state.particles = [];
    createPins();
    setControlsVisible(true);
    updateHud();
    announce(`Ronde ${state.round}. Geser bola ke kiri atau kanan untuk membidik.`);
  }

  function startGame() {
    ensureAudio();
    introOverlay.hidden = true;
    resultOverlay.hidden = true;
    confettiLayer.replaceChildren();
    state.score = 0;
    state.round = 1;
    state.roundScores = [];
    state.bestBeforeGame = state.best;
    updateHud();
    resetRound();
    playStartSound();
    showToast("Ronde 1 — bidik pin di tengah! 🌈");
    rollButton.focus({ preventScroll: true });
  }

  function launchBall() {
    if (state.phase !== "aiming") return;
    ensureAudio();
    state.phase = "rolling";
    state.ballProgress = 0;
    state.rollSpeed = 0;
    state.impactDone = false;
    setControlsVisible(false);
    playRollSound();
    announce("Bola menggelinding menuju pin.");
  }

  function resolveImpact() {
    if (state.impactDone) return;
    state.impactDone = true;

    const accuracy = Math.abs(state.ballX);
    let targetCount;
    if (accuracy <= .055) {
      targetCount = 10;
    } else if (accuracy <= .14) {
      targetCount = 9;
    } else if (accuracy <= .25) {
      targetCount = 7 + Math.floor(Math.random() * 3);
    } else if (accuracy <= .42) {
      targetCount = 5 + Math.floor(Math.random() * 3);
    } else if (accuracy <= .6) {
      targetCount = 3 + Math.floor(Math.random() * 3);
    } else {
      targetCount = 1 + Math.floor(Math.random() * 3);
    }

    const rankedPins = [...state.pins].sort((first, second) => {
      const firstDistance = Math.abs(first.x - state.ballX) + (3 - first.row) * .012 + Math.random() * .045;
      const secondDistance = Math.abs(second.x - state.ballX) + (3 - second.row) * .012 + Math.random() * .045;
      return firstDistance - secondDistance;
    });

    rankedPins.slice(0, targetCount).forEach((pin, index) => {
      pin.hit = true;
      pin.direction = pin.x < state.ballX ? -1 : 1;
      if (Math.abs(pin.x - state.ballX) < .08) pin.direction = index % 2 ? -1 : 1;
      pin.rotation = pin.direction * (.85 + Math.random() * .65);
      pin.driftX = pin.direction * (8 + Math.random() * 18);
      pin.driftY = 2 + Math.random() * 9;
      pin.delay = index * .035;
    });

    state.knockedThisRound = targetCount;
    state.shake = targetCount === 10 ? 9 : 5;
    createImpactParticles(targetCount);
    playHitSound(targetCount);
    if (navigator.vibrate) navigator.vibrate(targetCount === 10 ? [55, 35, 100] : 60);
  }

  function finishThrow(now) {
    state.phase = "settling";
    state.score += state.knockedThisRound;
    state.roundScores.push(state.knockedThisRound);
    if (state.score > state.best) {
      state.best = state.score;
      saveBest();
    }
    updateHud();

    const pins = state.knockedThisRound;
    if (pins === 10) {
      showToast("STRIKE! Semua pin jatuh! 🌟", true, 1500);
      announce(`Strike. Semua sepuluh pin jatuh. Skor sementara ${state.score}.`);
    } else if (pins >= 8) {
      showToast(`${pins} pin! Hampir strike! ✨`, false, 1400);
      announce(`${pins} pin jatuh. Skor sementara ${state.score}.`);
    } else if (pins >= 5) {
      showToast(`${pins} pin jatuh! Bagus! 🎳`, false, 1400);
      announce(`${pins} pin jatuh. Skor sementara ${state.score}.`);
    } else {
      showToast(`${pins} pin jatuh — ayo bidik lagi! 💪`, false, 1400);
      announce(`${pins} pin jatuh. Skor sementara ${state.score}.`);
    }

    state.waitUntil = now + 1900;
  }

  function advanceRound() {
    if (state.round >= MAX_ROUNDS) {
      finishGame();
      return;
    }

    state.round += 1;
    resetRound();
    showToast(`Ronde ${state.round} — pin siap lagi! 🎳`);
  }

  function finishGame() {
    state.phase = "finished";
    setControlsVisible(false);
    updateHud();

    const isNewBest = state.score > state.bestBeforeGame;
    finalScore.textContent = String(state.score);
    bestNote.textContent = `Skor terbaik: ${state.best} dari ${MAX_ROUNDS * PINS_PER_ROUND}`;
    newBest.hidden = !isNewBest;

    if (state.score >= 45) {
      resultMedal.textContent = "🏆";
      resultTitle.textContent = "Raja Bowling!";
      resultCopy.textContent = "Arah bolamu luar biasa akurat. Pelanginya bersinar terang!";
    } else if (state.score >= 32) {
      resultMedal.textContent = "🌟";
      resultTitle.textContent = "Hebat sekali!";
      resultCopy.textContent = "Banyak pin berhasil kamu jatuhkan. Sedikit lagi jadi jagoan!";
    } else {
      resultMedal.textContent = "🎳";
      resultTitle.textContent = "Lemparan bagus!";
      resultCopy.textContent = "Terus cocokkan arah bola dengan pin dan coba pecahkan rekormu.";
    }

    spawnResultConfetti();
    resultOverlay.hidden = false;
    playFinishSound();
    announce(`Lima ronde selesai. Skor akhir ${state.score} dari 50.`);
    replayButton.focus({ preventScroll: true });
  }

  function showToast(message, strike = false, duration = 1200) {
    window.clearTimeout(state.toastTimer);
    statusToast.textContent = message;
    statusToast.classList.toggle("is-strike", strike);
    statusToast.classList.remove("is-visible");
    void statusToast.offsetWidth;
    statusToast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      statusToast.classList.remove("is-visible");
    }, duration);
  }

  function announce(message) {
    window.clearTimeout(state.announceTimer);
    liveRegion.textContent = "";
    state.announceTimer = window.setTimeout(() => {
      liveRegion.textContent = message;
    }, 20);
  }

  function spawnResultConfetti() {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 40; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${2 + Math.random() * 96}%`;
      piece.style.background = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
      piece.style.setProperty("--duration", `${2.6 + Math.random() * 1.7}s`);
      piece.style.setProperty("--delay", `${Math.random() * 1.1}s`);
      piece.style.setProperty("--drift", `${-45 + Math.random() * 90}px`);
      fragment.appendChild(piece);
    }
    confettiLayer.replaceChildren(fragment);
  }

  function createImpactParticles(count) {
    const y = view.pinStartY + 15;
    const x = laneX(state.ballX, y);
    for (let index = 0; index < 9 + count * 2; index += 1) {
      const angle = -Math.PI + Math.random() * Math.PI;
      const speed = 45 + Math.random() * 120;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        life: .65 + Math.random() * .5,
        maxLife: 1.15,
        size: 3 + Math.random() * 5,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        rotation: Math.random() * TAU,
      });
    }
  }

  function update(delta, now) {
    state.ambient.forEach((piece) => {
      piece.angle += delta * piece.speed;
    });

    state.particles.forEach((particle) => {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 170 * delta;
      particle.rotation += delta * 5;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);

    state.pins.forEach((pin) => {
      if (pin.hit && state.impactDone) {
        pin.fall = clamp(pin.fall + delta * 2.25, 0, 1);
      }
    });

    if (state.shake > .05) state.shake *= Math.pow(.025, delta);

    if (state.phase === "rolling") {
      state.rollSpeed = Math.min(1.7, state.rollSpeed + delta * 2.2);
      state.ballProgress = Math.min(1, state.ballProgress + delta * (.62 + state.rollSpeed * .28));
      state.ballSpin += delta * (9 + state.rollSpeed * 7);

      if (state.ballProgress >= .79 && !state.impactDone) resolveImpact();
      if (state.ballProgress >= 1) finishThrow(now);
    } else if (state.phase === "settling" && now >= state.waitUntil) {
      advanceRound();
    }
  }

  function drawBackground(now) {
    context.fillStyle = backgroundGradient || "#d832ed";
    context.fillRect(0, 0, view.width, view.height);

    const rayCount = view.landscape ? 18 : 14;
    const rayCenterY = view.horizonY - 4;
    const rayRadius = Math.hypot(view.width, view.height) * 1.2;
    context.save();
    context.translate(view.centerX, rayCenterY);
    for (let index = 0; index < rayCount; index += 1) {
      const start = (index / rayCount) * TAU;
      const end = start + (TAU / rayCount) * .47;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, rayRadius, start, end);
      context.closePath();
      context.fillStyle = index % 2 ? "rgba(255,255,255,.075)" : "rgba(255,126,241,.13)";
      context.fill();
    }
    context.restore();

    context.fillStyle = "rgba(255,255,255,.16)";
    const dotGap = view.landscape ? 30 : 25;
    for (let y = 13; y < view.horizonY + 90; y += dotGap) {
      for (let x = (Math.floor(y / dotGap) % 2) * dotGap / 2; x < view.width; x += dotGap) {
        context.beginPath();
        context.arc(x, y, 1.4, 0, TAU);
        context.fill();
      }
    }

    state.ambient.forEach((piece) => {
      const floatY = Math.sin(piece.angle + now * .0007) * 4;
      context.save();
      context.translate(piece.x, piece.y + floatY);
      context.rotate(piece.angle);
      context.globalAlpha = .72;
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size, piece.size, piece.size * 2);
      context.restore();
    });

    const glow = context.createRadialGradient(view.centerX, view.horizonY, 0, view.centerX, view.horizonY, view.width * .46);
    glow.addColorStop(0, "rgba(255,245,148,.45)");
    glow.addColorStop(.35, "rgba(255,155,235,.15)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, view.width, Math.max(view.height * .58, 330));
  }

  function drawLane() {
    const topY = view.horizonY;
    const bottomY = view.laneBottomY;
    const topLeft = view.centerX - view.topHalf;
    const topRight = view.centerX + view.topHalf;
    const bottomLeft = view.centerX - view.bottomHalf;
    const bottomRight = view.centerX + view.bottomHalf;

    context.save();
    context.beginPath();
    context.moveTo(topLeft, topY);
    context.lineTo(topRight, topY);
    context.lineTo(bottomRight, bottomY);
    context.lineTo(bottomLeft, bottomY);
    context.closePath();
    context.clip();

    const stripeWidthTop = (view.topHalf * 2) / RAINBOW.length;
    const stripeWidthBottom = (view.bottomHalf * 2) / RAINBOW.length;
    RAINBOW.forEach((color, index) => {
      const xTopA = topLeft + stripeWidthTop * index;
      const xTopB = xTopA + stripeWidthTop + 1;
      const xBottomA = bottomLeft + stripeWidthBottom * index;
      const xBottomB = xBottomA + stripeWidthBottom + 2;
      const gradient = context.createLinearGradient(0, topY, 0, bottomY);
      gradient.addColorStop(0, lightenLaneColor(color));
      gradient.addColorStop(.5, color);
      gradient.addColorStop(1, darkenLaneColor(color));
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(xTopA, topY);
      context.lineTo(xTopB, topY);
      context.lineTo(xBottomB, bottomY);
      context.lineTo(xBottomA, bottomY);
      context.closePath();
      context.fill();
    });

    const shine = context.createLinearGradient(topLeft, 0, topRight, 0);
    shine.addColorStop(0, "rgba(255,255,255,.06)");
    shine.addColorStop(.45, "rgba(255,255,255,.27)");
    shine.addColorStop(.58, "rgba(255,255,255,.08)");
    shine.addColorStop(1, "rgba(255,255,255,.03)");
    context.fillStyle = shine;
    context.fillRect(bottomLeft, topY, bottomRight - bottomLeft, bottomY - topY);

    context.restore();

    drawBumper(-1);
    drawBumper(1);

    context.strokeStyle = "rgba(255,255,255,.92)";
    context.lineWidth = view.landscape ? 8 : 6;
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(topLeft, topY);
    context.lineTo(bottomLeft, bottomY);
    context.moveTo(topRight, topY);
    context.lineTo(bottomRight, bottomY);
    context.stroke();
  }

  function lightenLaneColor(color) {
    const map = {
      "#ed35d6": "#ff6aea",
      "#258ed8": "#4cc5f1",
      "#42c9f3": "#72e9ff",
      "#48e266": "#78f587",
      "#fff143": "#fff99a",
      "#ff9d2f": "#ffc15a",
      "#f03c4d": "#ff6c6c",
    };
    return map[color] || color;
  }

  function darkenLaneColor(color) {
    const map = {
      "#ed35d6": "#c31bb9",
      "#258ed8": "#176ebc",
      "#42c9f3": "#209fda",
      "#48e266": "#24b94f",
      "#fff143": "#f0cb28",
      "#ff9d2f": "#e87418",
      "#f03c4d": "#cc263c",
    };
    return map[color] || color;
  }

  function drawBumper(side) {
    const segments = view.landscape ? 25 : 20;
    const yStart = view.horizonY + 5;
    const yEnd = view.laneBottomY;

    for (let index = 0; index < segments; index += 1) {
      const amountA = index / segments;
      const amountB = (index + 1.08) / segments;
      const yA = lerp(yStart, yEnd, amountA);
      const yB = lerp(yStart, yEnd, amountB);
      const halfA = laneHalfAt(yA);
      const halfB = laneHalfAt(yB);
      const radiusA = lerp(3, view.landscape ? 18 : 14, amountA);
      const radiusB = lerp(3, view.landscape ? 18 : 14, amountB);
      const xA = view.centerX + side * (halfA + radiusA * .42);
      const xB = view.centerX + side * (halfB + radiusB * .42);

      context.strokeStyle = RAINBOW[(index + (side > 0 ? 2 : 0)) % RAINBOW.length];
      context.lineWidth = radiusA + radiusB;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(xA, yA);
      context.lineTo(xB, yB);
      context.stroke();

      context.strokeStyle = "rgba(255,255,255,.24)";
      context.lineWidth = Math.max(1, (radiusA + radiusB) * .15);
      context.beginPath();
      context.moveTo(xA - side * radiusA * .24, yA - radiusA * .28);
      context.lineTo(xB - side * radiusB * .24, yB - radiusB * .28);
      context.stroke();
    }
  }

  function pinY(pin) {
    return view.pinStartY - pin.row * (view.landscape ? 13 : 10);
  }

  function drawPins() {
    const pins = [...state.pins].sort((first, second) => pinY(first) - pinY(second));
    pins.forEach((pin) => drawPin(pin));
  }

  function drawPin(pin) {
    const baseY = pinY(pin);
    const baseX = laneX(pin.x, baseY);
    const scale = view.landscape ? 1.13 : clamp(view.width / 420, .78, 1.05);
    const fallEase = easeOutCubic(clamp((pin.fall - pin.delay) / (1 - pin.delay), 0, 1));
    const width = 20 * scale;
    const height = 43 * scale;
    const x = baseX + pin.driftX * fallEase;
    const y = baseY + pin.driftY * fallEase;

    context.save();
    context.translate(x, y);
    context.rotate(pin.rotation * fallEase);
    context.scale(1, 1 - fallEase * .12);

    context.fillStyle = "rgba(79,22,112,.2)";
    context.beginPath();
    context.ellipse(2, 4, width * (.46 + fallEase * .3), 5 * scale, 0, 0, TAU);
    context.fill();

    context.translate(0, -height * .54);
    context.beginPath();
    context.moveTo(-width * .18, -height * .45);
    context.bezierCurveTo(-width * .26, -height * .39, -width * .22, -height * .27, -width * .33, -height * .16);
    context.bezierCurveTo(-width * .51, .02 * height, -width * .48, .28 * height, -width * .31, .44 * height);
    context.bezierCurveTo(-width * .14, .52 * height, width * .14, .52 * height, width * .31, .44 * height);
    context.bezierCurveTo(width * .48, .28 * height, width * .51, .02 * height, width * .33, -height * .16);
    context.bezierCurveTo(width * .22, -height * .27, width * .26, -height * .39, width * .18, -height * .45);
    context.bezierCurveTo(width * .09, -height * .53, -width * .09, -height * .53, -width * .18, -height * .45);
    context.closePath();
    context.fillStyle = "#fffdf7";
    context.fill();
    context.strokeStyle = "#9d398d";
    context.lineWidth = 1.7 * scale;
    context.stroke();

    context.strokeStyle = "#ef3e63";
    context.lineWidth = 3.1 * scale;
    context.beginPath();
    context.moveTo(-width * .24, -height * .25);
    context.quadraticCurveTo(0, -height * .2, width * .24, -height * .25);
    context.stroke();

    context.strokeStyle = "#ff7b8e";
    context.lineWidth = 1.9 * scale;
    context.beginPath();
    context.moveTo(-width * .25, -height * .18);
    context.quadraticCurveTo(0, -height * .13, width * .25, -height * .18);
    context.stroke();

    context.fillStyle = "rgba(255,255,255,.72)";
    context.beginPath();
    context.ellipse(-width * .17, height * .08, width * .08, height * .18, .18, 0, TAU);
    context.fill();
    context.restore();
  }

  function currentBallY() {
    if (state.phase !== "rolling") return view.ballStartY;
    const travel = easeInCubic(state.ballProgress * .85) * .68 + state.ballProgress * .32;
    return lerp(view.ballStartY, view.pinStartY + 5, travel);
  }

  function currentBallRadius() {
    if (state.phase !== "rolling") return view.landscape ? 29 : clamp(view.width * .075, 24, 34);
    const start = view.landscape ? 29 : clamp(view.width * .075, 24, 34);
    return lerp(start, view.landscape ? 11 : 9, easeInCubic(state.ballProgress));
  }

  function drawAimGuide() {
    if (state.phase !== "aiming") return;
    const startY = view.ballStartY - currentBallRadius() - 7;
    const endY = view.pinStartY + 23;
    const startX = laneX(state.ballX, startY);
    const endX = laneX(state.ballX, endY);

    context.save();
    context.setLineDash([8, 9]);
    context.lineCap = "round";
    context.strokeStyle = "rgba(255,255,255,.74)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "rgba(255,255,255,.92)";
    context.beginPath();
    context.moveTo(endX, endY - 6);
    context.lineTo(endX - 7, endY + 7);
    context.lineTo(endX + 7, endY + 7);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawBall() {
    const y = currentBallY();
    const x = laneX(state.ballX, y);
    const radius = currentBallRadius();
    const rotation = state.phase === "rolling" ? state.ballSpin : state.ballX * 1.8;

    if (state.phase === "rolling") drawBallTrail(x, y, radius);

    context.save();
    context.translate(x, y);
    context.rotate(rotation);

    context.fillStyle = "rgba(63,16,96,.3)";
    context.beginPath();
    context.ellipse(3, radius * .84, radius * 1.05, radius * .34, -rotation, 0, TAU);
    context.fill();

    const gradient = context.createRadialGradient(-radius * .34, -radius * .38, radius * .08, 0, 0, radius);
    gradient.addColorStop(0, "#bdf9ff");
    gradient.addColorStop(.16, "#9c63f4");
    gradient.addColorStop(.58, "#6b2ac4");
    gradient.addColorStop(1, "#35116f");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius, 0, TAU);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,.8)";
    context.lineWidth = Math.max(1.4, radius * .09);
    context.stroke();

    context.strokeStyle = "rgba(255,85,208,.52)";
    context.lineWidth = radius * .16;
    context.beginPath();
    context.arc(0, 0, radius * .68, -.9, 2.3);
    context.stroke();

    context.fillStyle = "#2a0c58";
    [[.25, -.38, .12], [.49, -.17, .105], [.13, -.12, .095]].forEach(([holeX, holeY, size]) => {
      context.beginPath();
      context.arc(radius * holeX, radius * holeY, radius * size, 0, TAU);
      context.fill();
    });

    context.fillStyle = "rgba(255,255,255,.54)";
    context.beginPath();
    context.ellipse(-radius * .34, -radius * .42, radius * .2, radius * .11, -.7, 0, TAU);
    context.fill();
    context.restore();
  }

  function drawBallTrail(x, y, radius) {
    for (let index = 4; index >= 1; index -= 1) {
      const amount = index / 4;
      const trailY = y + index * radius * 1.05;
      const trailX = laneX(state.ballX, trailY);
      context.globalAlpha = .08 + (1 - amount) * .09;
      context.fillStyle = RAINBOW[(index + Math.floor(state.ballSpin)) % RAINBOW.length];
      context.beginPath();
      context.arc(trailX, trailY, radius * (1 - index * .11), 0, TAU);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size, particle.size, particle.size * 2);
      context.restore();
    });
  }

  function draw(now) {
    context.save();
    if (state.shake > .05) {
      context.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
    }
    drawBackground(now);
    drawLane();
    drawAimGuide();
    drawPins();
    drawBall();
    drawParticles();
    context.restore();
  }

  function frame(now) {
    const delta = Math.min(.035, Math.max(0, (now - state.lastFrame) / 1000));
    state.lastFrame = now;
    update(delta, now);
    draw(now);
    window.requestAnimationFrame(frame);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event) {
    if (state.phase !== "aiming") return;
    const position = pointerPosition(event);
    const ballScreenX = laneX(state.ballX, view.ballStartY);
    const radius = currentBallRadius();
    const nearBall = Math.hypot(position.x - ballScreenX, position.y - view.ballStartY) <= radius * 2.2;
    const inAimZone = position.y > view.height * .5;
    if (!nearBall && !inAimZone) return;

    event.preventDefault();
    state.dragging = true;
    state.pointerId = event.pointerId;
    canvas.classList.add("is-dragging");
    canvas.setPointerCapture?.(event.pointerId);
    state.ballX = screenToWorldX(position.x);
  }

  function handlePointerMove(event) {
    if (!state.dragging || state.phase !== "aiming" || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    state.ballX = screenToWorldX(pointerPosition(event).x);
  }

  function handlePointerUp(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    state.dragging = false;
    state.pointerId = null;
    canvas.classList.remove("is-dragging");
    canvas.releasePointerCapture?.(event.pointerId);
  }

  function handleKeyDown(event) {
    if (state.phase !== "aiming") return;
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      state.ballX = clamp(state.ballX - .055, -.78, .78);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      state.ballX = clamp(state.ballX + .055, -.78, .78);
    } else if ((event.key === " " || event.key === "Enter") && event.target === canvas) {
      event.preventDefault();
      launchBall();
    }
  }

  function ensureAudio() {
    if (state.muted) return null;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function tone(frequency, duration, type = "sine", volume = .07, delay = 0, endFrequency = null) {
    const audio = ensureAudio();
    if (!audio) return;
    try {
      const start = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(Math.max(.001, volume), start);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .03);
    } catch {
      // Efek suara tidak wajib untuk menjalankan game.
    }
  }

  function playStartSound() {
    tone(392, .1, "triangle", .07);
    tone(523, .12, "triangle", .07, .09);
    tone(659, .16, "sine", .06, .18);
  }

  function playRollSound() {
    tone(150, .7, "sine", .035, 0, 65);
    tone(260, .48, "triangle", .02, .18, 110);
  }

  function playHitSound(count) {
    tone(105, .14, "triangle", .1, 0, 58);
    tone(156, .12, "square", .035, .045, 80);
    if (count === 10) {
      tone(523, .13, "triangle", .07, .18);
      tone(659, .13, "triangle", .07, .28);
      tone(784, .2, "sine", .065, .38);
    }
  }

  function playFinishSound() {
    tone(523, .11, "triangle", .07);
    tone(659, .11, "triangle", .07, .1);
    tone(784, .14, "triangle", .075, .2);
    tone(1046, .3, "sine", .065, .32);
  }

  function toggleSound() {
    state.muted = !state.muted;
    try {
      localStorage.setItem(STORAGE_SOUND, state.muted ? "off" : "on");
    } catch {
      // Preferensi suara hanya peningkatan kenyamanan.
    }
    updateSoundButton();
    if (!state.muted) {
      ensureAudio();
      tone(620, .09, "triangle", .055);
    }
  }

  function updateSoundButton() {
    soundButton.querySelector("span").textContent = state.muted ? "🔇" : "🔊";
    soundButton.setAttribute("aria-label", state.muted ? "Nyalakan suara" : "Matikan suara");
    soundButton.setAttribute("aria-pressed", String(state.muted));
  }

  startButton.addEventListener("click", startGame);
  replayButton.addEventListener("click", startGame);
  rollButton.addEventListener("click", launchBall);
  soundButton.addEventListener("click", toggleSound);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", resizeCanvas);

  canvas.tabIndex = 0;
  updateSoundButton();
  updateHud();
  createPins();
  resizeCanvas();
  blockAccidentalZoom();
  window.requestAnimationFrame((now) => {
    state.lastFrame = now;
    frame(now);
  });
})();
