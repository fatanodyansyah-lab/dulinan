(() => {
  "use strict";

  // Mencegah pinch zoom/double-tap zoom yang mengganggu drag pada iOS.
  const preventMultiTouch = (event) => {
    if (event.touches && event.touches.length > 1) event.preventDefault();
  };
  document.addEventListener("touchstart", preventMultiTouch, { passive: false });
  document.addEventListener("touchmove", preventMultiTouch, { passive: false });
  ["gesturestart", "gesturechange", "gestureend"].forEach((name) => {
    document.addEventListener(name, (event) => event.preventDefault(), { passive: false });
  });
  document.addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false });

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const introScreen = document.getElementById("introScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const dropButton = document.getElementById("dropButton");
  const soundButton = document.getElementById("soundButton");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const introBest = document.getElementById("introBest");
  const nextCard = document.getElementById("nextCard");
  const nextEmoji = document.getElementById("nextEmoji");
  const nextName = document.getElementById("nextName");
  const aimHint = document.getElementById("aimHint");
  const statusToast = document.getElementById("statusToast");
  const finalScore = document.getElementById("finalScore");
  const finalBest = document.getElementById("finalBest");
  const resultBadge = document.getElementById("resultBadge");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const newBestBanner = document.getElementById("newBestBanner");
  const confettiLayer = document.getElementById("confettiLayer");

  const TAU = Math.PI * 2;
  const STORAGE_BEST = "dulinan_tumpuk_hewan_best";
  const STORAGE_SOUND = "dulinan_tumpuk_hewan_sound";
  const FIXED_STEP = 1 / 120;
  const MAX_FRAME = 1 / 18;
  const BASE_GRAVITY = 820;
  const PLATFORM_HEIGHT = 24;
  const PLATFORM_SIDE_MARGIN = 18;
  const AIM_SAFE_INSET = 4;
  const COLORS = {
    outline: "#244956",
    cream: "#fff7dc",
    cheek: "#f38c88",
    white: "#fffdf5",
    black: "#263e48",
    grass: "#72c941",
    grassDark: "#379748",
    dirt: "#a96536",
    dirtDark: "#744327"
  };

  const ANIMALS = [
    { id: "cat", name: "Kucing", emoji: "🐱", width: 76, height: 49, color: "#f6a33e" },
    { id: "panda", name: "Panda", emoji: "🐼", width: 66, height: 64, color: "#fffaf0" },
    { id: "fox", name: "Rubah", emoji: "🦊", width: 88, height: 49, color: "#f47a35" },
    { id: "bunny", name: "Kelinci", emoji: "🐰", width: 57, height: 76, color: "#f7f3ea" },
    { id: "bear", name: "Beruang", emoji: "🐻", width: 82, height: 57, color: "#a96c42" },
    { id: "pig", name: "Babi", emoji: "🐷", width: 76, height: 52, color: "#f2a1a8" },
    { id: "cow", name: "Sapi", emoji: "🐮", width: 92, height: 55, color: "#f5eee0" },
    { id: "penguin", name: "Pinguin", emoji: "🐧", width: 58, height: 72, color: "#334c58" },
    { id: "elephant", name: "Gajah", emoji: "🐘", width: 96, height: 60, color: "#7fa6b5" }
  ];

  const view = {
    width: 390,
    height: 780,
    dpr: 1,
    centerX: 195,
    platformY: 620,
    platformWidth: 300,
    aimY: 172,
    zoom: 1,
    targetZoom: 1
  };

  const state = {
    phase: "intro", // intro | aiming | dropping | celebrating | gameover
    score: 0,
    best: loadNumber(STORAGE_BEST, 0),
    bestAtStart: 0,
    muted: localStorage.getItem(STORAGE_SOUND) === "off",
    bodies: [],
    particles: [],
    currentAnimal: null,
    nextAnimal: null,
    bag: [],
    aimX: view.centerX,
    dragging: false,
    pointerId: null,
    droppedBody: null,
    settleTime: 0,
    dropElapsed: 0,
    accumulator: 0,
    lastFrame: performance.now(),
    bodyCounter: 0,
    timer: null,
    toastTimer: null,
    firstDrop: true,
    lastImpactAt: 0,
    active: true
  };

  let audioContext = null;
  let platform = makeStaticPlatform();

  function loadNumber(key, fallback) {
    try {
      const value = Number.parseInt(localStorage.getItem(key), 10);
      return Number.isFinite(value) && value >= 0 ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(STORAGE_BEST, String(state.best));
    } catch (error) {
      // Game tetap dapat dimainkan ketika penyimpanan browser dibatasi.
    }
  }

  function makeStaticPlatform() {
    return {
      id: "platform",
      x: view.centerX,
      y: PLATFORM_HEIGHT / 2 - 3,
      width: view.platformWidth,
      height: PLATFORM_HEIGHT,
      angle: 0,
      vx: 0,
      vy: 0,
      angularVelocity: 0,
      invMass: 0,
      invInertia: 0,
      // Platform sengaja benar-benar statis dan tidak memantulkan hewan.
      restitution: 0,
      friction: 0.94,
      isStatic: true
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const previousCenter = view.centerX;
    view.width = Math.max(280, rect.width);
    view.height = Math.max(520, rect.height);
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(view.width * view.dpr);
    canvas.height = Math.round(view.height * view.dpr);
    view.centerX = view.width / 2;
    view.platformY = view.height - clamp(view.height * 0.185, 132, 158);
    view.platformWidth = clamp(
      view.width - PLATFORM_SIDE_MARGIN * 2,
      250,
      430
    );
    view.aimY = clamp(view.height * 0.225, 148, 190);

    const shiftX = view.centerX - previousCenter;
    if (Number.isFinite(shiftX) && shiftX !== 0) {
      state.bodies.forEach((body) => {
        body.x += shiftX;
      });
      state.aimX += shiftX;
    }

    platform = makeStaticPlatform();
    if (state.currentAnimal) constrainAim();
  }

  function getAudioContext() {
    if (state.muted) return null;
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioContext = new AudioCtor();
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function tone(frequency, duration, type = "sine", volume = 0.08, delay = 0, endFrequency = null) {
    const audio = getAudioContext();
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
      oscillator.stop(start + duration + .02);
    } catch (error) {
      // Efek suara bukan kebutuhan untuk menjalankan fisika game.
    }
  }

  function sfxStart() {
    tone(392, .1, "triangle", .07);
    tone(523, .12, "triangle", .08, .08);
    tone(659, .16, "triangle", .07, .17);
  }

  function sfxDrop() {
    tone(380, .24, "sine", .055, 0, 120);
  }

  function sfxImpact(strength) {
    const amount = clamp(strength / 500, 0, 1);
    tone(105 + amount * 45, .075, "triangle", .025 + amount * .035, 0, 70);
  }

  function sfxPoint() {
    tone(587, .09, "triangle", .065);
    tone(740, .1, "triangle", .06, .08);
    tone(880, .13, "sine", .055, .16);
  }

  function sfxLose() {
    tone(330, .18, "triangle", .07);
    tone(246, .2, "triangle", .07, .14);
    tone(165, .3, "sawtooth", .045, .29, 95);
  }

  function updateSoundButton() {
    soundButton.textContent = state.muted ? "🔇" : "🔊";
    soundButton.setAttribute("aria-label", state.muted ? "Nyalakan suara" : "Matikan suara");
  }

  function shuffledAnimals() {
    const bag = [...ANIMALS];
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[target]] = [bag[target], bag[index]];
    }
    return bag;
  }

  function takeAnimal() {
    if (!state.bag.length) state.bag = shuffledAnimals();
    return state.bag.pop();
  }

  function createBody(animal, x, y) {
    const mass = clamp((animal.width * animal.height) / 3300, .85, 1.8);
    // Inersia tambahan membuat hewan lebih sulit terpelanting/berputar.
    const inertia = mass * (animal.width ** 2 + animal.height ** 2) / 12 * 1.35;
    return {
      id: `animal-${state.bodyCounter += 1}`,
      animal,
      x,
      y,
      width: animal.width,
      height: animal.height,
      angle: 0,
      vx: 0,
      vy: 20,
      angularVelocity: 0,
      mass,
      invMass: 1 / mass,
      inertia,
      invInertia: 1 / inertia,
      restitution: 0,
      friction: .82,
      isStatic: false,
      touching: false,
      hasLanded: false,
      settled: false
    };
  }

  function resetGame() {
    clearTimeout(state.timer);
    clearTimeout(state.toastTimer);
    statusToast.classList.remove("is-visible", "is-milestone");
    state.phase = "aiming";
    state.score = 0;
    state.bestAtStart = state.best;
    state.bodies = [];
    state.particles = [];
    state.currentAnimal = takeAnimal();
    state.nextAnimal = takeAnimal();
    state.aimX = view.centerX;
    state.dragging = false;
    state.pointerId = null;
    state.droppedBody = null;
    state.settleTime = 0;
    state.dropElapsed = 0;
    state.accumulator = 0;
    state.firstDrop = true;
    view.zoom = 1;
    view.targetZoom = 1;

    scoreValue.textContent = "0";
    bestValue.textContent = String(state.best);
    introScreen.hidden = true;
    gameOverScreen.hidden = true;
    dropButton.hidden = false;
    dropButton.disabled = false;
    aimHint.hidden = false;
    aimHint.innerHTML = '<span class="hint-arrows" aria-hidden="true">↔</span><span>Geser ke kiri atau kanan</span>';
    updateNextCard();
    constrainAim();
    showToast("Hewan pertama siap! 🐾");
    sfxStart();
  }

  function updateNextCard() {
    const animal = state.nextAnimal || state.currentAnimal;
    if (!animal) return;
    nextEmoji.textContent = animal.emoji;
    nextName.textContent = animal.name;
    nextCard.setAttribute("aria-label", `Hewan selanjutnya: ${animal.name}`);
  }

  function currentAimY() {
    return (view.aimY - view.platformY) / view.zoom;
  }

  function constrainAim() {
    if (!state.currentAnimal) return;
    const half = state.currentAnimal.width / 2;
    const left = platform.x - platform.width / 2 + half + AIM_SAFE_INSET;
    const right = platform.x + platform.width / 2 - half - AIM_SAFE_INSET;
    state.aimX = clamp(state.aimX, left, right);
  }

  function screenToWorldX(screenX) {
    return view.centerX + (screenX - view.centerX) / view.zoom;
  }

  function setAimFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    state.aimX = screenToWorldX(event.clientX - rect.left);
    constrainAim();
  }

  function dropCurrentAnimal() {
    if (state.phase !== "aiming" || !state.currentAnimal) return;
    getAudioContext();
    const body = createBody(state.currentAnimal, state.aimX, currentAimY());
    state.bodies.push(body);
    state.droppedBody = body;
    state.phase = "dropping";
    state.settleTime = 0;
    state.dropElapsed = 0;
    state.dragging = false;
    dropButton.disabled = true;
    aimHint.hidden = true;
    sfxDrop();
    if (navigator.vibrate) navigator.vibrate(18);
  }

  function finishLanding() {
    if (state.phase !== "dropping" || !state.droppedBody) return;
    state.phase = "celebrating";
    state.droppedBody.settled = true;
    state.score += 1;
    scoreValue.textContent = String(state.score);

    if (state.score > state.best) {
      state.best = state.score;
      bestValue.textContent = String(state.best);
      saveBest();
    }

    spawnCelebration(state.droppedBody.x, state.droppedBody.y);
    sfxPoint();
    if (navigator.vibrate) navigator.vibrate([18, 30, 18]);

    const milestones = {
      3: "Tumpukannya mulai tinggi! 🌟",
      5: "Hebat! Lima hewan! 🙌",
      8: "Wah, ahli keseimbangan! 🏆",
      12: "Menara hewan luar biasa! 🚀"
    };
    showToast(milestones[state.score] || `${state.droppedBody.animal.name} mendarat! +1`, Boolean(milestones[state.score]));

    state.timer = window.setTimeout(() => {
      if (state.phase !== "celebrating") return;
      state.currentAnimal = state.nextAnimal;
      state.nextAnimal = takeAnimal();
      state.droppedBody = null;
      state.phase = "aiming";
      state.aimX = clamp(view.centerX + (Math.random() - .5) * 28, 0, view.width);
      constrainAim();
      updateNextCard();
      dropButton.disabled = false;
      aimHint.hidden = false;
      aimHint.innerHTML = '<span class="hint-arrows" aria-hidden="true">↔</span><span>Geser ke kiri atau kanan</span>';
      state.firstDrop = false;
    }, 520);
  }

  function triggerGameOver() {
    if (state.phase === "gameover" || state.phase === "intro") return;
    state.phase = "gameover";
    state.dragging = false;
    dropButton.disabled = true;
    dropButton.hidden = true;
    aimHint.hidden = true;
    clearTimeout(state.timer);
    sfxLose();
    if (navigator.vibrate) navigator.vibrate([70, 45, 130]);

    state.timer = window.setTimeout(showGameOver, 650);
  }

  function showGameOver() {
    const isNewBest = state.score > state.bestAtStart && state.score > 0;
    finalScore.textContent = String(state.score);
    finalBest.textContent = String(state.best);
    newBestBanner.hidden = !isNewBest;

    if (state.score === 0) {
      resultBadge.textContent = "🙈";
      resultTitle.textContent = "Hampir mendarat!";
      resultCopy.textContent = "Cari bagian tengah rumput, lalu jatuhkan lagi pelan-pelan.";
    } else if (state.score < 4) {
      resultBadge.textContent = "😵‍💫";
      resultTitle.textContent = "Ada yang jatuh!";
      resultCopy.textContent = "Awal yang bagus! Coba susun bagian bawah lebih rapat.";
    } else if (state.score < 8) {
      resultBadge.textContent = "👏";
      resultTitle.textContent = "Tumpukan hebat!";
      resultCopy.textContent = "Sudah tinggi sekali. Sedikit lebih seimbang dan pasti bisa lanjut!";
    } else {
      resultBadge.textContent = "🏆";
      resultTitle.textContent = "Jago menumpuk!";
      resultCopy.textContent = "Menara hewanmu luar biasa. Bisakah kamu memecahkan rekornya?";
    }

    gameOverScreen.hidden = false;
    if (isNewBest) makeConfetti();
  }

  function showToast(message, milestone = false) {
    clearTimeout(state.toastTimer);
    statusToast.textContent = message;
    statusToast.classList.toggle("is-milestone", milestone);
    statusToast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      statusToast.classList.remove("is-visible");
    }, milestone ? 1700 : 1150);
  }

  function makeConfetti() {
    confettiLayer.textContent = "";
    const colors = ["#ff8f3d", "#ffd85a", "#4ec69c", "#6dcde9", "#ef7b9b", "#8f7be8"];
    for (let index = 0; index < 36; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--duration", `${2.1 + Math.random() * 1.6}s`);
      piece.style.setProperty("--delay", `${Math.random() * .65}s`);
      piece.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
      piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
      confettiLayer.appendChild(piece);
    }
  }

  function bodyVertices(body) {
    const halfWidth = body.width / 2;
    const halfHeight = body.height / 2;
    const cosine = Math.cos(body.angle);
    const sine = Math.sin(body.angle);
    const corners = [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight]
    ];
    return corners.map(([x, y]) => ({
      x: body.x + x * cosine - y * sine,
      y: body.y + x * sine + y * cosine
    }));
  }

  function bodyAxes(body) {
    const cosine = Math.cos(body.angle);
    const sine = Math.sin(body.angle);
    return [
      { x: cosine, y: sine },
      { x: -sine, y: cosine }
    ];
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function cross(a, b) {
    return a.x * b.y - a.y * b.x;
  }

  function project(vertices, axis) {
    let min = dot(vertices[0], axis);
    let max = min;
    for (let index = 1; index < vertices.length; index += 1) {
      const value = dot(vertices[index], axis);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    return { min, max };
  }

  function supportAverage(vertices, direction) {
    let furthest = -Infinity;
    vertices.forEach((vertex) => {
      furthest = Math.max(furthest, dot(vertex, direction));
    });
    const points = vertices.filter((vertex) => furthest - dot(vertex, direction) < .6);
    return points.reduce((point, vertex) => ({
      x: point.x + vertex.x / points.length,
      y: point.y + vertex.y / points.length
    }), { x: 0, y: 0 });
  }

  function detectCollision(bodyA, bodyB) {
    const verticesA = bodyVertices(bodyA);
    const verticesB = bodyVertices(bodyB);
    const axes = [...bodyAxes(bodyA), ...bodyAxes(bodyB)];
    let penetration = Infinity;
    let normal = null;

    for (const axis of axes) {
      const projectionA = project(verticesA, axis);
      const projectionB = project(verticesB, axis);
      const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);
      if (overlap <= 0) return null;
      if (overlap < penetration) {
        penetration = overlap;
        normal = { x: axis.x, y: axis.y };
      }
    }

    const centerDelta = { x: bodyB.x - bodyA.x, y: bodyB.y - bodyA.y };
    if (dot(centerDelta, normal) < 0) {
      normal.x *= -1;
      normal.y *= -1;
    }

    const pointA = supportAverage(verticesA, normal);
    const pointB = supportAverage(verticesB, { x: -normal.x, y: -normal.y });
    return {
      normal,
      penetration,
      contact: {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2
      }
    };
  }

  function velocityAt(body, point) {
    const radius = { x: point.x - body.x, y: point.y - body.y };
    return {
      x: body.vx - body.angularVelocity * radius.y,
      y: body.vy + body.angularVelocity * radius.x
    };
  }

  function applyImpulse(body, impulse, radius, direction) {
    if (body.isStatic) return;
    body.vx += impulse.x * body.invMass * direction;
    body.vy += impulse.y * body.invMass * direction;
    body.angularVelocity += cross(radius, impulse) * body.invInertia * direction;
  }

  function resolveCollision(bodyA, bodyB, collision, emitEffects) {
    const totalInvMass = bodyA.invMass + bodyB.invMass;
    if (totalInvMass === 0) return;

    const slop = .035;
    const percent = .72;
    const correctionMagnitude = Math.max(collision.penetration - slop, 0) / totalInvMass * percent;
    const correction = {
      x: collision.normal.x * correctionMagnitude,
      y: collision.normal.y * correctionMagnitude
    };

    if (!bodyA.isStatic) {
      bodyA.x -= correction.x * bodyA.invMass;
      bodyA.y -= correction.y * bodyA.invMass;
    }
    if (!bodyB.isStatic) {
      bodyB.x += correction.x * bodyB.invMass;
      bodyB.y += correction.y * bodyB.invMass;
    }

    const radiusA = { x: collision.contact.x - bodyA.x, y: collision.contact.y - bodyA.y };
    const radiusB = { x: collision.contact.x - bodyB.x, y: collision.contact.y - bodyB.y };
    const velocityA = velocityAt(bodyA, collision.contact);
    const velocityB = velocityAt(bodyB, collision.contact);
    const relativeVelocity = { x: velocityB.x - velocityA.x, y: velocityB.y - velocityA.y };
    const normalSpeed = dot(relativeVelocity, collision.normal);

    if (emitEffects && normalSpeed < -70) {
      emitImpact(collision.contact, -normalSpeed);
    }
    if (normalSpeed > 0) return;

    const radiusCrossNormalA = cross(radiusA, collision.normal);
    const radiusCrossNormalB = cross(radiusB, collision.normal);
    const normalDenominator = totalInvMass
      + radiusCrossNormalA ** 2 * bodyA.invInertia
      + radiusCrossNormalB ** 2 * bodyB.invInertia;
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const normalImpulseSize = -(1 + restitution) * normalSpeed / Math.max(normalDenominator, .0001);
    const normalImpulse = {
      x: collision.normal.x * normalImpulseSize,
      y: collision.normal.y * normalImpulseSize
    };

    applyImpulse(bodyA, normalImpulse, radiusA, -1);
    applyImpulse(bodyB, normalImpulse, radiusB, 1);

    const newVelocityA = velocityAt(bodyA, collision.contact);
    const newVelocityB = velocityAt(bodyB, collision.contact);
    const newRelative = {
      x: newVelocityB.x - newVelocityA.x,
      y: newVelocityB.y - newVelocityA.y
    };
    const normalComponent = dot(newRelative, collision.normal);
    let tangent = {
      x: newRelative.x - collision.normal.x * normalComponent,
      y: newRelative.y - collision.normal.y * normalComponent
    };
    const tangentLength = Math.hypot(tangent.x, tangent.y);
    if (tangentLength < .0001) return;
    tangent = { x: tangent.x / tangentLength, y: tangent.y / tangentLength };

    const radiusCrossTangentA = cross(radiusA, tangent);
    const radiusCrossTangentB = cross(radiusB, tangent);
    const tangentDenominator = totalInvMass
      + radiusCrossTangentA ** 2 * bodyA.invInertia
      + radiusCrossTangentB ** 2 * bodyB.invInertia;
    let frictionImpulseSize = -dot(newRelative, tangent) / Math.max(tangentDenominator, .0001);
    const friction = Math.sqrt(bodyA.friction * bodyB.friction);
    const maxFriction = normalImpulseSize * friction;
    frictionImpulseSize = clamp(frictionImpulseSize, -maxFriction, maxFriction);
    const frictionImpulse = {
      x: tangent.x * frictionImpulseSize,
      y: tangent.y * frictionImpulseSize
    };
    applyImpulse(bodyA, frictionImpulse, radiusA, -1);
    applyImpulse(bodyB, frictionImpulse, radiusB, 1);
  }

  function simulate(step) {
    const gravity = BASE_GRAVITY;
    for (const body of state.bodies) {
      body.touching = false;
      body.vy += gravity * step;
      body.vx *= Math.pow(.9985, step * 60);
      body.angularVelocity *= Math.pow(.997, step * 60);
      body.x += body.vx * step;
      body.y += body.vy * step;
      body.angle += body.angularVelocity * step;
    }

    for (let iteration = 0; iteration < 7; iteration += 1) {
      for (const body of state.bodies) {
        const collision = detectCollision(platform, body);
        if (collision) {
          body.touching = true;
          body.hasLanded = true;
          resolveCollision(platform, body, collision, iteration === 0);
        }
      }

      for (let first = 0; first < state.bodies.length; first += 1) {
        for (let second = first + 1; second < state.bodies.length; second += 1) {
          const bodyA = state.bodies[first];
          const bodyB = state.bodies[second];
          const collision = detectCollision(bodyA, bodyB);
          if (!collision) continue;
          bodyA.touching = true;
          bodyB.touching = true;
          bodyA.hasLanded = true;
          bodyB.hasLanded = true;
          resolveCollision(bodyA, bodyB, collision, iteration === 0);
        }
      }
    }

    for (const body of state.bodies) {
      if (body.touching) {
        body.vx *= Math.pow(.975, step * 120);
        body.angularVelocity *= Math.pow(.96, step * 120);
        if (Math.abs(body.vy) < 3.2) body.vy = 0;
        if (Math.abs(body.vx) < .4) body.vx = 0;
        if (Math.abs(body.angularVelocity) < .005) body.angularVelocity = 0;
      }
    }

    updateParticles(step);
  }

  function emitImpact(point, speed) {
    const now = performance.now();
    if (now - state.lastImpactAt < 70) return;
    state.lastImpactAt = now;
    sfxImpact(speed);
    const amount = clamp(Math.round(speed / 65), 3, 8);
    for (let index = 0; index < amount; index += 1) {
      state.particles.push({
        x: point.x + (Math.random() - .5) * 8,
        y: point.y,
        vx: (Math.random() - .5) * (55 + speed * .13),
        vy: -30 - Math.random() * 70,
        life: .35 + Math.random() * .25,
        maxLife: .6,
        size: 2.5 + Math.random() * 3.5,
        color: index % 2 ? "#fff4cc" : "#74c74e",
        shape: "dot"
      });
    }
  }

  function spawnCelebration(x, y) {
    const palette = ["#ffd85a", "#ff8f3d", "#ffffff", "#67cda3"];
    for (let index = 0; index < 18; index += 1) {
      const angle = Math.random() * TAU;
      const speed = 50 + Math.random() * 125;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        life: .65 + Math.random() * .45,
        maxLife: 1.1,
        size: 3 + Math.random() * 4,
        color: palette[index % palette.length],
        shape: index % 3 === 0 ? "star" : "dot"
      });
    }
  }

  function updateParticles(step) {
    state.particles.forEach((particle) => {
      particle.x += particle.vx * step;
      particle.y += particle.vy * step;
      particle.vy += 240 * step;
      particle.vx *= .99;
      particle.life -= step;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function towerTop() {
    if (!state.bodies.length) return -40;
    return Math.min(...state.bodies.map((body) => {
      const halfY = Math.abs(Math.sin(body.angle)) * body.width / 2
        + Math.abs(Math.cos(body.angle)) * body.height / 2;
      return body.y - halfY;
    }));
  }

  function updateCamera(delta) {
    const height = Math.max(80, -towerTop());
    const available = Math.max(260, view.platformY - view.aimY - 88);
    view.targetZoom = clamp(available / (height + 82), .64, 1);
    const blend = 1 - Math.exp(-delta * 3.2);
    view.zoom += (view.targetZoom - view.zoom) * blend;
    constrainAim();
  }

  function hasFallenAnimal() {
    for (const body of state.bodies) {
      const halfX = Math.abs(Math.cos(body.angle)) * body.width / 2
        + Math.abs(Math.sin(body.angle)) * body.height / 2;
      const outsideLeft = body.x + halfX < platform.x - platform.width / 2 - 8;
      const outsideRight = body.x - halfX > platform.x + platform.width / 2 + 8;
      if (body.y > 78 || ((outsideLeft || outsideRight) && body.y > -body.height * .15)) {
        return true;
      }
    }
    return false;
  }

  function checkGameLoss() {
    if (state.phase === "intro" || state.phase === "gameover") return;
    if (hasFallenAnimal()) triggerGameOver();
  }

  function checkDroppingState(delta) {
    if (state.phase !== "dropping" || !state.droppedBody) return;
    state.dropElapsed += delta;

    const maxLinearSpeed = Math.max(...state.bodies.map((body) => Math.hypot(body.vx, body.vy)), 0);
    const maxAngularSpeed = Math.max(...state.bodies.map((body) => Math.abs(body.angularVelocity)), 0);
    const stable = state.droppedBody.hasLanded && maxLinearSpeed < 30 && maxAngularSpeed < .4;
    if (stable) {
      state.settleTime += delta;
    } else {
      state.settleTime = Math.max(0, state.settleTime - delta * .6);
    }

    if (state.settleTime > .28
      || (state.dropElapsed > 2.8 && state.droppedBody.hasLanded && maxLinearSpeed < 44 && maxAngularSpeed < .8)) {
      finishLanding();
    }
  }

  function drawBackground(time) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, view.height);
    sky.addColorStop(0, "#68cbe8");
    sky.addColorStop(.58, "#a9e7ed");
    sky.addColorStop(1, "#e3f5d9");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, view.width, view.height);

    const sunGradient = ctx.createRadialGradient(view.width - 58, 146, 4, view.width - 58, 146, 88);
    sunGradient.addColorStop(0, "rgba(255,244,175,.72)");
    sunGradient.addColorStop(.38, "rgba(255,235,146,.28)");
    sunGradient.addColorStop(1, "rgba(255,235,146,0)");
    ctx.fillStyle = sunGradient;
    ctx.fillRect(view.width - 155, 46, 200, 200);

    drawCloud(25 + Math.sin(time * .00008) * 12, 205, .82, .48);
    drawCloud(view.width - 115 + Math.sin(time * .00006 + 2) * 16, 282, .64, .32);
    drawCloud(68 + Math.sin(time * .00005 + 4) * 20, view.platformY - 185, .46, .2);

    ctx.fillStyle = "rgba(67, 148, 150, .11)";
    ctx.beginPath();
    ctx.moveTo(0, view.height);
    ctx.lineTo(0, view.platformY + 54);
    for (let x = 0; x <= view.width + 35; x += 35) {
      const y = view.platformY + 43 + Math.sin(x * .032) * 13;
      ctx.quadraticCurveTo(x + 17, y - 19, x + 35, y);
    }
    ctx.lineTo(view.width, view.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let index = 0; index < 13; index += 1) {
      const x = (index * 73 + 29) % view.width;
      const y = 165 + ((index * 97) % Math.max(180, view.platformY - 260));
      const pulse = .65 + Math.sin(time * .0015 + index) * .3;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(x, y, index % 3 === 0 ? 2 : 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCloud(x, y, scale, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(24, 16, 18, 0, TAU);
    ctx.arc(47, 7, 25, 0, TAU);
    ctx.arc(75, 17, 19, 0, TAU);
    ctx.arc(95, 22, 14, 0, TAU);
    roundedRect(ctx, 14, 15, 88, 29, 15);
    ctx.fill();
    ctx.restore();
  }

  function setWorldTransform() {
    ctx.setTransform(
      view.dpr * view.zoom,
      0,
      0,
      view.dpr * view.zoom,
      view.dpr * (view.centerX - view.centerX * view.zoom),
      view.dpr * view.platformY
    );
  }

  function drawGuide(time) {
    if (state.phase !== "aiming" || !state.currentAnimal) return;
    const aimY = currentAimY();
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.78)";
    ctx.lineWidth = 2 / view.zoom;
    ctx.setLineDash([7 / view.zoom, 8 / view.zoom]);
    ctx.beginPath();
    ctx.moveTo(state.aimX, aimY + state.currentAnimal.height / 2 + 7);
    ctx.lineTo(state.aimX, -10);
    ctx.stroke();
    ctx.setLineDash([]);

    const pulse = 7 + Math.sin(time * .006) * 3;
    ctx.strokeStyle = "rgba(255,143,61,.72)";
    ctx.lineWidth = 3 / view.zoom;
    ctx.beginPath();
    ctx.ellipse(state.aimX, -9, 22 + pulse, 7 + pulse * .25, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlatform() {
    const left = platform.x - platform.width / 2;
    const width = platform.width;
    ctx.save();

    ctx.globalAlpha = .2;
    ctx.fillStyle = "#245b5c";
    ctx.beginPath();
    ctx.ellipse(platform.x, 33, width * .48, 15, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    const dirt = ctx.createLinearGradient(0, 3, 0, 36);
    dirt.addColorStop(0, "#bd7a43");
    dirt.addColorStop(1, COLORS.dirtDark);
    roundedRect(ctx, left + 4, -1, width - 8, 34, 9);
    ctx.fillStyle = dirt;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,205,124,.28)";
    for (let index = 0; index < 12; index += 1) {
      const x = left + 16 + (index * 43) % (width - 30);
      const y = 12 + (index * 17) % 14;
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + index % 3, 2, -.2, 0, TAU);
      ctx.fill();
    }

    const grass = ctx.createLinearGradient(0, -11, 0, 8);
    grass.addColorStop(0, "#98e34f");
    grass.addColorStop(1, COLORS.grassDark);
    roundedRect(ctx, left, -12, width, 20, 8);
    ctx.fillStyle = grass;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.strokeStyle = "#c5f26b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let index = 0; index < 25; index += 1) {
      const x = left + 7 + index * ((width - 14) / 24);
      const blade = 3 + (index * 7) % 7;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.quadraticCurveTo(x + (index % 2 ? 2 : -2), -13 - blade, x + (index % 3 - 1) * 2, -14 - blade);
      ctx.stroke();
    }

    drawFlower(left + 29, -19, "#fff5a8");
    drawFlower(left + width - 36, -18, "#f59caf");
    ctx.restore();
  }

  function drawFlower(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#3d9b48";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = color;
    for (let index = 0; index < 5; index += 1) {
      const angle = index * TAU / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3, 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#edaa35";
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      if (particle.shape === "star") {
        drawStarPath(ctx, 0, 0, particle.size, particle.size * .45, 5);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawStarPath(context, x, y, outerRadius, innerRadius, points) {
    context.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / points;
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
  }

  function drawBody(body, options = {}) {
    ctx.save();
    ctx.translate(body.x, body.y + (options.bob || 0));
    ctx.rotate(body.angle || 0);
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const drawMap = {
      cat: drawCat,
      panda: drawPanda,
      fox: drawFox,
      bunny: drawBunny,
      bear: drawBear,
      pig: drawPig,
      cow: drawCow,
      penguin: drawPenguin,
      elephant: drawElephant
    };
    drawMap[body.animal.id](body);

    if (options.aiming) {
      ctx.strokeStyle = "rgba(255,255,255,.92)";
      ctx.lineWidth = 2.5 / view.zoom;
      ctx.setLineDash([5 / view.zoom, 4 / view.zoom]);
      roundedRect(ctx, -body.width / 2 - 5, -body.height / 2 - 5, body.width + 10, body.height + 10, 16);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function strokeAndFill(fill, lineWidth = 3.2) {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawEye(x, y, scale = 1) {
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.3 * scale, 3 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - .7 * scale, y - 1 * scale, .75 * scale, 0, TAU);
    ctx.fill();
  }

  function drawCheek(x, y, radius = 3.2) {
    ctx.fillStyle = COLORS.cheek;
    ctx.globalAlpha *= .68;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * .58, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSmile(x, y, flip = 1) {
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(x, y, 4, flip > 0 ? .12 : Math.PI + .12, flip > 0 ? Math.PI - .12 : TAU - .12);
    ctx.stroke();
  }

  function drawCat(body) {
    const { width: w, height: h } = body;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-w * .35, h * .08);
    ctx.bezierCurveTo(-w * .56, -h * .05, -w * .52, -h * .34, -w * .37, -h * .26);
    ctx.stroke();
    ctx.strokeStyle = body.animal.color;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    roundedRect(ctx, -w * .38, -h * .21, w * .57, h * .54, h * .22);
    strokeAndFill(body.animal.color);

    ctx.beginPath();
    ctx.moveTo(w * .02, -h * .19);
    ctx.lineTo(w * .11, -h * .48);
    ctx.lineTo(w * .22, -h * .23);
    ctx.lineTo(w * .38, -h * .42);
    ctx.lineTo(w * .43, -h * .12);
    ctx.closePath();
    strokeAndFill(body.animal.color);

    ctx.beginPath();
    ctx.ellipse(w * .24, -h * .02, w * .25, h * .34, -.08, 0, TAU);
    strokeAndFill(body.animal.color);

    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5;
    [-.27, .04].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .19);
      ctx.lineTo(w * x, h * .38);
      ctx.stroke();
    });
    ctx.strokeStyle = body.animal.color;
    ctx.lineWidth = 2.2;
    [-.27, .04].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .18);
      ctx.lineTo(w * x, h * .36);
      ctx.stroke();
    });

    drawEye(w * .17, -h * .08, .86);
    drawEye(w * .31, -h * .09, .86);
    ctx.fillStyle = "#7d4832";
    ctx.beginPath();
    ctx.moveTo(w * .245, -h * .01);
    ctx.lineTo(w * .21, h * .035);
    ctx.lineTo(w * .28, h * .035);
    ctx.closePath();
    ctx.fill();
    drawCheek(w * .1, h * .04, 2.8);
    drawCheek(w * .38, h * .035, 2.8);
  }

  function drawPanda(body) {
    const { width: w, height: h } = body;
    ctx.fillStyle = COLORS.black;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    [-.25, .25].forEach((x) => {
      ctx.beginPath();
      ctx.arc(w * x, -h * .32, h * .16, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.ellipse(0, h * .18, w * .39, h * .33, 0, 0, TAU);
    strokeAndFill(COLORS.black);
    ctx.beginPath();
    ctx.ellipse(0, h * .15, w * .24, h * .27, 0, 0, TAU);
    ctx.fillStyle = COLORS.white;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -h * .1, w * .43, h * .37, 0, 0, TAU);
    strokeAndFill(COLORS.white);

    ctx.fillStyle = COLORS.black;
    [-.19, .19].forEach((x) => {
      ctx.save();
      ctx.translate(w * x, -h * .11);
      ctx.rotate(x);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * .11, h * .12, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    drawEye(-w * .19, -h * .12, .8);
    drawEye(w * .19, -h * .12, .8);
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.ellipse(0, h * .01, 3.4, 2.8, 0, 0, TAU);
    ctx.fill();
    drawSmile(0, h * .025);
    drawCheek(-w * .28, h * .02);
    drawCheek(w * .28, h * .02);
  }

  function drawFox(body) {
    const { width: w, height: h } = body;
    ctx.beginPath();
    ctx.moveTo(-w * .25, h * .05);
    ctx.bezierCurveTo(-w * .46, -h * .38, -w * .65, -h * .18, -w * .46, h * .23);
    ctx.bezierCurveTo(-w * .34, h * .42, -w * .15, h * .28, -w * .08, h * .12);
    ctx.closePath();
    strokeAndFill(body.animal.color);
    ctx.fillStyle = COLORS.cream;
    ctx.beginPath();
    ctx.moveTo(-w * .5, -h * .06);
    ctx.quadraticCurveTo(-w * .58, h * .12, -w * .45, h * .22);
    ctx.quadraticCurveTo(-w * .36, h * .27, -w * .3, h * .18);
    ctx.closePath();
    ctx.fill();

    roundedRect(ctx, -w * .3, -h * .18, w * .52, h * .46, h * .2);
    strokeAndFill(body.animal.color);

    ctx.beginPath();
    ctx.moveTo(w * .06, -h * .14);
    ctx.lineTo(w * .15, -h * .48);
    ctx.lineTo(w * .27, -h * .21);
    ctx.lineTo(w * .4, -h * .46);
    ctx.lineTo(w * .43, -h * .1);
    ctx.closePath();
    strokeAndFill(body.animal.color);
    ctx.beginPath();
    ctx.ellipse(w * .28, 0, w * .24, h * .31, .03, 0, TAU);
    strokeAndFill(body.animal.color);
    ctx.fillStyle = COLORS.cream;
    ctx.beginPath();
    ctx.ellipse(w * .31, h * .08, w * .16, h * .17, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5;
    [-.19, .08].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .14);
      ctx.lineTo(w * x, h * .34);
      ctx.stroke();
    });
    drawEye(w * .22, -h * .06, .8);
    drawEye(w * .34, -h * .06, .8);
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(w * .45, h * .03, 3, 0, TAU);
    ctx.fill();
    drawCheek(w * .19, h * .06, 2.8);
  }

  function drawBunny(body) {
    const { width: w, height: h } = body;
    [-.18, .18].forEach((x, index) => {
      ctx.save();
      ctx.translate(w * x, -h * .28);
      ctx.rotate(index ? .1 : -.1);
      ctx.beginPath();
      ctx.ellipse(0, -h * .15, w * .13, h * .28, 0, 0, TAU);
      strokeAndFill(body.animal.color);
      ctx.fillStyle = "#f3b2b2";
      ctx.beginPath();
      ctx.ellipse(0, -h * .16, w * .045, h * .19, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });

    ctx.beginPath();
    ctx.ellipse(0, h * .2, w * .35, h * .27, 0, 0, TAU);
    strokeAndFill(body.animal.color);
    ctx.beginPath();
    ctx.ellipse(0, -h * .03, w * .42, h * .28, 0, 0, TAU);
    strokeAndFill(body.animal.color);

    drawEye(-w * .16, -h * .08, .9);
    drawEye(w * .16, -h * .08, .9);
    ctx.fillStyle = "#e38f91";
    ctx.beginPath();
    ctx.moveTo(0, -h * .005);
    ctx.lineTo(-3.5, h * .035);
    ctx.lineTo(3.5, h * .035);
    ctx.closePath();
    ctx.fill();
    drawSmile(0, h * .035);
    drawCheek(-w * .27, h * .01);
    drawCheek(w * .27, h * .01);
  }

  function drawBear(body) {
    const { width: w, height: h } = body;
    [-.27, .27].forEach((x) => {
      ctx.beginPath();
      ctx.arc(w * x, -h * .24, h * .16, 0, TAU);
      strokeAndFill(body.animal.color);
      ctx.fillStyle = "#d39a65";
      ctx.beginPath();
      ctx.arc(w * x, -h * .24, h * .075, 0, TAU);
      ctx.fill();
    });

    roundedRect(ctx, -w * .38, -h * .14, w * .76, h * .54, h * .25);
    strokeAndFill(body.animal.color);
    ctx.beginPath();
    ctx.ellipse(0, -h * .04, w * .37, h * .37, 0, 0, TAU);
    strokeAndFill(body.animal.color);

    ctx.fillStyle = "#eac18d";
    ctx.beginPath();
    ctx.ellipse(0, h * .07, w * .18, h * .14, 0, 0, TAU);
    ctx.fill();
    drawEye(-w * .14, -h * .1, .85);
    drawEye(w * .14, -h * .1, .85);
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.ellipse(0, h * .025, 4, 3.1, 0, 0, TAU);
    ctx.fill();
    drawSmile(0, h * .045);
    drawCheek(-w * .25, h * .03);
    drawCheek(w * .25, h * .03);
  }

  function drawPig(body) {
    const { width: w, height: h } = body;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(-w * .43, -h * .03, 8, -.8, 1.4);
    ctx.arc(-w * .43, -h * .03, 4, 1.4, 4.5);
    ctx.stroke();

    roundedRect(ctx, -w * .39, -h * .19, w * .65, h * .52, h * .23);
    strokeAndFill(body.animal.color);
    ctx.beginPath();
    ctx.moveTo(w * .03, -h * .2);
    ctx.lineTo(w * .12, -h * .44);
    ctx.lineTo(w * .25, -h * .21);
    ctx.lineTo(w * .39, -h * .4);
    ctx.lineTo(w * .43, -h * .1);
    ctx.closePath();
    strokeAndFill(body.animal.color);
    ctx.beginPath();
    ctx.ellipse(w * .28, 0, w * .25, h * .32, 0, 0, TAU);
    strokeAndFill(body.animal.color);

    ctx.fillStyle = "#df7f89";
    ctx.beginPath();
    ctx.ellipse(w * .35, h * .06, w * .12, h * .1, 0, 0, TAU);
    ctx.fill();
    [-.02, .06].forEach((x) => {
      ctx.fillStyle = "#a95666";
      ctx.beginPath();
      ctx.ellipse(w * (.32 + x), h * .06, 1.5, 2.2, 0, 0, TAU);
      ctx.fill();
    });
    drawEye(w * .22, -h * .09, .8);
    drawEye(w * .36, -h * .1, .8);
    drawCheek(w * .16, h * .04, 3);
  }

  function drawCow(body) {
    const { width: w, height: h } = body;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * .38, -h * .02);
    ctx.quadraticCurveTo(-w * .52, -h * .15, -w * .48, -h * .31);
    ctx.stroke();
    ctx.fillStyle = "#654b3a";
    ctx.beginPath();
    ctx.ellipse(-w * .49, -h * .32, 4, 7, -.5, 0, TAU);
    ctx.fill();

    roundedRect(ctx, -w * .4, -h * .2, w * .65, h * .53, h * .18);
    strokeAndFill(body.animal.color);
    ctx.fillStyle = "#4e5960";
    ctx.beginPath();
    ctx.ellipse(-w * .17, -h * .08, w * .13, h * .13, -.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * .06, h * .12, w * .1, h * .11, .5, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 5;
    [-.26, .09].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .18);
      ctx.lineTo(w * x, h * .39);
      ctx.stroke();
    });
    ctx.strokeStyle = body.animal.color;
    ctx.lineWidth = 2;
    [-.26, .09].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .18);
      ctx.lineTo(w * x, h * .36);
      ctx.stroke();
    });

    ctx.fillStyle = "#f0c166";
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2.5;
    [-.18, .18].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * (.28 + x), -h * .25);
      ctx.lineTo(w * (.32 + x), -h * .43);
      ctx.lineTo(w * (.38 + x), -h * .24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.ellipse(w * .35, -h * .02, w * .22, h * .34, 0, 0, TAU);
    strokeAndFill(body.animal.color);
    ctx.fillStyle = "#e7a8aa";
    ctx.beginPath();
    ctx.ellipse(w * .39, h * .09, w * .14, h * .1, 0, 0, TAU);
    ctx.fill();
    drawEye(w * .29, -h * .1, .78);
    drawEye(w * .41, -h * .1, .78);
    drawCheek(w * .26, h * .03, 2.8);
  }

  function drawPenguin(body) {
    const { width: w, height: h } = body;
    ctx.fillStyle = "#ef9e3b";
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2.7;
    [-.18, .18].forEach((x) => {
      ctx.beginPath();
      ctx.ellipse(w * x, h * .4, w * .17, h * .06, x * .7, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.ellipse(0, h * .04, w * .41, h * .45, 0, 0, TAU);
    strokeAndFill(body.animal.color);
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.ellipse(0, h * .1, w * .27, h * .34, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = body.animal.color;
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2.8;
    [-1, 1].forEach((direction) => {
      ctx.beginPath();
      ctx.moveTo(direction * w * .34, -h * .06);
      ctx.quadraticCurveTo(direction * w * .57, h * .08, direction * w * .42, h * .24);
      ctx.quadraticCurveTo(direction * w * .3, h * .16, direction * w * .28, h * .02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    drawEye(-w * .14, -h * .12, .85);
    drawEye(w * .14, -h * .12, .85);
    ctx.fillStyle = "#ef9e3b";
    ctx.beginPath();
    ctx.moveTo(0, -h * .045);
    ctx.lineTo(-5, h * .02);
    ctx.lineTo(5, h * .02);
    ctx.closePath();
    ctx.fill();
    drawCheek(-w * .25, -h * .005);
    drawCheek(w * .25, -h * .005);
  }

  function drawElephant(body) {
    const { width: w, height: h } = body;
    ctx.beginPath();
    ctx.ellipse(-w * .07, 0, w * .37, h * .35, 0, 0, TAU);
    strokeAndFill(body.animal.color);

    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 7;
    [-.28, .06].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .17);
      ctx.lineTo(w * x, h * .4);
      ctx.stroke();
    });
    ctx.strokeStyle = body.animal.color;
    ctx.lineWidth = 3;
    [-.28, .06].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(w * x, h * .16);
      ctx.lineTo(w * x, h * .38);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.ellipse(w * .23, -h * .04, w * .23, h * .34, 0, 0, TAU);
    strokeAndFill(body.animal.color);
    ctx.fillStyle = "#6f93a2";
    ctx.beginPath();
    ctx.ellipse(w * .12, -h * .04, w * .16, h * .25, -.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(w * .4, h * .03);
    ctx.quadraticCurveTo(w * .48, h * .28, w * .39, h * .37);
    ctx.stroke();
    ctx.strokeStyle = body.animal.color;
    ctx.lineWidth = 5;
    ctx.stroke();

    drawEye(w * .29, -h * .12, .9);
    drawCheek(w * .32, h * .015, 3);
  }

  function render(time, delta) {
    drawBackground(time);
    updateCamera(delta);
    setWorldTransform();
    drawGuide(time);
    drawPlatform();

    const orderedBodies = [...state.bodies].sort((a, b) => b.y - a.y);
    orderedBodies.forEach((body) => drawBody(body));

    if (state.phase === "aiming" && state.currentAnimal) {
      const preview = {
        animal: state.currentAnimal,
        x: state.aimX,
        y: currentAimY(),
        width: state.currentAnimal.width,
        height: state.currentAnimal.height,
        angle: 0
      };
      drawBody(preview, {
        bob: Math.sin(time * .0045) * 3 / view.zoom,
        aiming: true
      });
    }

    drawParticles();
  }

  function frame(time) {
    const rawDelta = Math.min(MAX_FRAME, Math.max(0, (time - state.lastFrame) / 1000));
    state.lastFrame = time;
    const delta = state.active ? rawDelta : 0;

    if (state.phase !== "intro" && state.active) {
      state.accumulator = Math.min(state.accumulator + delta, FIXED_STEP * 10);
      while (state.accumulator >= FIXED_STEP) {
        simulate(FIXED_STEP);
        state.accumulator -= FIXED_STEP;
      }
      checkGameLoss();
      checkDroppingState(delta);
    }

    render(time, delta);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (state.phase !== "aiming") return;
    state.dragging = true;
    state.pointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    setAimFromPointer(event);
    aimHint.innerHTML = '<span class="hint-arrows" aria-hidden="true">✓</span><span>Posisi siap — tekan JATUHKAN!</span>';
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging || event.pointerId !== state.pointerId || state.phase !== "aiming") return;
    setAimFromPointer(event);
  });

  const stopDragging = (event) => {
    if (event.pointerId !== state.pointerId) return;
    state.dragging = false;
    state.pointerId = null;
  };
  canvas.addEventListener("pointerup", stopDragging);
  canvas.addEventListener("pointercancel", stopDragging);

  dropButton.addEventListener("click", dropCurrentAnimal);
  startButton.addEventListener("click", resetGame);
  retryButton.addEventListener("click", resetGame);
  soundButton.addEventListener("click", () => {
    state.muted = !state.muted;
    try {
      localStorage.setItem(STORAGE_SOUND, state.muted ? "off" : "on");
    } catch (error) {
      // Abaikan bila penyimpanan tidak tersedia.
    }
    updateSoundButton();
    if (!state.muted) {
      tone(659, .1, "triangle", .06);
      tone(880, .12, "sine", .05, .08);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" && state.phase === "aiming") {
      event.preventDefault();
      state.aimX -= 13 / view.zoom;
      constrainAim();
    } else if (event.key === "ArrowRight" && state.phase === "aiming") {
      event.preventDefault();
      state.aimX += 13 / view.zoom;
      constrainAim();
    } else if ((event.key === " " || event.key === "Enter") && state.phase === "aiming") {
      event.preventDefault();
      dropCurrentAnimal();
    } else if ((event.key === " " || event.key === "Enter") && state.phase === "gameover" && !gameOverScreen.hidden) {
      event.preventDefault();
      resetGame();
    }
  });

  document.addEventListener("visibilitychange", () => {
    state.active = !document.hidden;
    state.lastFrame = performance.now();
    state.accumulator = 0;
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  if (window.ResizeObserver) {
    new ResizeObserver(resizeCanvas).observe(document.getElementById("app"));
  }

  // Antarmuka kecil ini memudahkan smoke-test tanpa memengaruhi pemain.
  window.__tumpukHewan = {
    getState: () => ({
      phase: state.phase,
      score: state.score,
      best: state.best,
      bodies: state.bodies.length,
      current: state.currentAnimal?.id || null,
      next: state.nextAnimal?.id || null,
      gravity: BASE_GRAVITY,
      platformWidth: platform.width,
      platformStatic: platform.isStatic,
      platformRestitution: platform.restitution,
      droppedRestitution: state.droppedBody?.restitution ?? null
    }),
    start: resetGame,
    dropAt: (ratio = .5) => {
      if (state.phase !== "aiming") return false;
      const left = platform.x - platform.width / 2;
      state.aimX = left + platform.width * clamp(ratio, 0, 1);
      constrainAim();
      dropCurrentAnimal();
      return true;
    }
  };

  resizeCanvas();
  updateSoundButton();
  bestValue.textContent = String(state.best);
  introBest.textContent = `Rekor terbaik: ${state.best} hewan`;
  requestAnimationFrame((time) => {
    state.lastFrame = time;
    requestAnimationFrame(frame);
  });
})();
