(() => {
  const PALETTE = [
    { bg: 'linear-gradient(135deg,#ff8fb1,#ff5e8a)', shadow: 'rgba(255,94,138,.4)', playColor: '#ff5e8a' },
    { bg: 'linear-gradient(135deg,#7ad0ff,#3aa0ff)', shadow: 'rgba(58,160,255,.4)', playColor: '#3aa0ff' },
    { bg: 'linear-gradient(135deg,#ffd166,#ffa62b)', shadow: 'rgba(255,166,43,.4)', playColor: '#f59300' },
    { bg: 'linear-gradient(135deg,#a78bff,#7a5cff)', shadow: 'rgba(122,92,255,.4)', playColor: '#7a5cff' },
    { bg: 'linear-gradient(135deg,#5dd6b0,#22b98a)', shadow: 'rgba(34,185,138,.4)', playColor: '#22b98a' },
  ];

  const GAMES = [
    { emoji: '🚀', name: 'Roket Meluncur', tag: 'Petualangan' },
    { emoji: '🎨', name: 'Ayo Mewarnai', tag: 'Kreatif' },
    { emoji: '🎵', name: 'Piano Ceria', tag: 'Musik' },
    { emoji: '🪐', name: 'Jelajah Planet', tag: 'Petualangan' },
    { emoji: '🖍️', name: 'Gambar Bebas', tag: 'Kreatif' },
    { emoji: '🥁', name: 'Tabuh Drum', tag: 'Musik' },
    { emoji: '⭐', name: 'Kejar Bintang', tag: 'Petualangan' },
    { emoji: '🌈', name: 'Pelangi Warna', tag: 'Kreatif' },
    { emoji: '🎸', name: 'Band Angkasa', tag: 'Musik' },
    { emoji: '👽', name: 'Sahabat Alien', tag: 'Petualangan' },
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

  // Placeholder: in production this launches the actual game.
  playBtn.addEventListener('click', () => {
    console.log('Main Sekarang ditekan untuk:', current && current.name);
  });

  renderGrid();
})();
