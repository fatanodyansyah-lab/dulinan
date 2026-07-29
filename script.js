(() => {
  // ---------- block accidental zoom (iOS ignores user-scalable=no) ----------
  (function blockZoom() {
    const stopMulti = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchstart', stopMulti, { passive: false });
    document.addEventListener('touchmove', stopMulti, { passive: false });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
    });

    let lastTap = { t: 0, x: 0, y: 0 };
    document.addEventListener('touchend', (e) => {
      const touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      const now = Date.now();
      const x = touch.clientX;
      const y = touch.clientY;
      const dt = now - lastTap.t;
      const dist = Math.hypot(x - lastTap.x, y - lastTap.y);
      if (dt <= 300 && dist < 28) e.preventDefault();
      lastTap = { t: now, x, y };
    }, { passive: false });

    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey) e.preventDefault();
    }, { passive: false });
  })();

  const PALETTE = [
    { bg: 'linear-gradient(135deg,#ff8fb1,#ff5e8a)', shadow: 'rgba(255,94,138,.4)', playColor: '#ff5e8a' },
    { bg: 'linear-gradient(135deg,#7ad0ff,#3aa0ff)', shadow: 'rgba(58,160,255,.4)', playColor: '#3aa0ff' },
    { bg: 'linear-gradient(135deg,#ffd166,#ffa62b)', shadow: 'rgba(255,166,43,.4)', playColor: '#f59300' },
    { bg: 'linear-gradient(135deg,#a78bff,#7a5cff)', shadow: 'rgba(122,92,255,.4)', playColor: '#7a5cff' },
    { bg: 'linear-gradient(135deg,#5dd6b0,#22b98a)', shadow: 'rgba(34,185,138,.4)', playColor: '#22b98a' },
    { bg: 'linear-gradient(135deg,#9bd957,#48ae55)', shadow: 'rgba(65,154,75,.4)', playColor: '#3b9747' },
    { bg: 'linear-gradient(135deg,#70cf7a,#278c45)', shadow: 'rgba(39,140,69,.4)', playColor: '#278c45' },
  ];

  // Each real game lives in games/<folder>/index.html — add a new entry here
  // (emoji, name, tag, url) to list it on the home screen.
  const GAMES = [
    { emoji: '🐱', name: 'Kucing Es Krim', tag: 'Arcade', url: 'games/kucing_es_krim/index.html' },
    { emoji: '🐰', name: 'Konser Kelinci', tag: 'Musik', url: 'games/konser_kelinci/index.html' },
    { emoji: '🎤', name: 'K-Pop Hunter Fashion', tag: 'Dress-Up', url: 'games/kpop_hunter_fashion/index.html' },
    { emoji: '🎹', name: 'Golden Piano Tiles', tag: 'Musik', url: 'games/golden_piano_tiles/index.html' },
    { emoji: '🪐', name: 'Puzzle Planet', tag: 'Puzzle', url: 'games/puzzle_planet/index.html' },
    { emoji: '🐾', name: 'Tumpuk Hewan', tag: 'Keseimbangan', url: 'games/tumpuk_hewan/index.html' },
    { emoji: '🐊', name: 'Crocodile Dentist', tag: 'Tebak Gigi', url: 'games/crocodile_dentist/index.html' },
  ];

  const homeScreen = document.getElementById('home-screen');
  const gamesGrid = document.getElementById('games-grid');
  const playOverlay = document.getElementById('play-overlay');
  const backBtn = document.getElementById('back-btn');
  const loadingState = document.getElementById('loading-state');
  const readyState = document.getElementById('ready-state');
  const loadingEmoji = document.getElementById('loading-emoji');
  const loadingName = document.getElementById('loading-name');
  const progressFill = document.getElementById('progress-fill');
  const readyEmoji = document.getElementById('ready-emoji');
  const readyName = document.getElementById('ready-name');
  const playBtn = document.getElementById('play-btn');

  let playing = false;
  let current = null;
  let progress = 0;
  let timer = null;

  function renderGrid() {
    GAMES.forEach((game, i) => {
      const c = PALETTE[i % PALETTE.length];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      card.style.background = c.bg;
      card.style.boxShadow = `0 8px 18px ${c.shadow}`;
      card.style.animationDelay = `${(i * 0.05).toFixed(2)}s`;
      card.setAttribute('aria-label', `${game.name}, ${game.tag}`);
      card.innerHTML = `
        <div class="game-card-glow"></div>
        <div class="game-card-content">
          <div class="game-icon">${game.emoji}</div>
          <div class="game-name">${game.name}</div>
          <div class="game-tag">${game.tag}</div>
        </div>
      `;
      card.addEventListener('click', () => startGame({ ...game, ...c }));
      gamesGrid.appendChild(card);
    });
  }

  function startGame(game) {
    if (playing) return;
    playing = true;
    current = game;
    progress = 0;

    homeScreen.classList.add('is-hidden');
    playOverlay.style.background = game.bg;
    playOverlay.hidden = false;

    loadingState.hidden = false;
    readyState.hidden = true;
    loadingEmoji.textContent = game.emoji;
    loadingName.textContent = game.name;
    progressFill.style.width = '0%';

    timer = setInterval(() => {
      progress += 12 + Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        progressFill.style.width = '100%';
        clearInterval(timer);
        showReady();
        return;
      }
      progressFill.style.width = `${Math.round(progress)}%`;
    }, 240);
  }

  function showReady() {
    loadingState.hidden = true;
    readyState.hidden = false;
    readyEmoji.textContent = current.emoji;
    readyName.textContent = current.name;
    playBtn.style.color = current.playColor;
    playBtn.disabled = !current.url;
  }

  function goHome() {
    clearInterval(timer);
    playing = false;
    current = null;
    progress = 0;
    playOverlay.hidden = true;
    homeScreen.classList.remove('is-hidden');
  }

  backBtn.addEventListener('click', goHome);

  playBtn.addEventListener('click', () => {
    if (current && current.url) window.location.href = current.url;
  });

  renderGrid();
})();
