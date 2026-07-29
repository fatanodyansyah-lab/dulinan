(() => {
  "use strict";

  const CHARACTERS = {
    rumi: {
      name: "Rumi",
      number: "••• 271",
      image: "assets/rumi.jpg",
      video: "assets/rumi-video.mp4",
      imagePosition: "50% 28%"
    },
    mira: {
      name: "Mira",
      number: "••• 596",
      image: "assets/mira.jpg",
      video: "assets/mira-video.mp4",
      imagePosition: "50% 36%"
    },
    zoey: {
      name: "Zoey",
      number: "••• 843",
      image: "assets/zoey.png",
      video: "assets/zoey-video.mp4",
      imagePosition: "50% 30%"
    }
  };

  const ROUND_COUNT = 5;
  const CONNECTING_DELAY_MS = 2700;
  const app = document.getElementById("app");
  const gameFrame = document.querySelector(".game-frame");
  const screens = [...document.querySelectorAll(".screen")];
  const contactButtons = [...document.querySelectorAll(".contact-card")];
  const keypadButtons = [...document.querySelectorAll("#keypad button")];

  const soundButton = document.getElementById("sound-button");
  const screenDial = document.getElementById("screen-dial");
  const backToContacts = document.getElementById("back-to-contacts");
  const dialAvatar = document.getElementById("dial-avatar");
  const dialName = document.getElementById("dial-name");
  const roundCounter = document.getElementById("round-counter");
  const targetOrb = document.getElementById("target-orb");
  const targetDigit = document.getElementById("target-digit");
  const feedback = document.getElementById("feedback");
  const progressDots = document.getElementById("progress-dots");

  const connectingAvatar = document.getElementById("connecting-avatar");
  const connectingName = document.getElementById("connecting-name");
  const connectingNumber = document.getElementById("connecting-number");
  const cancelCall = document.getElementById("cancel-call");

  const callVideo = document.getElementById("call-video");
  const callAvatar = document.getElementById("call-avatar");
  const callName = document.getElementById("call-name");
  const callStatus = document.getElementById("call-status");
  const callDuration = document.getElementById("call-duration");
  const answerPrompt = document.getElementById("answer-prompt");
  const answerButton = document.getElementById("answer-button");
  const callEnded = document.getElementById("call-ended");
  const videoSoundButton = document.getElementById("video-sound-button");
  const hangUpButton = document.getElementById("hang-up-button");
  const replayButton = document.getElementById("replay-button");

  let selectedKey = null;
  let sequence = [];
  let currentRound = 0;
  let inputLocked = false;
  let soundEnabled = true;
  let challengeTimeout = 0;
  let connectingTimeout = 0;
  let ringingInterval = 0;
  let audioContext = null;
  let activeScreenId = "screen-contacts";

  function blockAccidentalZoom() {
    const stopMultiTouch = (event) => {
      if (event.touches && event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener("touchstart", stopMultiTouch, { passive: false });
    document.addEventListener("touchmove", stopMultiTouch, { passive: false });

    ["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
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

  function resetViewportPosition() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    app.scrollLeft = 0;
    app.scrollTop = 0;
    gameFrame.scrollLeft = 0;
    gameFrame.scrollTop = 0;
  }

  function showScreen(screenId) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    resetViewportPosition();
    activeScreenId = screenId;
    screens.forEach((screen) => {
      const isActive = screen.id === screenId;
      screen.hidden = !isActive;
      screen.setAttribute("aria-hidden", String(!isActive));
      if (isActive) {
        screen.scrollTop = 0;
        screen.style.animation = "none";
        void screen.offsetWidth;
        screen.style.animation = "";
      }
    });
    window.requestAnimationFrame(resetViewportPosition);
  }

  function generateSequence() {
    const result = [];
    while (result.length < ROUND_COUNT) {
      const digit = 1 + Math.floor(Math.random() * 9);
      if (digit !== result[result.length - 1]) result.push(digit);
    }
    return result;
  }

  function setImage(element, character) {
    element.src = character.image;
    element.alt = character.name;
    element.style.objectPosition = character.imagePosition;
  }

  function selectCharacter(key) {
    const character = CHARACTERS[key];
    if (!character) return;

    stopCall();
    selectedKey = key;
    sequence = generateSequence();
    currentRound = 0;
    inputLocked = false;

    setImage(dialAvatar, character);
    setImage(connectingAvatar, character);
    setImage(callAvatar, character);
    dialName.textContent = character.name;
    connectingName.textContent = character.name;
    connectingNumber.textContent = character.number;
    callName.textContent = character.name;

    callVideo.src = character.video;
    callVideo.poster = character.image;
    callVideo.load();

    renderChallenge();
    showScreen("screen-dial");
    playTone("select");
  }

  function renderChallenge() {
    const digit = sequence[currentRound];
    targetDigit.textContent = String(digit);
    targetOrb.setAttribute("aria-label", `Angka yang harus dicari: ${digit}`);
    roundCounter.textContent = `${currentRound + 1} / ${ROUND_COUNT}`;
    roundCounter.setAttribute("aria-label", `Soal ${currentRound + 1} dari ${ROUND_COUNT}`);
    feedback.className = "feedback";
    feedback.innerHTML = `Temukan angka <strong>${digit}</strong> di bawah`;

    targetOrb.classList.remove("is-next");
    void targetOrb.offsetWidth;
    targetOrb.classList.add("is-next");

    progressDots.replaceChildren();
    progressDots.setAttribute(
      "aria-label",
      currentRound === 0
        ? "Belum ada angka yang selesai"
        : `${currentRound} dari ${ROUND_COUNT} angka selesai`
    );
    sequence.forEach((value, index) => {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      dot.setAttribute("aria-hidden", "true");
      if (index < currentRound) {
        dot.classList.add("is-done");
        dot.textContent = "✓";
      } else if (index === currentRound) {
        dot.classList.add("is-current");
      }
      progressDots.appendChild(dot);
    });

    keypadButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove("is-correct", "is-wrong");
    });
  }

  function handleDigit(button) {
    if (inputLocked || activeScreenId !== "screen-dial") return;

    const pressedDigit = Number(button.dataset.digit);
    const wantedDigit = sequence[currentRound];

    if (pressedDigit === wantedDigit) {
      inputLocked = true;
      button.classList.add("is-correct");
      feedback.className = "feedback is-correct";
      feedback.textContent = currentRound === ROUND_COUNT - 1
        ? "Lengkap! Saatnya menelepon!"
        : "Benar! Kamu hebat!";
      playTone("correct");
      vibrate([32]);

      challengeTimeout = window.setTimeout(() => {
        challengeTimeout = 0;
        currentRound += 1;
        if (currentRound >= ROUND_COUNT) {
          beginConnecting();
          return;
        }
        inputLocked = false;
        renderChallenge();
      }, 520);
      return;
    }

    button.classList.remove("is-wrong");
    void button.offsetWidth;
    button.classList.add("is-wrong");
    feedback.className = "feedback is-wrong";
    feedback.textContent = `Hampir! Cari angka ${wantedDigit} ya`;
    playTone("wrong");
    vibrate([45, 35, 45]);

    window.setTimeout(() => {
      button.classList.remove("is-wrong");
    }, 420);
  }

  function beginConnecting() {
    const character = CHARACTERS[selectedKey];
    if (!character) return;

    inputLocked = true;
    showScreen("screen-connecting");
    playTone("ring");
    ringingInterval = window.setInterval(() => playTone("ring"), 920);
    connectingTimeout = window.setTimeout(showCall, CONNECTING_DELAY_MS);
  }

  async function showCall() {
    window.clearTimeout(connectingTimeout);
    window.clearInterval(ringingInterval);
    connectingTimeout = 0;
    ringingInterval = 0;

    callEnded.hidden = true;
    answerPrompt.hidden = true;
    callStatus.textContent = "Terhubung";
    callDuration.textContent = "00:00";
    callDuration.setAttribute("datetime", "PT0S");
    callVideo.currentTime = 0;
    callVideo.muted = !soundEnabled;
    updateVideoSoundButton();
    showScreen("screen-call");

    try {
      await callVideo.play();
      answerPrompt.hidden = true;
    } catch {
      answerPrompt.hidden = false;
      callStatus.textContent = "Siap diangkat";
    }
  }

  async function playVideoFromStart() {
    callEnded.hidden = true;
    answerPrompt.hidden = true;
    callVideo.currentTime = 0;
    callVideo.muted = !soundEnabled;
    updateVideoSoundButton();

    try {
      await callVideo.play();
    } catch {
      answerPrompt.hidden = false;
      callStatus.textContent = "Ketuk untuk mulai";
    }
  }

  function updateDuration() {
    const totalSeconds = Number.isFinite(callVideo.currentTime)
      ? Math.max(0, Math.floor(callVideo.currentTime))
      : 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    callDuration.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    callDuration.setAttribute("datetime", `PT${totalSeconds}S`);
  }

  function handleVideoEnded() {
    callStatus.textContent = "Panggilan selesai";
    callEnded.hidden = false;
    playTone("finish");
  }

  function stopConnecting() {
    window.clearTimeout(connectingTimeout);
    window.clearInterval(ringingInterval);
    connectingTimeout = 0;
    ringingInterval = 0;
  }

  function stopCall() {
    window.clearTimeout(challengeTimeout);
    challengeTimeout = 0;
    stopConnecting();
    callVideo.pause();
    callVideo.removeAttribute("src");
    callVideo.removeAttribute("poster");
    callVideo.load();
    callEnded.hidden = true;
    answerPrompt.hidden = true;
    callDuration.textContent = "00:00";
  }

  function returnToContacts() {
    stopCall();
    inputLocked = false;
    currentRound = 0;
    sequence = [];
    selectedKey = null;
    showScreen("screen-contacts");
  }

  function setSoundEnabled(enabled) {
    soundEnabled = enabled;
    soundButton.setAttribute("aria-pressed", String(enabled));
    soundButton.setAttribute("aria-label", enabled ? "Matikan suara" : "Nyalakan suara");
    callVideo.muted = !enabled;
    updateVideoSoundButton();

    if (enabled) {
      ensureAudioContext();
      playTone("select");
    }
  }

  function updateVideoSoundButton() {
    const hasSound = !callVideo.muted;
    videoSoundButton.setAttribute("aria-pressed", String(hasSound));
    videoSoundButton.setAttribute("aria-label", hasSound ? "Matikan suara video" : "Nyalakan suara video");
    videoSoundButton.classList.toggle("video-sound-muted", !hasSound);
  }

  function ensureAudioContext() {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) audioContext = new Context();
    }

    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function makeTone(frequency, startOffset, duration, gainValue, type = "sine") {
    const context = ensureAudioContext();
    if (!context || !soundEnabled) return;

    const startAt = context.currentTime + startOffset;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue, startAt + .018);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + .03);
  }

  function playTone(type) {
    if (!soundEnabled) return;

    if (type === "select") {
      makeTone(440, 0, .11, .035, "sine");
      makeTone(660, .07, .13, .035, "sine");
    } else if (type === "correct") {
      makeTone(523.25, 0, .14, .055, "triangle");
      makeTone(659.25, .1, .15, .05, "triangle");
      makeTone(783.99, .2, .19, .045, "triangle");
    } else if (type === "wrong") {
      makeTone(210, 0, .13, .035, "sine");
      makeTone(180, .11, .17, .03, "sine");
    } else if (type === "ring") {
      makeTone(440, 0, .18, .034, "sine");
      makeTone(554.37, 0, .18, .028, "sine");
      makeTone(440, .27, .18, .034, "sine");
      makeTone(554.37, .27, .18, .028, "sine");
    } else if (type === "finish") {
      makeTone(659.25, 0, .12, .035, "triangle");
      makeTone(783.99, .1, .12, .035, "triangle");
      makeTone(1046.5, .2, .22, .04, "triangle");
    }
  }

  function vibrate(pattern) {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  }

  contactButtons.forEach((button) => {
    button.addEventListener("click", () => selectCharacter(button.dataset.character));
  });

  keypadButtons.forEach((button) => {
    button.addEventListener("click", () => handleDigit(button));
  });

  backToContacts.addEventListener("click", returnToContacts);
  cancelCall.addEventListener("click", returnToContacts);
  hangUpButton.addEventListener("click", returnToContacts);
  replayButton.addEventListener("click", playVideoFromStart);
  answerButton.addEventListener("click", playVideoFromStart);

  soundButton.addEventListener("click", () => {
    setSoundEnabled(!soundEnabled);
  });

  videoSoundButton.addEventListener("click", () => {
    setSoundEnabled(callVideo.muted);
  });

  callVideo.addEventListener("play", () => {
    callStatus.textContent = "Terhubung";
    answerPrompt.hidden = true;
    callEnded.hidden = true;
  });
  callVideo.addEventListener("timeupdate", updateDuration);
  callVideo.addEventListener("ended", handleVideoEnded);

  document.addEventListener("keydown", (event) => {
    if (activeScreenId === "screen-dial" && /^[1-9]$/.test(event.key)) {
      const button = keypadButtons.find((item) => item.dataset.digit === event.key);
      if (button) {
        event.preventDefault();
        handleDigit(button);
      }
      return;
    }

    if (event.key === "Escape") {
      if (activeScreenId !== "screen-contacts") {
        event.preventDefault();
        returnToContacts();
      }
      return;
    }

    if (
      activeScreenId === "screen-call"
      && (event.key === "Enter" || event.key === " ")
      && (answerPrompt.hidden === false || callEnded.hidden === false)
    ) {
      event.preventDefault();
      playVideoFromStart();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && activeScreenId === "screen-call" && !callVideo.paused) {
      callVideo.pause();
      answerPrompt.hidden = false;
      callStatus.textContent = "Panggilan dijeda";
    }
  });

  blockAccidentalZoom();
  showScreen("screen-contacts");
  updateVideoSoundButton();
})();
