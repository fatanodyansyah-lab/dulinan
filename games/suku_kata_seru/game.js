(() => {
  const PART1_WORDS = [
    { word: 'gajah', syl: ['ga', 'jah'], emoji: '🐘' },
    { word: 'lebah', syl: ['le', 'bah'], emoji: '🐝' },
    { word: 'melon', syl: ['me', 'lon'], emoji: '🍈' },
    { word: 'kucing', syl: ['ku', 'cing'], emoji: '🐱' },
    { word: 'ikan', syl: ['i', 'kan'], emoji: '🐟' },
    { word: 'bulan', syl: ['bu', 'lan'], emoji: '🌙' },
  ];
  const PART1_ROUNDS = [PART1_WORDS.slice(0, 3), PART1_WORDS.slice(3, 6)];

  const PART2_WORDS = [
    { word: 'buku', syl: ['bu', 'ku'], emoji: '📖' },
    { word: 'baju', syl: ['ba', 'ju'], emoji: '👕' },
    { word: 'kuda', syl: ['ku', 'da'], emoji: '🐴' },
    { word: 'ayam', syl: ['a', 'yam'], emoji: '🐔' },
    { word: 'topi', syl: ['to', 'pi'], emoji: '🎩' },
    { word: 'dasi', syl: ['da', 'si'], emoji: '👔' },
    { word: 'palu', syl: ['pa', 'lu'], emoji: '🔨' },
    { word: 'bola', syl: ['bo', 'la'], emoji: '⚽' },
  ];
  const PART2_ROUNDS = [
    PART2_WORDS.slice(0, 2),
    PART2_WORDS.slice(2, 4),
    PART2_WORDS.slice(4, 6),
    PART2_WORDS.slice(6, 8),
  ];
  const PART2_DISTRACTOR_POOL = ['ka', 'fu', 'me', 'sa', 'ti', 'na', 'ra', 'wo', 'ri', 'ci'];

  const PART3_GRID = [
    ['A', 'F', 'T', 'O', 'P', 'I', 'A', 'G'],
    ['B', 'U', 'K', 'U', 'Q', 'T', 'O', 'B'],
    ['A', 'C', 'W', 'D', 'A', 'S', 'I', 'I'],
    ['P', 'A', 'L', 'U', 'X', 'R', 'F', 'Q'],
  ];
  const PART3_WORDS = ['PALU', 'BUKU', 'TOPI', 'DASI'];

  const screenStart = document.getElementById('screenStart');
  const screenPart1 = document.getElementById('screenPart1');
  const screenPart2 = document.getElementById('screenPart2');
  const screenPart3 = document.getElementById('screenPart3');
  const screenEnd = document.getElementById('screenEnd');
  const screens = [screenStart, screenPart1, screenPart2, screenPart3, screenEnd];

  const startBtn = document.getElementById('startBtn');
  const replayBtn = document.getElementById('replayBtn');
  const soundBtn = document.getElementById('soundBtn');
  const toast = document.getElementById('toast');

  const board1 = document.getElementById('board1');
  const scoreValue1 = document.getElementById('scoreValue1');
  const timerChip1 = document.getElementById('timerChip1');
  const timerValue1 = document.getElementById('timerValue1');

  const board2 = document.getElementById('board2');
  const tileBank2 = document.getElementById('tileBank2');
  const scoreValue2 = document.getElementById('scoreValue2');
  const timerChip2 = document.getElementById('timerChip2');
  const timerValue2 = document.getElementById('timerValue2');

  const grid3 = document.getElementById('grid3');
  const wordList3 = document.getElementById('wordList3');
  const scoreValue3 = document.getElementById('scoreValue3');
  const timerChip3 = document.getElementById('timerChip3');
  const timerValue3 = document.getElementById('timerValue3');

  const endScoreValue = document.getElementById('endScoreValue');
  const endStars = document.getElementById('endStars');
  const confettiLayer = document.getElementById('confettiLayer');

  let soundEnabled = localStorage.getItem('sukuKataSound') !== 'off';
  let audioContext = null;
  let activeUtterance = null;
  let toastTimer = null;

  let totalScore = 0;
  let totalMistakes = 0;

  let part1RoundIdx = 0;
  let part1Remaining = 0;

  let part2RoundIdx = 0;
  let part2Remaining = 0;
  let wordFillState = {};

  let selecting = false;
  let selStart = null;
  let selCells = [];
  let foundWords = new Set();

  // ---------- Utilities ----------

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function showScreen(target) {
    screens.forEach((screen) => { screen.hidden = screen !== target; });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1600);
  }

  function vibrate(pattern) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }

  // ---------- Audio & voiceover ----------

  function ensureAudioContext() {
    if (!audioContext) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) audioContext = new Context();
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function makeTone(frequency, startOffset, duration, gainValue, type = 'sine') {
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
    if (type === 'tap') {
      makeTone(440, 0, .09, .03, 'sine');
    } else if (type === 'correct') {
      makeTone(523.25, 0, .14, .055, 'triangle');
      makeTone(659.25, .1, .15, .05, 'triangle');
      makeTone(783.99, .2, .19, .045, 'triangle');
    } else if (type === 'wrong') {
      makeTone(210, 0, .13, .035, 'sine');
      makeTone(180, .11, .17, .03, 'sine');
    } else if (type === 'win') {
      makeTone(659.25, 0, .12, .035, 'triangle');
      makeTone(783.99, .1, .12, .035, 'triangle');
      makeTone(1046.5, .2, .12, .035, 'triangle');
      makeTone(1318.5, .32, .26, .045, 'triangle');
    }
  }

  function cancelSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    activeUtterance = null;
  }

  function speakText(text) {
    if (!soundEnabled || !text) return;
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = .8;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === 'id-id')
      || voices.find((voice) => voice.lang.toLowerCase().startsWith('id'))
      || null;

    utterance.addEventListener('end', () => { if (activeUtterance === utterance) activeUtterance = null; });
    utterance.addEventListener('error', () => { if (activeUtterance === utterance) activeUtterance = null; });

    cancelSpeech();
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('sukuKataSound', soundEnabled ? 'on' : 'off');
    soundBtn.setAttribute('aria-pressed', String(!soundEnabled));
    soundBtn.querySelector('span').textContent = soundEnabled ? '🔊' : '🔇';
    if (!soundEnabled) cancelSpeech();
  });
  soundBtn.setAttribute('aria-pressed', String(!soundEnabled));
  soundBtn.querySelector('span').textContent = soundEnabled ? '🔊' : '🔇';

  // ---------- Timer ----------

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function stopTimer(chipEl) {
    const id = chipEl.dataset.timerId;
    if (id) {
      window.clearInterval(Number(id));
      delete chipEl.dataset.timerId;
    }
    chipEl.classList.remove('is-low');
  }

  function startTimer(chipEl, valueEl, seconds) {
    stopTimer(chipEl);
    let remaining = seconds;
    valueEl.textContent = formatTime(remaining);
    const id = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) remaining = seconds;
      valueEl.textContent = formatTime(remaining);
      chipEl.classList.toggle('is-low', remaining <= 10);
    }, 1000);
    chipEl.dataset.timerId = String(id);
  }

  // ---------- Score ----------

  function updateScore(delta) {
    totalScore += delta;
    [scoreValue1, scoreValue2, scoreValue3].forEach((el) => { el.textContent = String(totalScore); });
  }

  // ---------- Generic drag & drop ----------

  function attachDrag(el, { onDrop, dropSelector = '[data-drop]' }) {
    el.style.touchAction = 'none';
    let hoverZone = null;

    el.addEventListener('pointerdown', (e) => {
      if (el.dataset.locked === '1') return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;

      try { el.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
      el.classList.add('dragging');
      el.style.position = 'relative';
      el.style.zIndex = '60';
      el.style.transition = 'none';

      function findZone(x, y) {
        el.style.pointerEvents = 'none';
        const target = document.elementFromPoint(x, y);
        el.style.pointerEvents = '';
        return target ? target.closest(dropSelector) : null;
      }

      function move(ev) {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        const zone = findZone(ev.clientX, ev.clientY);
        if (zone !== hoverZone) {
          if (hoverZone) hoverZone.classList.remove('is-hover');
          if (zone) zone.classList.add('is-hover');
          hoverZone = zone;
        }
      }

      function finish(ev) {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', finish);
        el.classList.remove('dragging');
        try { el.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
        if (hoverZone) { hoverZone.classList.remove('is-hover'); hoverZone = null; }

        const zone = findZone(ev.clientX, ev.clientY);
        const success = zone ? onDrop(el, zone) : false;

        if (!success) {
          el.style.transition = 'transform .25s ease';
          el.style.transform = 'translate(0,0)';
          el.classList.add('shake-back');
          setTimeout(() => {
            el.classList.remove('shake-back');
            el.style.transition = '';
            el.style.position = '';
            el.style.zIndex = '';
          }, 260);
        }
      }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    });
  }

  // ---------- Bagian 1: Sambung Suku Kata ----------

  function loadPart1Round(idx) {
    const words = PART1_ROUNDS[idx];
    board1.innerHTML = '';
    part1Remaining = words.length;

    words.forEach((w) => {
      const row = document.createElement('div');
      row.className = 'connect-row';

      const pic = document.createElement('button');
      pic.type = 'button';
      pic.className = 'connect-picture';
      pic.textContent = w.emoji;
      pic.setAttribute('aria-label', `Dengar kata ${w.word}`);
      pic.addEventListener('click', () => speakText(w.word));

      const slots = document.createElement('div');
      slots.className = 'connect-slots';

      const firstPiece = document.createElement('button');
      firstPiece.type = 'button';
      firstPiece.className = 'syl-piece piece-first';
      firstPiece.textContent = w.syl[0];
      firstPiece.addEventListener('pointerdown', () => speakText(w.syl[0]));

      const dropSlot = document.createElement('div');
      dropSlot.className = 'drop-slot';
      dropSlot.dataset.drop = 'part1';
      dropSlot.dataset.word = w.word;

      slots.append(firstPiece, dropSlot);
      row.append(pic, slots);
      board1.appendChild(row);
    });

    const bank = document.createElement('div');
    bank.className = 'bank-second';
    shuffle(words).forEach((w) => {
      const piece = document.createElement('button');
      piece.type = 'button';
      piece.className = 'syl-piece piece-second';
      piece.textContent = w.syl[1];
      piece.addEventListener('pointerdown', () => speakText(w.syl[1]));
      attachDrag(piece, { onDrop: (el, zone) => handlePart1Drop(el, zone, w) });
      bank.appendChild(piece);
    });
    board1.appendChild(bank);

    startTimer(timerChip1, timerValue1, 120);
  }

  function handlePart1Drop(el, zone, w) {
    if (zone.classList.contains('is-filled')) return false;
    if (zone.dataset.word !== w.word) {
      zone.classList.add('is-wrong');
      setTimeout(() => zone.classList.remove('is-wrong'), 350);
      playTone('wrong');
      totalMistakes += 1;
      return false;
    }

    zone.classList.add('is-filled');
    el.style.transform = '';
    el.style.position = '';
    el.style.zIndex = '';
    el.dataset.locked = '1';
    zone.appendChild(el);
    el.classList.add('pop-in', 'is-locked');

    playTone('correct');
    speakText(w.word);
    vibrate(30);
    updateScore(10);

    part1Remaining -= 1;
    if (part1Remaining <= 0) {
      stopTimer(timerChip1);
      setTimeout(() => {
        part1RoundIdx += 1;
        if (part1RoundIdx < PART1_ROUNDS.length) loadPart1Round(part1RoundIdx);
        else goToPart2();
      }, 700);
    }
    return true;
  }

  function goToPart1() {
    showScreen(screenPart1);
    showToast('Bagian 1: Sambung Suku Kata! 🧩');
    part1RoundIdx = 0;
    loadPart1Round(0);
  }

  // ---------- Bagian 2: Susun Kata ----------

  function loadPart2Round(idx) {
    const words = PART2_ROUNDS[idx];
    board2.innerHTML = '';
    tileBank2.innerHTML = '';
    wordFillState = {};
    part2Remaining = words.length;

    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'fill-cards';
    const bankSyllables = [];

    words.forEach((w) => {
      const card = document.createElement('div');
      card.className = 'fill-card';

      const pic = document.createElement('button');
      pic.type = 'button';
      pic.className = 'fill-picture';
      pic.textContent = w.emoji;
      pic.setAttribute('aria-label', `Dengar kata ${w.word}`);
      pic.addEventListener('click', () => speakText(w.word));

      const blanksWrap = document.createElement('div');
      blanksWrap.className = 'fill-blanks';
      w.syl.forEach((syl) => {
        const slot = document.createElement('div');
        slot.className = 'blank-slot';
        slot.dataset.drop = 'part2';
        slot.dataset.word = w.word;
        slot.dataset.syl = syl;
        slot.dataset.filled = '0';
        blanksWrap.appendChild(slot);
        bankSyllables.push({ syl, word: w.word });
      });

      card.append(pic, blanksWrap);
      cardsWrap.appendChild(card);
      wordFillState[w.word] = { total: w.syl.length, filled: 0 };
    });
    board2.appendChild(cardsWrap);

    const usedSyllables = new Set(bankSyllables.map((item) => item.syl));
    const distractors = shuffle(PART2_DISTRACTOR_POOL.filter((d) => !usedSyllables.has(d))).slice(0, 3);
    const bankItems = shuffle([
      ...bankSyllables,
      ...distractors.map((syl) => ({ syl, word: null })),
    ]);

    bankItems.forEach((item) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'syl-tile';
      tile.textContent = item.syl;
      tile.addEventListener('pointerdown', () => speakText(item.syl));
      attachDrag(tile, { onDrop: (el, zone) => handlePart2Drop(el, zone, item) });
      tileBank2.appendChild(tile);
    });

    startTimer(timerChip2, timerValue2, 110);
  }

  function handlePart2Drop(el, zone, item) {
    if (zone.dataset.filled === '1') return false;
    if (zone.dataset.syl !== item.syl) {
      zone.classList.add('is-wrong');
      setTimeout(() => zone.classList.remove('is-wrong'), 350);
      playTone('wrong');
      totalMistakes += 1;
      return false;
    }

    zone.dataset.filled = '1';
    const placed = document.createElement('div');
    placed.className = 'placed-tile';
    placed.textContent = item.syl;
    zone.innerHTML = '';
    zone.appendChild(placed);

    el.style.transform = '';
    el.style.position = '';
    el.style.zIndex = '';
    el.dataset.locked = '1';
    el.classList.add('is-used');

    const word = zone.dataset.word;
    const state = wordFillState[word];
    state.filled += 1;

    if (state.filled >= state.total) {
      playTone('correct');
      speakText(word);
      vibrate(30);
      updateScore(10);

      part2Remaining -= 1;
      if (part2Remaining <= 0) {
        stopTimer(timerChip2);
        setTimeout(() => {
          part2RoundIdx += 1;
          if (part2RoundIdx < PART2_ROUNDS.length) loadPart2Round(part2RoundIdx);
          else goToPart3();
        }, 700);
      }
    }
    return true;
  }

  function goToPart2() {
    showScreen(screenPart2);
    showToast('Bagian 2: Susun Kata! 🔤');
    part2RoundIdx = 0;
    loadPart2Round(0);
  }

  // ---------- Bagian 3: Cari Kata ----------

  function cellEl(r, c) {
    return grid3.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  function computeLine(start, current) {
    const dr = current.r - start.r;
    const dc = current.c - start.c;
    let stepR = 0;
    let stepC = 0;
    if (Math.abs(dr) >= Math.abs(dc)) {
      stepR = dr === 0 ? 0 : Math.sign(dr);
    } else {
      stepC = dc === 0 ? 0 : Math.sign(dc);
    }
    const length = stepR !== 0 ? Math.abs(dr) : Math.abs(dc);
    const cells = [];
    for (let i = 0; i <= length; i++) {
      cells.push({ r: start.r + stepR * i, c: start.c + stepC * i });
    }
    return cells;
  }

  function clearSelectingClasses() {
    grid3.querySelectorAll('.grid-cell.is-selecting').forEach((el) => el.classList.remove('is-selecting'));
  }

  function updateSelection(r, c) {
    clearSelectingClasses();
    const path = computeLine(selStart, { r, c });
    selCells = path
      .map((p) => ({ ...p, el: cellEl(p.r, p.c) }))
      .filter((p) => p.el);
    selCells.forEach((p) => {
      if (!p.el.classList.contains('is-found')) p.el.classList.add('is-selecting');
    });
  }

  function markWordFound(word) {
    const item = wordList3.querySelector(`[data-word="${word}"]`);
    if (item) item.classList.add('is-found');
  }

  function finishSelection(e) {
    if (!selecting) return;
    selecting = false;
    try { grid3.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

    const letters = selCells.map((p) => PART3_GRID[p.r][p.c]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = PART3_WORDS.find((w) => (w === letters || w === reversed) && !foundWords.has(w));

    clearSelectingClasses();

    if (match) {
      foundWords.add(match);
      selCells.forEach((p) => p.el.classList.add('is-found'));
      markWordFound(match);
      playTone('correct');
      speakText(match);
      vibrate(30);
      updateScore(15);

      if (foundWords.size >= PART3_WORDS.length) {
        stopTimer(timerChip3);
        setTimeout(goToEnd, 900);
      }
    } else if (selCells.length > 1) {
      totalMistakes += 1;
      playTone('wrong');
      selCells.forEach((p) => {
        if (p.el.classList.contains('is-found')) return;
        p.el.classList.add('is-wrong');
        setTimeout(() => p.el.classList.remove('is-wrong'), 300);
      });
    }

    selCells = [];
    selStart = null;
  }

  grid3.addEventListener('pointermove', (e) => {
    if (!selecting) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const cellTarget = target && target.closest('.grid-cell');
    if (!cellTarget) return;
    updateSelection(Number(cellTarget.dataset.r), Number(cellTarget.dataset.c));
  });
  grid3.addEventListener('pointerup', finishSelection);
  grid3.addEventListener('pointercancel', finishSelection);

  function renderWordList3() {
    wordList3.innerHTML = '';
    PART3_WORDS.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'wl-item';
      span.dataset.word = w;
      span.textContent = w + (i < PART3_WORDS.length - 1 ? ',' : '');
      wordList3.appendChild(span);
    });
  }

  function goToPart3() {
    showScreen(screenPart3);
    showToast('Bagian 3: Cari Kata! 🔍');
    foundWords = new Set();
    grid3.innerHTML = '';

    PART3_GRID.forEach((row, r) => {
      row.forEach((letter, c) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'grid-cell';
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.textContent = letter;
        cell.addEventListener('pointerdown', (e) => {
          speakText(letter);
          selecting = true;
          selStart = { r, c };
          updateSelection(r, c);
          try { grid3.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          e.preventDefault();
        });
        grid3.appendChild(cell);
      });
    });

    renderWordList3();
    startTimer(timerChip3, timerValue3, 100);
  }

  // ---------- Layar akhir ----------

  function launchConfetti() {
    confettiLayer.innerHTML = '';
    const colors = ['#ff4fa0', '#ffd83d', '#35c96b', '#7b3fe4', '#6ad0ff'];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('i');
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = `${Math.random() * .5}s`;
      confettiLayer.appendChild(el);
    }
  }

  function goToEnd() {
    showScreen(screenEnd);
    endScoreValue.textContent = String(totalScore);
    const stars = totalMistakes === 0 ? 3 : totalMistakes <= 5 ? 2 : 1;
    endStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    playTone('win');
    vibrate([30, 60, 30, 60, 60]);
    launchConfetti();
  }

  function resetAll() {
    cancelSpeech();
    [timerChip1, timerChip2, timerChip3].forEach(stopTimer);
    totalScore = 0;
    totalMistakes = 0;
    [scoreValue1, scoreValue2, scoreValue3].forEach((el) => { el.textContent = '0'; });
    part1RoundIdx = 0;
    part2RoundIdx = 0;
  }

  // ---------- Navigasi ----------

  startBtn.addEventListener('click', () => {
    playTone('tap');
    goToPart1();
  });

  replayBtn.addEventListener('click', () => {
    playTone('tap');
    resetAll();
    showScreen(screenStart);
  });
})();
