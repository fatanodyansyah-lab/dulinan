(() => {
  'use strict';

  // ---------- config / tokens ----------
  const GROUP_NAME = 'LUNARIX';
  const CONFETTI = true;
  const NEON = '#ff5fd2';

  const GIRLS = [
    { name: 'Rumi', skin: '#f6d7bd', skinHi: '#fbe8d4', hair: '#8b3fd6', hairHi: '#b070f0', hairDk: '#63249e', iris: '#b06a2c', lip: '#d9707f', color: '#c98bff', blush: '#f5a8b0' },
    { name: 'Mira', skin: '#e8bd98', skinHi: '#f4d4b2', hair: '#2f9de0', hairHi: '#63c0f2', hairDk: '#1d6fa8', iris: '#2f6fb0', lip: '#cf6a5e', color: '#5ef2e8', blush: '#e89890' },
    { name: 'Zoey', skin: '#f9e0c8', skinHi: '#fdeeda', hair: '#ff5fa2', hairHi: '#ff8fc2', hairDk: '#d63a7e', iris: '#7a4fd0', lip: '#e0708f', color: '#ff9dd0', blush: '#f8b0bd' }
  ];

  const CATS = [
    { key: 'rambut', label: 'Rambut', icon: '💇‍♀️', crop: '38 -10 124 150', items: ['Kepang Galaxy', 'Twin Buns', 'Bob Chic', 'Ponytail Idol'] },
    { key: 'atasan', label: 'Atasan', icon: '👕', crop: '56 58 88 78', items: ['Crop Tee', 'Hoodie Street', 'Top Glitter', 'Jaket Biker'] },
    { key: 'bawahan', label: 'Bawahan', icon: '👖', crop: '56 112 88 150', items: ['Jeans Denim', 'Rok Plisket', 'Celana Pendek', 'Cargo Pants'] },
    { key: 'gaun', label: 'Gaun', icon: '👗', crop: '54 62 92 138', items: ['Gaun A-Line', 'Gaun Golden', 'Gaun Encore', 'Gaun Neon'] },
    { key: 'sepatu', label: 'Sepatu', icon: '👟', crop: '68 240 64 40', items: ['Sneakers Putih', 'Boots Panggung', 'High Heels', 'Platform Glow'] },
    { key: 'anting', label: 'Anting', icon: '💎', crop: '58 40 84 32', items: ['Anting Hoop', 'Anting Bintang', 'Anting Petir', 'Anting Juntai'] },
    { key: 'kalung', label: 'Kalung', icon: '📿', crop: '76 56 48 34', items: ['Choker Permata', 'Kalung Mutiara', 'Kalung V Gold', 'Pita Manis'] },
    { key: 'kacamata', label: 'Kacamata', icon: '🕶️', crop: '66 28 68 28', items: ['Kacamata Bulat', 'Sunglasses Cool', 'Kacamata Hati', 'Visor Neon'] },
    { key: 'mik', label: 'Mic', icon: '🎤', crop: '', items: ['Mic Genggam', 'Headset Idol', 'Earpiece Bling', 'Mic Golden'] }
  ];
  const MIC_CROPS = ['104 116 44 54', '58 -4 84 78', '110 34 32 32', '50 116 44 54'];

  // ---------- state ----------
  const state = {
    screen: 'start', // start | dress | stage
    girl: 0,
    cat: 'rambut',
    outfits: [{}, {}, {}],
    music: false,
    fromStage: false
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const elStart = $('screen-start');
  const elDress = $('screen-dress');
  const elStage = $('screen-stage');
  const elStartMinis = $('start-minis');
  const elGirlTabs = $('girl-tabs');
  const elDressDoll = $('dress-doll');
  const elCatTabs = $('cat-tabs');
  const elItemGrid = $('item-grid');
  const elBtnNext = $('btn-next');
  const elBtnMusicDress = $('btn-music-dress');
  const elBtnMusicStage = $('btn-music-stage');
  const elStageDolls = $('stage-dolls');
  const elConfetti = $('confetti-layer');
  const elGroupName = $('group-name');

  elGroupName.textContent = GROUP_NAME;
  elGroupName.style.textShadow = `0 0 26px ${NEON}, 0 4px 0 rgba(0,0,0,.35)`;
  document.querySelector('.title-start').style.textShadow = `0 0 24px ${NEON}, 0 4px 0 rgba(0,0,0,.3)`;

  // ---------- sound (Web Audio, no files) ----------
  let audioCtx = null;
  let musicTimer = null;

  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function blip(f, v) {
    try {
      const c = ctx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = f || 600;
      g.gain.setValueAtTime(v || 0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.22);
    } catch (e) { /* ignore */ }
  }

  function fanfare() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => blip(f, 0.12), i * 130));
  }

  function setMusic(on) {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    state.music = !!on;
    if (state.music) {
      const notes = [523, 659, 587, 784, 659, 880, 784, 659];
      let i = 0;
      musicTimer = setInterval(() => blip(notes[i++ % notes.length], 0.05), 260);
    }
    const label = state.music ? '♪ Musik ON' : '♪ Musik OFF';
    elBtnMusicDress.textContent = label;
    elBtnMusicStage.textContent = label;
  }

  function toggleMusic() {
    setMusic(!state.music);
  }

  // ---------- SVG helpers ----------
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function tag(name, attrs, children) {
    let a = '';
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        if (attrs[k] == null || attrs[k] === false) continue;
        const key = k === 'strokeWidth' ? 'stroke-width'
          : k === 'strokeLinecap' ? 'stroke-linecap'
          : k === 'strokeDasharray' ? 'stroke-dasharray'
          : k === 'stopColor' ? 'stop-color'
          : k === 'fillRule' ? 'fill-rule'
          : k === 'clipPath' ? 'clip-path'
          : k === 'preserveAspectRatio' ? 'preserveAspectRatio'
          : k;
        a += ` ${key}="${esc(attrs[k])}"`;
      }
    }
    if (children == null || children === '') return `<${name}${a}/>`;
    return `<${name}${a}>${Array.isArray(children) ? children.join('') : children}</${name}>`;
  }

  function grads(p, g) {
    return tag('defs', null, [
      tag('radialGradient', { id: p + 'sk', cx: '38%', cy: '28%', r: '80%' }, [
        tag('stop', { offset: '0%', stopColor: g.skinHi }),
        tag('stop', { offset: '70%', stopColor: g.skin }),
        tag('stop', { offset: '100%', stopColor: g.skin })
      ]),
      tag('linearGradient', { id: p + 'hr', x1: '0', y1: '0', x2: '0.25', y2: '1' }, [
        tag('stop', { offset: '0%', stopColor: g.hairHi }),
        tag('stop', { offset: '55%', stopColor: g.hair }),
        tag('stop', { offset: '100%', stopColor: g.hairDk })
      ])
    ]);
  }

  function eye(g, ex, s) {
    return [
      tag('ellipse', { cx: ex, cy: 44, rx: 4.4, ry: 5.4, fill: '#fff' }),
      tag('ellipse', { cx: ex + s * 0.4, cy: 44.6, rx: 3.1, ry: 4.4, fill: g.iris }),
      tag('ellipse', { cx: ex + s * 0.4, cy: 44.8, rx: 1.5, ry: 2.5, fill: '#241420' }),
      tag('circle', { cx: ex + s * 1.4, cy: 42.2, r: 1.15, fill: '#fff' }),
      tag('circle', { cx: ex - s * 1.2, cy: 46.4, r: 0.6, fill: 'rgba(255,255,255,.85)' }),
      tag('path', {
        d: `M${ex - s * 4.4} 40.4 Q${ex} 37 ${ex + s * 4.6} 40 L${ex + s * 6.8} 38.4`,
        stroke: '#241420', strokeWidth: 2.1, fill: 'none', strokeLinecap: 'round'
      }),
      tag('path', {
        d: `M${ex - s * 2.8} 49.4 Q${ex} 50.8 ${ex + s * 3} 49.2`,
        stroke: 'rgba(36,20,32,.4)', strokeWidth: 1.1, fill: 'none', strokeLinecap: 'round'
      })
    ].join('');
  }

  function hairEls(i, col) {
    const bangs = tag('path', {
      d: 'M74 44 Q72 12 100 10 Q128 12 126 44 Q116 24 100 26 Q84 24 74 44',
      fill: col
    });
    if (i === 0) {
      const chain = [[129, 70, 9], [131, 88, 8.5], [130, 106, 8], [128, 124, 7.5], [126, 142, 7], [124, 158, 6.5]]
        .map((p) => tag('circle', { cx: p[0], cy: p[1], r: p[2], fill: col })).join('');
      return {
        back: tag('circle', { cx: 100, cy: 38, r: 29, fill: col }) + chain +
          tag('path', { d: 'M120 162 L130 176 L116 172 Z', fill: '#ffd34d' }),
        front: bangs + tag('circle', { cx: 100, cy: 8, r: 10, fill: col })
      };
    }
    if (i === 1) {
      return {
        back: tag('circle', { cx: 100, cy: 40, r: 28, fill: col }),
        front: bangs +
          tag('circle', { cx: 73, cy: 14, r: 11, fill: col }) +
          tag('circle', { cx: 127, cy: 14, r: 11, fill: col }) +
          tag('circle', { cx: 73, cy: 14, r: 4.5, fill: 'rgba(255,255,255,.35)' }) +
          tag('circle', { cx: 127, cy: 14, r: 4.5, fill: 'rgba(255,255,255,.35)' })
      };
    }
    if (i === 2) {
      return {
        back: tag('circle', { cx: 100, cy: 40, r: 30, fill: col }) +
          tag('rect', { x: 68, y: 36, width: 13, height: 42, rx: 6.5, fill: col }) +
          tag('rect', { x: 119, y: 36, width: 13, height: 42, rx: 6.5, fill: col }),
        front: bangs
      };
    }
    const tail = [[128, 36, 11], [134, 64, 10], [131, 92, 9], [127, 118, 8], [123, 140, 7]]
      .map((p) => tag('ellipse', { cx: p[0], cy: p[1], rx: p[2], ry: p[2] + 4, fill: col })).join('');
    return {
      back: tag('circle', { cx: 100, cy: 38, r: 29, fill: col }) + tail,
      front: bangs + tag('circle', { cx: 121, cy: 22, r: 5, fill: '#ffd34d' })
    };
  }

  function topEls(i) {
    if (i === 0) {
      return [
        tag('rect', { x: 63, y: 76, width: 17, height: 20, rx: 7, fill: '#ffd9ec' }),
        tag('rect', { x: 120, y: 76, width: 17, height: 20, rx: 7, fill: '#ffd9ec' }),
        tag('rect', { x: 78, y: 72, width: 44, height: 34, rx: 10, fill: '#ffeef7' }),
        tag('circle', { cx: 100, cy: 89, r: 5, fill: '#ff5fd2' })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('rect', { x: 63, y: 76, width: 17, height: 62, rx: 7, fill: '#7c4dff' }),
        tag('rect', { x: 120, y: 76, width: 17, height: 62, rx: 7, fill: '#7c4dff' }),
        tag('rect', { x: 76, y: 70, width: 48, height: 56, rx: 13, fill: '#8a5cff' }),
        tag('rect', { x: 86, y: 106, width: 28, height: 14, rx: 7, fill: '#6a3de6' }),
        tag('ellipse', { cx: 100, cy: 73, rx: 12, ry: 5, fill: '#6a3de6' }),
        tag('path', { d: 'M95 77 L95 89 M105 77 L105 89', stroke: '#ffd34d', strokeWidth: 2.2, strokeLinecap: 'round' })
      ].join('');
    }
    if (i === 2) {
      return [
        tag('rect', { x: 85, y: 66, width: 5, height: 10, rx: 2.5, fill: '#ffcf3f' }),
        tag('rect', { x: 110, y: 66, width: 5, height: 10, rx: 2.5, fill: '#ffcf3f' }),
        tag('rect', { x: 78, y: 74, width: 44, height: 32, rx: 9, fill: '#ffd34d' }),
        tag('circle', { cx: 88, cy: 84, r: 2, fill: '#fff' }),
        tag('circle', { cx: 108, cy: 92, r: 2, fill: '#fff' }),
        tag('circle', { cx: 98, cy: 100, r: 1.7, fill: '#fff' }),
        tag('circle', { cx: 112, cy: 80, r: 1.7, fill: '#fff' })
      ].join('');
    }
    return [
      tag('rect', { x: 62, y: 74, width: 17, height: 56, rx: 7, fill: '#1d1a26' }),
      tag('rect', { x: 121, y: 74, width: 17, height: 56, rx: 7, fill: '#1d1a26' }),
      tag('rect', { x: 80, y: 72, width: 40, height: 36, rx: 9, fill: '#fff' }),
      tag('rect', { x: 70, y: 70, width: 17, height: 52, rx: 8, fill: '#1d1a26' }),
      tag('rect', { x: 113, y: 70, width: 17, height: 52, rx: 8, fill: '#1d1a26' }),
      tag('path', { d: 'M100 74 L100 108', stroke: '#b8b8cc', strokeWidth: 2, strokeDasharray: '3 2' }),
      tag('path', { d: 'M88 70 L96 78 L88 80 Z', fill: '#0e0c14' }),
      tag('path', { d: 'M112 70 L104 78 L112 80 Z', fill: '#0e0c14' })
    ].join('');
  }

  function bottomEls(i) {
    if (i === 0) {
      return [
        tag('rect', { x: 80, y: 124, width: 40, height: 10, rx: 4, fill: '#3e6fb0' }),
        tag('rect', { x: 84, y: 130, width: 15, height: 116, rx: 7, fill: '#4d82c8' }),
        tag('rect', { x: 101, y: 130, width: 15, height: 116, rx: 7, fill: '#4d82c8' }),
        tag('rect', { x: 84, y: 236, width: 15, height: 10, rx: 4, fill: '#a8c8ee' }),
        tag('rect', { x: 101, y: 236, width: 15, height: 10, rx: 4, fill: '#a8c8ee' })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('path', { d: 'M80 124 L120 124 L134 168 L66 168 Z', fill: '#ff5fa2' }),
        tag('path', { d: 'M89 128 L82 164 M100 128 L100 166 M111 128 L118 164', stroke: '#e0417f', strokeWidth: 2 }),
        tag('rect', { x: 78, y: 120, width: 44, height: 8, rx: 4, fill: '#e0417f' })
      ].join('');
    }
    if (i === 2) {
      return [
        tag('rect', { x: 80, y: 122, width: 40, height: 9, rx: 4, fill: '#43689c' }),
        tag('rect', { x: 83, y: 128, width: 16, height: 33, rx: 7, fill: '#5b8fd0' }),
        tag('rect', { x: 101, y: 128, width: 16, height: 33, rx: 7, fill: '#5b8fd0' }),
        tag('rect', { x: 83, y: 155, width: 16, height: 6, rx: 3, fill: '#a8c8ee' }),
        tag('rect', { x: 101, y: 155, width: 16, height: 6, rx: 3, fill: '#a8c8ee' })
      ].join('');
    }
    return [
      tag('rect', { x: 79, y: 123, width: 42, height: 9, rx: 4, fill: '#5e6a42' }),
      tag('rect', { x: 82, y: 129, width: 17, height: 118, rx: 8, fill: '#7d8a5a' }),
      tag('rect', { x: 101, y: 129, width: 17, height: 118, rx: 8, fill: '#7d8a5a' }),
      tag('rect', { x: 85, y: 172, width: 12, height: 12, rx: 3, fill: '#5e6a42' }),
      tag('rect', { x: 104, y: 172, width: 12, height: 12, rx: 3, fill: '#5e6a42' })
    ].join('');
  }

  function gaunEls(i) {
    if (i === 0) {
      return [
        tag('rect', { x: 81, y: 70, width: 38, height: 34, rx: 10, fill: '#ff8ac2' }),
        tag('path', { d: 'M81 100 L119 100 L136 190 L64 190 Z', fill: '#ff8ac2' }),
        tag('rect', { x: 77, y: 97, width: 46, height: 8, rx: 4, fill: '#fff' })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('rect', { x: 81, y: 70, width: 38, height: 34, rx: 10, fill: '#ffcf3f' }),
        tag('path', { d: 'M81 100 L119 100 L136 190 L64 190 Z', fill: '#ffcf3f' }),
        tag('rect', { x: 77, y: 97, width: 46, height: 7, rx: 3.5, fill: '#e0a616' }),
        tag('circle', { cx: 90, cy: 130, r: 2.2, fill: '#fff' }),
        tag('circle', { cx: 112, cy: 150, r: 2.2, fill: '#fff' }),
        tag('circle', { cx: 98, cy: 170, r: 1.8, fill: '#fff' }),
        tag('circle', { cx: 120, cy: 120, r: 1.8, fill: '#fff' }),
        tag('circle', { cx: 84, cy: 158, r: 1.6, fill: '#fff' })
      ].join('');
    }
    if (i === 2) {
      return [
        tag('rect', { x: 81, y: 70, width: 38, height: 42, rx: 10, fill: '#151223' }),
        tag('ellipse', { cx: 100, cy: 130, rx: 30, ry: 14, fill: '#231d3a', stroke: '#8b3fd6', strokeWidth: 1.5 }),
        tag('ellipse', { cx: 100, cy: 148, rx: 36, ry: 14, fill: '#231d3a', stroke: '#8b3fd6', strokeWidth: 1.5 }),
        tag('ellipse', { cx: 100, cy: 164, rx: 42, ry: 14, fill: '#231d3a', stroke: '#8b3fd6', strokeWidth: 1.5 }),
        tag('circle', { cx: 100, cy: 86, r: 4.5, fill: '#ff5fd2' })
      ].join('');
    }
    return [
      tag('rect', { x: 81, y: 70, width: 38, height: 34, rx: 10, fill: '#5ef2e8' }),
      tag('path', { d: 'M81 100 L119 100 L132 184 L68 184 Z', fill: '#b45ef2' }),
      tag('rect', { x: 77, y: 97, width: 46, height: 7, rx: 3.5, fill: '#3adbd0' }),
      tag('path', { d: 'M68 184 L79 172 L90 184 L101 172 L112 184 L123 172 L132 184', stroke: '#5ef2e8', strokeWidth: 3, fill: 'none' })
    ].join('');
  }

  function shoesEls(i) {
    if (i === 0) {
      return [
        tag('path', { d: 'M78 250 L98 250 L98 260 Q98 264 90 264 L78 264 Q75 264 75 260 Z', fill: '#fff' }),
        tag('path', { d: 'M102 250 L122 250 L122 260 Q122 264 119 264 L110 264 Q102 264 102 260 Z', fill: '#fff' }),
        tag('rect', { x: 75, y: 261, width: 24, height: 4, rx: 2, fill: '#ff5fd2' }),
        tag('rect', { x: 101, y: 261, width: 24, height: 4, rx: 2, fill: '#ff5fd2' })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('rect', { x: 82, y: 196, width: 19, height: 66, rx: 7, fill: '#2b2140' }),
        tag('rect', { x: 100, y: 196, width: 19, height: 66, rx: 7, fill: '#2b2140' }),
        tag('path', { d: 'M82 258 L101 258 L101 262 Q101 265 96 265 L82 265 Z', fill: '#1a1428' }),
        tag('path', { d: 'M100 258 L119 258 L119 265 L105 265 Q100 265 100 262 Z', fill: '#1a1428' }),
        tag('rect', { x: 82, y: 224, width: 19, height: 6, fill: '#e0245e' }),
        tag('rect', { x: 100, y: 224, width: 19, height: 6, fill: '#e0245e' }),
        tag('circle', { cx: 91.5, cy: 212, r: 2.6, fill: '#ffd34d' }),
        tag('circle', { cx: 109.5, cy: 212, r: 2.6, fill: '#ffd34d' })
      ].join('');
    }
    if (i === 2) {
      return [
        tag('path', { d: 'M78 254 L96 254 L98 262 Q98 265 90 265 L78 265 Z', fill: '#e0245e' }),
        tag('path', { d: 'M104 254 L122 254 L122 265 L110 265 Q102 265 102 262 Z', fill: '#e0245e' }),
        tag('rect', { x: 89, y: 254, width: 4, height: 9, fill: '#c01d4e' }),
        tag('rect', { x: 107, y: 254, width: 4, height: 9, fill: '#c01d4e' })
      ].join('');
    }
    return [
      tag('rect', { x: 82, y: 244, width: 18, height: 12, rx: 4, fill: '#8b3fd6' }),
      tag('rect', { x: 100, y: 244, width: 18, height: 12, rx: 4, fill: '#8b3fd6' }),
      tag('path', { d: 'M78 254 L100 254 L100 262 Q100 265 92 265 L78 265 Z', fill: '#7a2fc5' }),
      tag('path', { d: 'M100 254 L122 254 L122 265 L108 265 Q100 265 100 262 Z', fill: '#7a2fc5' }),
      tag('rect', { x: 76, y: 262, width: 25, height: 6, rx: 3, fill: '#5ef2e8' }),
      tag('rect', { x: 99, y: 262, width: 25, height: 6, rx: 3, fill: '#5ef2e8' })
    ].join('');
  }

  function bolt(x) {
    return `M${x} 48 L${x + 5} 48 L${x + 1.5} 55 L${x + 6} 55 L${x - 2} 66 L${x + 1} 57 L${x - 3.5} 57 Z`;
  }

  function antingEls(i) {
    if (i === 0) {
      return [
        tag('circle', { cx: 75, cy: 55, r: 5.5, fill: 'none', stroke: '#ffd34d', strokeWidth: 2.6 }),
        tag('circle', { cx: 125, cy: 55, r: 5.5, fill: 'none', stroke: '#ffd34d', strokeWidth: 2.6 })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('rect', { x: 71, y: 50, width: 8, height: 8, rx: 1.6, fill: '#5ef2e8', transform: 'rotate(45 75 54)' }),
        tag('rect', { x: 121, y: 50, width: 8, height: 8, rx: 1.6, fill: '#5ef2e8', transform: 'rotate(45 125 54)' })
      ].join('');
    }
    if (i === 2) {
      return tag('path', { d: bolt(73), fill: '#ff4040' }) + tag('path', { d: bolt(123), fill: '#ff4040' });
    }
    return [
      tag('path', { d: 'M75 48 L75 60', stroke: '#ffd34d', strokeWidth: 2 }),
      tag('circle', { cx: 75, cy: 63, r: 3.8, fill: '#8b3fd6' }),
      tag('path', { d: 'M125 48 L125 60', stroke: '#ffd34d', strokeWidth: 2 }),
      tag('circle', { cx: 125, cy: 63, r: 3.8, fill: '#8b3fd6' })
    ].join('');
  }

  function kalungEls(i) {
    if (i === 0) {
      return tag('path', {
        d: 'M87 66 Q100 73 113 66', stroke: '#221a30', strokeWidth: 4.5, fill: 'none', strokeLinecap: 'round'
      }) + tag('circle', { cx: 100, cy: 73, r: 4, fill: '#ff5fd2' });
    }
    if (i === 1) {
      return [[88, 67], [94, 70], [100, 72], [106, 70], [112, 67]]
        .map((p) => tag('circle', { cx: p[0], cy: p[1], r: 3.2, fill: '#fdf6ff', stroke: '#c9b8dd', strokeWidth: 1 }))
        .join('');
    }
    if (i === 2) {
      return tag('path', { d: 'M87 65 L100 82 L113 65', stroke: '#ffd34d', strokeWidth: 2.6, fill: 'none' }) +
        tag('rect', { x: 96, y: 79, width: 8, height: 8, rx: 1.8, fill: '#5ef2e8', transform: 'rotate(45 100 83)' });
    }
    return [
      tag('path', { d: 'M90 64 L99 68 L90 72 Z', fill: '#ff8ac2' }),
      tag('path', { d: 'M110 64 L101 68 L110 72 Z', fill: '#ff8ac2' }),
      tag('circle', { cx: 100, cy: 68, r: 3.2, fill: '#e0417f' })
    ].join('');
  }

  function kacaEls(i) {
    const temples = [
      tag('path', { d: 'M82.5 42 L76 40', stroke: '#3a2430', strokeWidth: 2.2 }),
      tag('path', { d: 'M117.5 42 L124 40', stroke: '#3a2430', strokeWidth: 2.2 })
    ].join('');
    if (i === 0) {
      return temples + [
        tag('circle', { cx: 90, cy: 44, r: 7.5, fill: 'rgba(255,255,255,.28)', stroke: '#3a2430', strokeWidth: 2.6 }),
        tag('circle', { cx: 110, cy: 44, r: 7.5, fill: 'rgba(255,255,255,.28)', stroke: '#3a2430', strokeWidth: 2.6 }),
        tag('path', { d: 'M97 43 Q100 41 103 43', stroke: '#3a2430', strokeWidth: 2.2, fill: 'none' })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('path', { d: 'M82.5 42 L76 40', stroke: '#c9a227', strokeWidth: 2.2 }),
        tag('path', { d: 'M117.5 42 L124 40', stroke: '#c9a227', strokeWidth: 2.2 }),
        tag('circle', { cx: 90, cy: 44, r: 7.5, fill: '#1c1626', stroke: '#ffd34d', strokeWidth: 2.2 }),
        tag('circle', { cx: 110, cy: 44, r: 7.5, fill: '#1c1626', stroke: '#ffd34d', strokeWidth: 2.2 }),
        tag('path', { d: 'M97 43 Q100 41 103 43', stroke: '#ffd34d', strokeWidth: 2.2, fill: 'none' })
      ].join('');
    }
    if (i === 2) {
      return temples + [
        tag('path', {
          d: 'M90 39 C86 33 78 38 82 45 C84 49 90 52 90 52 C90 52 96 49 98 45 C102 38 94 33 90 39 Z',
          fill: 'rgba(255,95,210,.55)', stroke: '#e0417f', strokeWidth: 1.8
        }),
        tag('path', {
          d: 'M110 39 C106 33 98 38 102 45 C104 49 110 52 110 52 C110 52 116 49 118 45 C122 38 114 33 110 39 Z',
          fill: 'rgba(255,95,210,.55)', stroke: '#e0417f', strokeWidth: 1.8
        })
      ].join('');
    }
    return tag('rect', {
      x: 76, y: 36, width: 48, height: 13, rx: 6.5,
      fill: 'rgba(94,242,232,.55)', stroke: '#fff', strokeWidth: 1.8
    });
  }

  function micEls(i) {
    if (i === 0) {
      return [
        tag('rect', { x: 122, y: 142, width: 9, height: 22, rx: 4.5, fill: '#333042' }),
        tag('circle', { cx: 126.5, cy: 135, r: 9, fill: '#c8c8dc' }),
        tag('circle', { cx: 126.5, cy: 135, r: 9, fill: 'none', stroke: '#8a8aa8', strokeWidth: 1.8 })
      ].join('');
    }
    if (i === 1) {
      return [
        tag('path', { d: 'M75 28 Q100 4 125 28', stroke: '#2b2140', strokeWidth: 6, fill: 'none', strokeLinecap: 'round' }),
        tag('circle', { cx: 75, cy: 32, r: 6.5, fill: '#2b2140' }),
        tag('circle', { cx: 125, cy: 32, r: 6.5, fill: '#2b2140' }),
        tag('path', { d: 'M125 37 Q114 58 102 61', stroke: '#2b2140', strokeWidth: 3, fill: 'none' }),
        tag('circle', { cx: 100, cy: 62, r: 4, fill: '#ff5fd2' })
      ].join('');
    }
    if (i === 2) {
      return [
        tag('circle', { cx: 125, cy: 46, r: 5, fill: '#ffd34d' }),
        tag('circle', { cx: 125, cy: 46, r: 2, fill: '#fff' }),
        tag('path', { d: 'M127 50 Q131 58 127 64', stroke: '#ffd34d', strokeWidth: 1.8, fill: 'none' })
      ].join('');
    }
    return [
      tag('rect', { x: 69, y: 142, width: 9, height: 22, rx: 4.5, fill: '#c9a227' }),
      tag('circle', { cx: 73.5, cy: 135, r: 9, fill: '#ffd34d' }),
      tag('circle', { cx: 73.5, cy: 135, r: 9, fill: 'none', stroke: '#c9a227', strokeWidth: 1.8 }),
      tag('circle', { cx: 70, cy: 131, r: 1.6, fill: '#fff' })
    ].join('');
  }

  function bodyEls(g, p) {
    const sk = `url(#${p}sk)`;
    return [
      tag('rect', { x: 67, y: 74, width: 12, height: 66, rx: 6, fill: sk }),
      tag('rect', { x: 121, y: 74, width: 12, height: 66, rx: 6, fill: sk }),
      tag('rect', { x: 85, y: 128, width: 13, height: 126, rx: 6.5, fill: sk }),
      tag('rect', { x: 102, y: 128, width: 13, height: 126, rx: 6.5, fill: sk }),
      tag('path', { d: 'M85 246 L98 246 L98 258 Q98 262 92 262 L85 262 Z', fill: sk }),
      tag('path', { d: 'M102 246 L115 246 L115 262 L108 262 Q102 262 102 258 Z', fill: sk }),
      tag('rect', { x: 74.5, y: 74, width: 3, height: 62, rx: 1.5, fill: 'rgba(120,70,40,.14)' }),
      tag('rect', { x: 111, y: 130, width: 4, height: 120, rx: 2, fill: 'rgba(120,70,40,.13)' }),
      tag('rect', { x: 95, y: 60, width: 10, height: 14, fill: g.skin }),
      tag('rect', { x: 95, y: 60, width: 10, height: 5, fill: 'rgba(120,70,40,.16)' }),
      tag('rect', { x: 81, y: 68, width: 38, height: 64, rx: 12, fill: sk })
    ].join('');
  }

  function headEls(g, p) {
    return [
      tag('circle', { cx: 74, cy: 44, r: 4.5, fill: g.skin }),
      tag('circle', { cx: 126, cy: 44, r: 4.5, fill: g.skin }),
      tag('circle', { cx: 100, cy: 42, r: 26, fill: `url(#${p}sk)` }),
      tag('path', { d: 'M78 52 Q100 74 122 52 Q118 64 100 66 Q82 64 78 52', fill: 'rgba(160,95,55,.10)' }),
      tag('ellipse', { cx: 81, cy: 54, rx: 5, ry: 3, fill: g.blush, opacity: 0.7 }),
      tag('ellipse', { cx: 119, cy: 54, rx: 5, ry: 3, fill: g.blush, opacity: 0.7 }),
      tag('path', { d: 'M84 33.5 Q89 31.5 95 34', stroke: g.hairDk, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' }),
      tag('path', { d: 'M116 33.5 Q111 31.5 105 34', stroke: g.hairDk, strokeWidth: 2.4, fill: 'none', strokeLinecap: 'round' }),
      eye(g, 90, 1),
      eye(g, 110, -1),
      tag('path', { d: 'M99 50 Q98 53 100.5 53.5', stroke: 'rgba(150,90,55,.5)', strokeWidth: 1.3, fill: 'none', strokeLinecap: 'round' }),
      tag('path', { d: 'M94 58.5 Q100 57.5 106 58.5 Q100 60 94 58.5', fill: g.lip }),
      tag('path', { d: 'M94 58.8 Q100 63.5 106 58.8 Q100 61.6 94 58.8', fill: g.lip }),
      tag('path', { d: 'M97 58.6 Q100 58 103 58.6', stroke: 'rgba(255,255,255,.5)', strokeWidth: 0.8, fill: 'none' })
    ].join('');
  }

  function catEls(key, i) {
    if (key === 'atasan') return topEls(i);
    if (key === 'bawahan') return bottomEls(i);
    if (key === 'gaun') return gaunEls(i);
    if (key === 'sepatu') return shoesEls(i);
    if (key === 'anting') return antingEls(i);
    if (key === 'kalung') return kalungEls(i);
    if (key === 'kacamata') return kacaEls(i);
    if (key === 'mik') return micEls(i);
    return '';
  }

  function drawDoll(g, o, opts) {
    opts = opts || {};
    const hasGaun = o.gaun != null;
    const p = (opts.prefix || '') + g.name;
    const hairCol = `url(#${p}hr)`;
    const hair = o.rambut != null ? hairEls(o.rambut, hairCol) : { back: '', front: '' };
    const shine = o.rambut != null
      ? tag('path', { d: 'M85 22 Q100 16 115 22 Q108 30 100 30 Q92 30 85 22', fill: 'rgba(255,255,255,.32)' })
      : '';
    const kids = [
      grads(p, g),
      tag('ellipse', { cx: 100, cy: 270, rx: 44, ry: 8, fill: 'rgba(0,0,0,.28)' }),
      hair.back,
      bodyEls(g, p),
      o.sepatu != null ? shoesEls(o.sepatu) : '',
      tag('rect', { x: 83, y: 72, width: 34, height: 44, rx: 10, fill: '#fff' }),
      tag('rect', { x: 84, y: 114, width: 32, height: 24, rx: 8, fill: '#e6e0f2' }),
      !hasGaun && o.bawahan != null ? bottomEls(o.bawahan) : '',
      !hasGaun && o.atasan != null ? topEls(o.atasan) : '',
      hasGaun ? gaunEls(o.gaun) : '',
      headEls(g, p),
      hair.front,
      shine,
      o.anting != null ? antingEls(o.anting) : '',
      o.kalung != null ? kalungEls(o.kalung) : '',
      o.kacamata != null ? kacaEls(o.kacamata) : '',
      o.mik != null ? micEls(o.mik) : ''
    ].join('');
    return tag('svg', {
      viewBox: '0 0 200 280',
      width: '100%',
      xmlns: 'http://www.w3.org/2000/svg',
      style: 'display:block;overflow:visible'
    }, kids);
  }

  function avatarSvg(gi) {
    const g = GIRLS[gi];
    const p = 'av' + g.name;
    const o = state.outfits[gi];
    const hairIdx = o.rambut != null ? o.rambut : gi;
    const hair = hairEls(hairIdx, `url(#${p}hr)`);
    const kids = [
      tag('defs', null, [
        tag('radialGradient', { id: p + 'sk', cx: '38%', cy: '28%', r: '80%' }, [
          tag('stop', { offset: '0%', stopColor: g.skinHi }),
          tag('stop', { offset: '70%', stopColor: g.skin }),
          tag('stop', { offset: '100%', stopColor: g.skin })
        ]),
        tag('linearGradient', { id: p + 'hr', x1: '0', y1: '0', x2: '0.25', y2: '1' }, [
          tag('stop', { offset: '0%', stopColor: g.hairHi }),
          tag('stop', { offset: '55%', stopColor: g.hair }),
          tag('stop', { offset: '100%', stopColor: g.hairDk })
        ])
      ]),
      hair.back,
      headEls(g, p),
      hair.front
    ].join('');
    return tag('svg', {
      viewBox: '64 4 72 76',
      width: '100%',
      height: '100%',
      preserveAspectRatio: 'xMidYMid meet',
      xmlns: 'http://www.w3.org/2000/svg',
      style: 'display:block'
    }, kids);
  }

  function thumbFor(cat, i, g) {
    const crop = cat.key === 'mik' ? MIC_CROPS[i] : cat.crop;
    let kids = '';
    if (cat.key === 'rambut') {
      const h = hairEls(i, g.hair);
      kids = h.back + tag('circle', { cx: 100, cy: 42, r: 26, fill: g.skin }) + h.front;
    } else {
      kids = catEls(cat.key, i);
    }
    return tag('svg', {
      viewBox: crop,
      width: '100%',
      height: '100%',
      preserveAspectRatio: 'xMidYMid meet',
      xmlns: 'http://www.w3.org/2000/svg',
      style: 'display:block'
    }, kids);
  }

  // ---------- confetti ----------
  function buildConfetti() {
    if (!CONFETTI) {
      elConfetti.innerHTML = '';
      return;
    }
    const cols = ['#ff5fd2', '#5ef2e8', '#ffd34d', '#9bf05e', '#b45ef2', '#fff'];
    let html = '';
    for (let i = 0; i < 28; i++) {
      const r = (n) => ((i * 37 + n * 13) % 100) / 100;
      const left = (r(1) * 96 + 2).toFixed(1);
      const w = (6 + r(2) * 7).toFixed(1);
      const h = (9 + r(3) * 8).toFixed(1);
      const dur = (2.6 + r(4) * 2.4).toFixed(2);
      const delay = (r(5) * 3).toFixed(2);
      const radius = i % 3 ? '2px' : '50%';
      html += `<div class="confetti-piece" style="left:${left}%;width:${w}px;height:${h}px;background:${cols[i % cols.length]};border-radius:${radius};animation:cfall ${dur}s linear ${delay}s infinite"></div>`;
    }
    elConfetti.innerHTML = html;
  }

  // ---------- render ----------
  function showScreen(name) {
    state.screen = name;
    elStart.hidden = name !== 'start';
    elDress.hidden = name !== 'dress';
    elStage.hidden = name !== 'stage';
  }

  function previewOutfit(i) {
    return {
      rambut: i,
      atasan: i === 2 ? 2 : i,
      bawahan: i === 1 ? 1 : (i === 0 ? 2 : 0),
      sepatu: i === 1 ? 1 : 0
    };
  }

  function renderStart() {
    showScreen('start');
    elStartMinis.innerHTML = GIRLS.map((g, i) => `
      <div class="mini">
        <div class="mini-doll">${drawDoll(g, previewOutfit(i), { prefix: 'mini' + i })}</div>
        <div class="mini-name" style="color:${g.color}">${g.name}</div>
      </div>
    `).join('');
  }

  function nextLabel() {
    if (state.fromStage) return 'Kembali ke Panggung';
    if (state.girl < 2) return 'Lanjut: ' + GIRLS[state.girl + 1].name;
    return 'Tampil di Panggung!';
  }

  function renderDress() {
    showScreen('dress');
    const g = GIRLS[state.girl];
    const o = state.outfits[state.girl];

    elGirlTabs.innerHTML = GIRLS.map((gg, i) => {
      const active = i === state.girl;
      const border = active ? `2.5px solid ${gg.color}` : '2.5px solid transparent';
      return `
        <button type="button" class="girl-tab${active ? ' is-active' : ''}" data-girl="${i}" style="border:${border}" aria-pressed="${active}">
          <div class="girl-tab-avatar">${avatarSvg(i)}</div>
          <span class="girl-tab-name" style="color:${gg.color}">${gg.name}</span>
        </button>
      `;
    }).join('');

    elDressDoll.innerHTML = drawDoll(g, o, { prefix: 'd' });

    elCatTabs.innerHTML = CATS.map((c) => {
      const active = c.key === state.cat;
      return `
        <button type="button" class="cat-tab${active ? ' is-active' : ''}" data-cat="${c.key}" aria-pressed="${active}">
          <span class="cat-tab-icon">${c.icon}</span>
          <span class="cat-tab-label">${c.label}</span>
        </button>
      `;
    }).join('');

    const cat = CATS.find((c) => c.key === state.cat);
    elItemGrid.innerHTML = cat.items.map((name, i) => {
      const sel = o[cat.key] === i;
      return `
        <button type="button" class="item-card${sel ? ' is-selected' : ''}" data-item="${i}" aria-pressed="${sel}">
          <div class="item-thumb">${thumbFor(cat, i, g)}</div>
          <div class="item-name">${name}</div>
        </button>
      `;
    }).join('');

    elBtnNext.textContent = nextLabel();
  }

  function renderStage() {
    showScreen('stage');
    buildConfetti();
    elStageDolls.innerHTML = GIRLS.map((g, i) => `
      <button type="button" class="stage-doll" data-edit="${i}" aria-label="Ubah outfit ${g.name}">
        <div class="stage-doll-svg">${drawDoll(g, state.outfits[i], { prefix: 's' + i })}</div>
        <div class="stage-doll-name" style="color:${g.color}">${g.name}</div>
      </button>
    `).join('');
  }

  function render() {
    if (state.screen === 'start') renderStart();
    else if (state.screen === 'dress') renderDress();
    else renderStage();
  }

  // ---------- actions ----------
  function toggleItem(key, i) {
    const outfits = state.outfits.map((o) => Object.assign({}, o));
    const o = outfits[state.girl];
    if (o[key] === i) {
      delete o[key];
      blip(420);
    } else {
      o[key] = i;
      blip(760);
      if (key === 'gaun') {
        delete o.atasan;
        delete o.bawahan;
      }
      if (key === 'atasan' || key === 'bawahan') delete o.gaun;
    }
    state.outfits = outfits;
    renderDress();
  }

  function goNext() {
    blip(880, 0.12);
    if (state.fromStage) {
      state.fromStage = false;
      renderStage();
      fanfare();
    } else if (state.girl < 2) {
      state.girl += 1;
      state.cat = 'rambut';
      renderDress();
    } else {
      renderStage();
      fanfare();
    }
  }

  function resetGirl() {
    state.outfits = state.outfits.map((o, i) => (i === state.girl ? {} : o));
    blip(300);
    renderDress();
  }

  function playAgain() {
    blip(660);
    state.girl = 0;
    state.cat = 'rambut';
    state.outfits = [{}, {}, {}];
    state.fromStage = false;
    renderDress();
  }

  // ---------- events ----------
  $('btn-start').addEventListener('click', () => {
    blip(880, 0.12);
    state.girl = 0;
    state.cat = 'rambut';
    state.fromStage = false;
    renderDress();
  });

  elBtnNext.addEventListener('click', goNext);
  $('btn-reset').addEventListener('click', resetGirl);
  $('btn-play-again').addEventListener('click', playAgain);
  elBtnMusicDress.addEventListener('click', toggleMusic);
  elBtnMusicStage.addEventListener('click', toggleMusic);

  elGirlTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-girl]');
    if (!btn) return;
    const i = +btn.dataset.girl;
    blip(700);
    state.girl = i;
    state.cat = 'rambut';
    renderDress();
  });

  elCatTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    blip(640);
    state.cat = btn.dataset.cat;
    renderDress();
  });

  elItemGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-item]');
    if (!btn) return;
    toggleItem(state.cat, +btn.dataset.item);
  });

  elStageDolls.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit]');
    if (!btn) return;
    const i = +btn.dataset.edit;
    blip(700);
    state.girl = i;
    state.cat = 'rambut';
    state.fromStage = true;
    renderDress();
  });

  window.addEventListener('pagehide', () => {
    if (musicTimer) clearInterval(musicTimer);
  });

  // ---------- boot ----------
  renderStart();
})();
