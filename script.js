(() => {
  function blockAccidentalZoom() {
    const stopMultiTouch = (event) => {
      if (event.touches && event.touches.length > 1) event.preventDefault();
    };

    document.addEventListener('touchstart', stopMultiTouch, { passive: false });
    document.addEventListener('touchmove', stopMultiTouch, { passive: false });

    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
      document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
    });

    let lastTap = { time: 0, x: 0, y: 0 };
    document.addEventListener('touchend', (event) => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;

      const now = Date.now();
      const distance = Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y);
      if (now - lastTap.time <= 300 && distance < 28) event.preventDefault();

      lastTap = { time: now, x: touch.clientX, y: touch.clientY };
    }, { passive: false });

    document.addEventListener('wheel', (event) => {
      if (event.ctrlKey) event.preventDefault();
    }, { passive: false });
  }

  const GAMES = [
    {
      name: 'Kucing Es Krim',
      tag: 'Arcade',
      tagIcon: '🎮',
      theme: 'theme-pink',
      overlay: 'linear-gradient(145deg, #ff78a5, #e72e73)',
      playColor: '#e72e73',
      spriteX: '0%',
      spriteY: '0%',
      url: 'games/kucing_es_krim/index.html',
    },
    {
      name: 'Gitar Kelinci',
      tag: 'Musik',
      tagIcon: '♫',
      theme: 'theme-blue',
      overlay: 'linear-gradient(145deg, #36c5ff, #0876dc)',
      playColor: '#0876dc',
      spriteX: '33.333%',
      spriteY: '0%',
      url: 'games/konser_kelinci/index.html',
    },
    {
      name: 'K-Pop Hunter Fashion',
      tag: 'Dress-Up',
      tagIcon: '👕',
      theme: 'theme-orange',
      overlay: 'linear-gradient(145deg, #ffd44d, #ed8505)',
      playColor: '#d97200',
      spriteX: '66.667%',
      spriteY: '0%',
      url: 'games/kpop_hunter_fashion/index.html',
    },
    {
      name: 'Telepon Huntrix',
      tag: 'Belajar Angka',
      tagIcon: '🎓',
      theme: 'theme-purple',
      overlay: 'linear-gradient(145deg, #aa7af1, #6240c9)',
      playColor: '#6741d1',
      spriteX: '100%',
      spriteY: '0%',
      url: 'games/telepon_huntrix/index.html',
    },
    {
      name: 'Golden Piano Tiles',
      tag: 'Musik',
      tagIcon: '♫',
      theme: 'theme-teal',
      overlay: 'linear-gradient(145deg, #36d9ce, #078f96)',
      playColor: '#078f96',
      spriteX: '0%',
      spriteY: '100%',
      url: 'games/golden_piano_tiles/index.html',
    },
    {
      name: 'Puzzle Planet',
      tag: 'Puzzle',
      tagIcon: '🧩',
      theme: 'theme-lime',
      overlay: 'linear-gradient(145deg, #c8ec40, #5daf0e)',
      playColor: '#559f0c',
      spriteX: '33.333%',
      spriteY: '100%',
      url: 'games/puzzle_planet/index.html',
    },
    {
      name: 'Tumpuk Hewan',
      tag: 'Keseimbangan',
      tagIcon: '🐾',
      theme: 'theme-green',
      overlay: 'linear-gradient(145deg, #88dd47, #31963c)',
      playColor: '#2e8c39',
      spriteX: '66.667%',
      spriteY: '100%',
      url: 'games/tumpuk_hewan/index.html',
    },
    {
      name: 'Crocodile Dentist',
      tag: 'Tebak Gigi',
      tagIcon: '🦷',
      theme: 'theme-rose',
      overlay: 'linear-gradient(145deg, #ff6e9f, #d92568)',
      playColor: '#d92568',
      spriteX: '100%',
      spriteY: '100%',
      url: 'games/crocodile_dentist/index.html',
    },
  ];

  const homeScreen = document.getElementById('home-screen');
  const gamesGrid = document.getElementById('games-grid');
  const playOverlay = document.getElementById('play-overlay');
  const backButton = document.getElementById('back-btn');
  const menuButton = document.getElementById('menu-button');
  const loadingState = document.getElementById('loading-state');
  const readyState = document.getElementById('ready-state');
  const loadingArt = document.getElementById('loading-art');
  const loadingName = document.getElementById('loading-name');
  const progressFill = document.getElementById('progress-fill');
  const readyArt = document.getElementById('ready-art');
  const readyName = document.getElementById('ready-name');
  const playButton = document.getElementById('play-btn');
  const toast = document.getElementById('toast');

  let playing = false;
  let currentGame = null;
  let progress = 0;
  let progressTimer = null;
  let toastTimer = null;

  function setSprite(element, game) {
    element.style.setProperty('--sprite-x', game.spriteX);
    element.style.setProperty('--sprite-y', game.spriteY);
  }

  function renderGames() {
    const cards = document.createDocumentFragment();

    GAMES.forEach((game, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `game-card ${game.theme}`;
      card.style.setProperty('--index', index);
      card.setAttribute('aria-label', `${game.name}, kategori ${game.tag}`);
      card.innerHTML = `
        <span class="card-star" aria-hidden="true">★</span>
        <span class="game-art-frame" aria-hidden="true">
          <span class="game-sprite" style="--sprite-x: ${game.spriteX}; --sprite-y: ${game.spriteY}"></span>
        </span>
        <span class="game-copy">
          <span class="game-name">${game.name}</span>
          <span class="game-tag"><span class="tag-icon" aria-hidden="true">${game.tagIcon}</span>${game.tag}</span>
        </span>
      `;
      card.addEventListener('click', () => startGame(game));
      cards.appendChild(card);
    });

    gamesGrid.replaceChildren(cards);
  }

  function startGame(game) {
    if (playing) return;

    playing = true;
    currentGame = game;
    progress = 0;

    homeScreen.classList.add('is-hidden');
    playOverlay.style.background = game.overlay;
    playOverlay.hidden = false;
    loadingState.hidden = false;
    readyState.hidden = true;
    loadingName.textContent = game.name;
    progressFill.style.width = '0%';
    setSprite(loadingArt, game);

    progressTimer = window.setInterval(() => {
      progress = Math.min(100, progress + 13 + Math.random() * 12);
      progressFill.style.width = `${Math.round(progress)}%`;

      if (progress >= 100) {
        window.clearInterval(progressTimer);
        window.setTimeout(showReady, 180);
      }
    }, 210);
  }

  function showReady() {
    if (!currentGame) return;

    loadingState.hidden = true;
    readyState.hidden = false;
    readyName.textContent = currentGame.name;
    playButton.style.color = currentGame.playColor;
    playButton.disabled = !currentGame.url;
    setSprite(readyArt, currentGame);
    playButton.focus({ preventScroll: true });
  }

  function goHome() {
    window.clearInterval(progressTimer);
    playing = false;
    currentGame = null;
    progress = 0;
    playOverlay.hidden = true;
    homeScreen.classList.remove('is-hidden');
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  }

  backButton.addEventListener('click', goHome);

  playButton.addEventListener('click', () => {
    if (currentGame && currentGame.url) window.location.href = currentGame.url;
  });

  menuButton.addEventListener('click', () => {
    showToast('Semua permainan seru ada di halaman ini! ✨');
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const destination = item.dataset.nav;
      if (destination === 'Beranda') {
        gamesGrid.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Kamu sudah di Beranda! 🏠');
        return;
      }
      showToast(`${destination} segera hadir! 🌟`);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && playing) goHome();
  });

  blockAccidentalZoom();
  renderGames();
})();
