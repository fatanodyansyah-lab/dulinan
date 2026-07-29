(() => {
  "use strict";

  const FALL_SECONDS = 1.85;
  const HIT_WINDOW = 0.27;
  const SONG_SECONDS = 30;
  const LANE_POSITIONS = [12.5, 37.5, 62.5, 87.5];
  const LANE_COLORS = ["#ff4f6f", "#ffc928", "#94df37", "#35b9ff"];
  const KEY_MAP = {
    a: 0,
    arrowleft: 0,
    s: 1,
    arrowdown: 1,
    d: 2,
    arrowup: 2,
    f: 3,
    arrowright: 3,
  };
  const FEEDBACK = {
    perfect: ["Sempurna!", "Hebat!", "Mantap!"],
    good: ["Bagus!", "Keren!"],
    okay: ["Hampir!"],
  };

  function buildChart() {
    const lanes = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 2, 0, 1, 2, 3, 1];
    const chart = [];
    let time = 1.45;
    let index = 0;

    while (time < 28.7) {
      chart.push({ id: index, lane: lanes[index % lanes.length], hitTime: time });
      time += index % 12 === 7 || index % 12 === 8 ? 0.34 : 0.49;
      index += 1;
    }

    return chart;
  }

  const CHART = buildChart();
  const byId = (id) => document.getElementById(id);
  const stage = byId("stage");
  const highway = byId("highway");
  const notesLayer = byId("notesLayer");
  const burstsLayer = byId("burstsLayer");
  const scoreValue = byId("scoreValue");
  const starCount = byId("starCount");
  const comboBox = byId("comboBox");
  const comboValue = byId("comboValue");
  const energyFill = byId("energyFill");
  const timeValue = byId("timeValue");
  const feedback = byId("feedback");
  const startScreen = byId("startScreen");
  const pauseScreen = byId("pauseScreen");
  const endScreen = byId("endScreen");
  const startBtn = byId("startBtn");
  const pauseBtn = byId("pauseBtn");
  const resumeBtn = byId("resumeBtn");
  const restartPauseBtn = byId("restartPauseBtn");
  const replayBtn = byId("replayBtn");
  const resultStars = byId("resultStars");
  const resultTitle = byId("resultTitle");
  const resultSummary = byId("resultSummary");
  const finalScore = byId("finalScore");
  const songAudio = byId("songAudio");
  const tapButtons = Array.from(document.querySelectorAll(".tap-button"));
  const ratingStars = Array.from(document.querySelectorAll(".rating-star"));

  let phase = "start";
  let pending = [];
  let activeNotes = [];
  let score = 0;
  let combo = 0;
  let hits = 0;
  let misses = 0;
  let energy = 100;
  let animationFrame = 0;
  let feedbackIndex = 0;
  let audioContext = null;

  function blockAccidentalZoom() {
    const stopMultiTouch = (event) => {
      if (event.touches && event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("touchstart", stopMultiTouch, { passive: false });
    document.addEventListener("touchmove", stopMultiTouch, { passive: false });
    ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
      document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
    });

    let lastTap = { time: 0, x: 0, y: 0 };
    document.addEventListener("touchend", (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      const now = Date.now();
      const distance = Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y);
      if (now - lastTap.time <= 300 && distance < 28) event.preventDefault();
      lastTap = { time: now, x: touch.clientX, y: touch.clientY };
    }, { passive: false });

    document.addEventListener("wheel", (event) => {
      if (event.ctrlKey) event.preventDefault();
    }, { passive: false });
  }

  function prepareAudioContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioContext = new AudioContextClass();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function playPluck(lane, quality) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const frequencies = [261.63, 329.63, 392, 523.25];
    const gain = audioContext.createGain();
    const oscillator = audioContext.createOscillator();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequencies[lane], now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(quality === "perfect" ? 0.09 : 0.055, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  }

  function resetState() {
    pending = CHART.map((note) => ({ ...note }));
    activeNotes.forEach((note) => note.element.remove());
    activeNotes = [];
    notesLayer.replaceChildren();
    burstsLayer.replaceChildren();
    score = 0;
    combo = 0;
    hits = 0;
    misses = 0;
    energy = 100;
    feedbackIndex = 0;
    scoreValue.textContent = "0";
    starCount.textContent = "0";
    comboValue.textContent = "0";
    timeValue.textContent = "0:30";
    updateEnergy();
    updateRating(0);
  }

  async function startGame() {
    cancelAnimationFrame(animationFrame);
    prepareAudioContext();
    songAudio.pause();
    songAudio.currentTime = 0;
    songAudio.volume = 0.88;
    resetState();
    startScreen.hidden = true;
    pauseScreen.hidden = true;
    endScreen.hidden = true;
    phase = "play";

    try {
      await songAudio.play();
      animationFrame = requestAnimationFrame(gameLoop);
    } catch {
      phase = "start";
      startScreen.hidden = false;
      startBtn.textContent = "Audio gagal dimuat · Coba lagi";
    }
  }

  function gameLoop() {
    if (phase !== "play") return;

    const currentTime = songAudio.currentTime;
    while (pending.length && pending[0].hitTime - FALL_SECONDS <= currentTime) {
      spawnNote(pending.shift());
    }

    const highwayHeight = highway.clientHeight;
    for (let index = activeNotes.length - 1; index >= 0; index -= 1) {
      const note = activeNotes[index];
      const progress = Math.min(1.12, Math.max(0, 1 - (note.hitTime - currentTime) / FALL_SECONDS));
      const noteSize = note.element.offsetWidth || 52;
      const startY = -noteSize - 8;
      const targetY = highwayHeight - 55 - noteSize / 2;
      const y = startY + (targetY - startY) * progress;
      const scale = 0.58 + progress * 0.42;
      note.element.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;

      if (currentTime > note.hitTime + HIT_WINDOW) {
        registerMiss(note, index);
      }
    }

    const secondsLeft = Math.max(0, Math.ceil(SONG_SECONDS - currentTime));
    timeValue.textContent = `0:${String(secondsLeft).padStart(2, "0")}`;

    if (currentTime >= SONG_SECONDS - 0.08 || songAudio.ended) {
      finishGame();
      return;
    }

    animationFrame = requestAnimationFrame(gameLoop);
  }

  function spawnNote(note) {
    const element = document.createElement("div");
    element.className = `note note-${note.lane}`;
    element.style.left = `${LANE_POSITIONS[note.lane]}%`;
    element.dataset.noteId = String(note.id);
    notesLayer.appendChild(element);
    activeNotes.push({ ...note, element });
  }

  function registerMiss(note, index) {
    note.element.remove();
    activeNotes.splice(index, 1);
    misses += 1;
    combo = 0;
    energy = Math.max(0, energy - 11);
    updateCombo();
    updateEnergy();

  }

  function hitLane(lane) {
    pressButton(lane);
    if (phase !== "play") return;

    const currentTime = songAudio.currentTime;
    let bestIndex = -1;
    let bestDifference = Infinity;

    activeNotes.forEach((note, index) => {
      if (note.lane !== lane) return;
      const difference = Math.abs(currentTime - note.hitTime);
      if (difference <= HIT_WINDOW && difference < bestDifference) {
        bestIndex = index;
        bestDifference = difference;
      }
    });

    if (bestIndex < 0) return;

    const note = activeNotes[bestIndex];
    const quality = bestDifference <= 0.09 ? "perfect" : bestDifference <= 0.18 ? "good" : "okay";
    const points = quality === "perfect" ? 120 : quality === "good" ? 90 : 60;
    combo += 1;
    hits += 1;
    score += points + Math.min(combo, 20) * 3;
    energy = Math.min(100, energy + 3);
    note.element.remove();
    activeNotes.splice(bestIndex, 1);
    scoreValue.textContent = String(score);
    starCount.textContent = String(Math.floor(score / 500));
    updateCombo();
    updateEnergy();
    updateRating(getLiveStars());
    showFeedback(quality);
    spawnBurst(lane);
    playPluck(lane, quality);
  }

  function getLiveStars() {
    const possibleScore = Math.max(1, CHART.length * 150);
    const ratio = score / possibleScore;
    if (ratio >= 0.7) return 3;
    if (ratio >= 0.36) return 2;
    if (score > 0) return 1;
    return 0;
  }

  function updateCombo() {
    comboValue.textContent = String(combo);
    comboBox.classList.remove("is-pop");
    void comboBox.offsetWidth;
    if (combo > 1) comboBox.classList.add("is-pop");
  }

  function updateEnergy() {
    energyFill.style.height = `${energy}%`;
    if (energy <= 35) {
      energyFill.style.background = "linear-gradient(180deg, #ffca38, #ff4f6f)";
    } else {
      energyFill.style.background = "";
    }
  }

  function updateRating(stars) {
    ratingStars.forEach((star, index) => {
      star.classList.toggle("is-earned", index < stars);
    });
  }

  function showFeedback(quality) {
    const words = FEEDBACK[quality];
    feedback.textContent = words[feedbackIndex % words.length];
    feedbackIndex += 1;
    feedback.classList.remove("is-pop");
    void feedback.offsetWidth;
    feedback.classList.add("is-pop");
  }

  function spawnBurst(lane) {
    const burst = document.createElement("div");
    burst.className = "burst";
    burst.style.left = `${LANE_POSITIONS[lane]}%`;
    burst.style.color = LANE_COLORS[lane];
    burstsLayer.appendChild(burst);
    window.setTimeout(() => burst.remove(), 520);
  }

  function pressButton(lane) {
    const button = tapButtons[lane];
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 110);
  }

  function pauseGame() {
    if (phase !== "play") return;
    phase = "pause";
    cancelAnimationFrame(animationFrame);
    songAudio.pause();
    pauseScreen.hidden = false;
    resumeBtn.focus({ preventScroll: true });
  }

  async function resumeGame() {
    if (phase !== "pause") return;
    prepareAudioContext();
    pauseScreen.hidden = true;
    phase = "play";
    try {
      await songAudio.play();
      animationFrame = requestAnimationFrame(gameLoop);
    } catch {
      phase = "pause";
      pauseScreen.hidden = false;
    }
  }

  function finishGame() {
    if (phase === "end") return;
    phase = "end";
    cancelAnimationFrame(animationFrame);
    songAudio.pause();
    activeNotes.forEach((note) => note.element.remove());
    activeNotes = [];

    const accuracy = hits + misses > 0 ? hits / (hits + misses) : 0;
    const stars = accuracy >= 0.82 ? 3 : accuracy >= 0.52 ? 2 : 1;
    updateRating(stars);
    resultStars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    resultTitle.textContent = stars === 3 ? "Luar Biasa!" : stars === 2 ? "Hebat Sekali!" : "Terus Berlatih!";
    resultSummary.textContent = `${hits} not tepat dari ${CHART.length} not`;
    finalScore.textContent = String(score);
    endScreen.hidden = false;
    replayBtn.focus({ preventScroll: true });
  }

  tapButtons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      hitLane(Number(button.dataset.lane));
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key === "Escape") {
      if (phase === "play") pauseGame();
      else if (phase === "pause") resumeGame();
      return;
    }
    const lane = KEY_MAP[event.key.toLowerCase()];
    if (lane !== undefined) {
      event.preventDefault();
      hitLane(lane);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && phase === "play") pauseGame();
  });

  startBtn.addEventListener("click", startGame);
  pauseBtn.addEventListener("click", pauseGame);
  resumeBtn.addEventListener("click", resumeGame);
  restartPauseBtn.addEventListener("click", startGame);
  replayBtn.addEventListener("click", startGame);
  songAudio.addEventListener("ended", () => finishGame());
  stage.addEventListener("contextmenu", (event) => event.preventDefault());

  blockAccidentalZoom();
  resetState();
})();
