(() => {
  "use strict";

  const TEETH_PER_ROW = 5;
  const TOTAL_TEETH = TEETH_PER_ROW * 2;
  const MAX_SCORE = TOTAL_TEETH - 1;
  const STORAGE_KEY = "crocodileDentistBest";
  const TOOTH_OFFSETS = [15, 5, 0, 5, 15];
  const TOOTH_SCALES = [.78, .93, 1, .93, .78];
  const SAFE_MESSAGES = [
    "Aman! Pilih gigi berikutnya 👆",
    "Bagus! Buayanya masih tenang 😌",
    "Hebat! Terus pilih dengan hati-hati",
    "Keren! Semakin dekat ke skor penuh",
  ];

  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const crocodile = $("crocodile");
  const upperTeeth = $("upperTeeth");
  const lowerTeeth = $("lowerTeeth");
  const scoreValue = $("scoreValue");
  const bestValue = $("bestValue");
  const statusText = $("statusText");
  const scorePopLayer = $("scorePopLayer");
  const introOverlay = $("introOverlay");
  const resultOverlay = $("resultOverlay");
  const resultIcon = $("resultIcon");
  const resultTitle = $("resultTitle");
  const resultCopy = $("resultCopy");
  const finalScore = $("finalScore");
  const bestNote = $("bestNote");
  const confettiLayer = $("confettiLayer");
  const startButton = $("startButton");
  const replayButton = $("replayButton");
  const soundButton = $("soundButton");
  const liveRegion = $("liveRegion");
  const gameSurface = [
    document.querySelector(".topbar"),
    statusText,
    document.querySelector(".game-stage"),
  ];

  let phase = "intro";
  let score = 0;
  let bestScore = readBestScore();
  let trapIndex = -1;
  let resultTimer = 0;
  let audioContext = null;
  let muted = false;
  let teeth = [];

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

  function readBestScore() {
    try {
      const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      return Number.isFinite(stored) ? Math.min(Math.max(stored, 0), MAX_SCORE) : 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore() {
    try {
      localStorage.setItem(STORAGE_KEY, String(bestScore));
    } catch {
      // The game remains playable when storage is unavailable.
    }
  }

  function createTooth(row, position, globalIndex) {
    const tooth = document.createElement("button");
    const rowName = row === "upper" ? "atas" : "bawah";
    tooth.type = "button";
    tooth.className = "tooth";
    tooth.disabled = true;
    tooth.dataset.index = String(globalIndex);
    tooth.style.setProperty("--offset", `${TOOTH_OFFSETS[position]}px`);
    tooth.style.setProperty("--scale", String(TOOTH_SCALES[position]));
    tooth.setAttribute("aria-label", `Gigi ${rowName} ${position + 1}`);
    tooth.setAttribute("aria-pressed", "false");
    tooth.addEventListener("click", handleToothPress);
    return tooth;
  }

  function renderTeeth() {
    for (let position = 0; position < TEETH_PER_ROW; position += 1) {
      upperTeeth.appendChild(createTooth("upper", position, position));
      lowerTeeth.appendChild(createTooth("lower", position, TEETH_PER_ROW + position));
    }
    teeth = Array.from(document.querySelectorAll(".tooth"));
  }

  function startRound() {
    window.clearTimeout(resultTimer);
    ensureAudio();
    resultOverlay.hidden = true;
    introOverlay.hidden = true;
    setGameSurfaceInert(false);
    confettiLayer.replaceChildren();
    scorePopLayer.replaceChildren();
    crocodile.classList.remove("is-biting", "is-celebrating");
    statusText.classList.remove("is-danger", "is-win");

    score = 0;
    trapIndex = Math.floor(Math.random() * TOTAL_TEETH);
    phase = "playing";
    updateScore();
    setStatus("Pilih gigi atas atau bawah… hati-hati! 🐊");

    teeth.forEach((tooth, index) => {
      const rowName = index < TEETH_PER_ROW ? "atas" : "bawah";
      const position = (index % TEETH_PER_ROW) + 1;
      tooth.disabled = false;
      tooth.classList.remove("is-pressed", "is-trap");
      tooth.setAttribute("aria-pressed", "false");
      tooth.setAttribute("aria-label", `Gigi ${rowName} ${position}`);
    });

    announce("Permainan dimulai. Pilih satu gigi.");
    teeth[0].focus({ preventScroll: true });
  }

  function handleToothPress(event) {
    if (phase !== "playing") return;

    const tooth = event.currentTarget;
    const index = Number(tooth.dataset.index);

    if (index === trapIndex) {
      triggerBite(tooth);
      return;
    }

    pressSafeTooth(tooth);
  }

  function pressSafeTooth(tooth) {
    tooth.disabled = true;
    tooth.classList.add("is-pressed");
    tooth.setAttribute("aria-pressed", "true");
    tooth.setAttribute("aria-label", `${tooth.getAttribute("aria-label")}, sudah ditekan dan aman`);

    score += 1;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }

    updateScore();
    playSafeSound(score);
    showScorePop(tooth);

    if (score === MAX_SCORE) {
      triggerWin();
      return;
    }

    setStatus(SAFE_MESSAGES[(score - 1) % SAFE_MESSAGES.length]);
    announce(`Gigi aman. Skor ${score}.`);
  }

  function triggerBite(tooth) {
    phase = "biting";
    disableAllTeeth();
    tooth.classList.add("is-trap");
    tooth.setAttribute("aria-label", `${tooth.getAttribute("aria-label")}, gigi jebakan`);
    crocodile.classList.add("is-biting");
    statusText.classList.add("is-danger");
    setStatus("KREK! Buayanya menggigit! 😵");
    playBiteSound();
    announce(`Gigi jebakan. Permainan selesai dengan skor ${score}.`);

    if (navigator.vibrate) navigator.vibrate([80, 45, 150]);

    resultTimer = window.setTimeout(() => {
      showResult("lose");
    }, 920);
  }

  function triggerWin() {
    phase = "winning";
    disableAllTeeth();
    crocodile.classList.add("is-celebrating");
    statusText.classList.add("is-win");
    setStatus("Semua gigi aman ditemukan! 🏆");
    playWinSound();
    announce(`Hebat. Semua gigi aman ditemukan. Skor penuh ${score}.`);

    resultTimer = window.setTimeout(() => {
      showResult("win");
    }, 850);
  }

  function disableAllTeeth() {
    teeth.forEach((tooth) => {
      tooth.disabled = true;
    });
  }

  function updateScore() {
    scoreValue.textContent = String(score);
    bestValue.textContent = String(bestScore);
  }

  function setGameSurfaceInert(isInert) {
    gameSurface.forEach((element) => {
      element.inert = isInert;
    });
  }

  function setStatus(message) {
    statusText.textContent = message;
    statusText.classList.remove("is-pop");
    void statusText.offsetWidth;
    statusText.classList.add("is-pop");
  }

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(() => {
      liveRegion.textContent = message;
    }, 20);
  }

  function showScorePop(tooth) {
    const stageRect = scorePopLayer.getBoundingClientRect();
    const toothRect = tooth.getBoundingClientRect();
    const pop = document.createElement("span");
    pop.className = "score-pop";
    pop.textContent = "+1";
    pop.style.left = `${toothRect.left - stageRect.left + toothRect.width / 2}px`;
    pop.style.top = `${toothRect.top - stageRect.top + toothRect.height / 2}px`;
    scorePopLayer.appendChild(pop);
    pop.addEventListener("animationend", () => pop.remove(), { once: true });
  }

  function showResult(kind) {
    const won = kind === "win";
    phase = "result";
    resultIcon.textContent = won ? "🏆" : "😵";
    resultTitle.textContent = won ? "Luar biasa!" : "Aduh, digigit!";
    resultCopy.textContent = won
      ? "Kamu menemukan semua gigi aman."
      : "Kamu menemukan gigi jebakan.";
    finalScore.textContent = String(score);
    bestNote.textContent = `Skor terbaik: ${bestScore} dari ${MAX_SCORE}`;
    setGameSurfaceInert(true);
    resultOverlay.hidden = false;

    if (won) spawnConfetti();
    replayButton.focus({ preventScroll: true });
  }

  function spawnConfetti() {
    const colors = ["#ffcb3d", "#ff6f61", "#4fbc5b", "#49a9e8", "#a77bf3", "#fff"];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 30; index += 1) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${3 + Math.random() * 94}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--duration", `${2.2 + Math.random() * 1.4}s`);
      piece.style.setProperty("--delay", `${Math.random() * .55}s`);
      piece.style.transform = `rotate(${Math.random() * 180}deg)`;
      fragment.appendChild(piece);
    }

    confettiLayer.appendChild(fragment);
  }

  function ensureAudio() {
    if (muted) return null;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function makeTone(frequency, start, duration, volume, type = "sine", destination = null) {
    const context = ensureAudio();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const target = destination || context.destination;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain);
    gain.connect(target);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  function playSafeSound(step) {
    const context = ensureAudio();
    if (!context) return;
    const base = 350 + (step % 5) * 35;
    const now = context.currentTime;
    makeTone(base, now, .13, .13, "sine");
    makeTone(base * 1.5, now + .04, .12, .075, "triangle");
  }

  function playBiteSound() {
    const context = ensureAudio();
    if (!context) return;
    const now = context.currentTime;

    makeTone(150, now, .28, .24, "sawtooth");
    makeTone(82, now + .08, .4, .3, "square");

    const sampleCount = Math.floor(context.sampleRate * .18);
    const noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const noise = context.createBufferSource();
    const gain = context.createGain();
    noise.buffer = noiseBuffer;
    gain.gain.setValueAtTime(.22, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .18);
    noise.connect(gain);
    gain.connect(context.destination);
    noise.start(now);
  }

  function playWinSound() {
    const context = ensureAudio();
    if (!context) return;
    const now = context.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      makeTone(frequency, now + index * .11, .32, .13, "triangle");
    });
  }

  function toggleSound() {
    muted = !muted;
    soundButton.setAttribute("aria-pressed", String(muted));
    soundButton.setAttribute("aria-label", muted ? "Nyalakan suara" : "Matikan suara");
    soundButton.querySelector("span").textContent = muted ? "🔇" : "🔊";

    if (muted && audioContext && audioContext.state === "running") {
      audioContext.suspend().catch(() => {});
    } else if (!muted) {
      ensureAudio();
      playSafeSound(1);
    }
  }

  blockAccidentalZoom();
  renderTeeth();
  updateScore();
  setGameSurfaceInert(true);

  startButton.addEventListener("click", startRound);
  replayButton.addEventListener("click", startRound);
  soundButton.addEventListener("click", toggleSound);

  app.addEventListener("contextmenu", (event) => event.preventDefault());
})();
