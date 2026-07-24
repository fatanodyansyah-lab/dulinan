# Dulinan Space

Platform game anak-anak untuk mobile, dibangun murni dengan **HTML/CSS/JS**
(bukan engine) supaya gampang dibuka di browser mana pun atau dibungkus jadi
APK dengan WebView (mis. Capacitor/Cordova) nanti. Tiap game hidup di
folder sendiri di bawah `games/`, dipanggil dari halaman pemilih (`index.html`
di root), yang bertema "Dulinan Space" — home screen bergaya playful/luar
angkasa ringan (mascot robot, bintang berkelip), sesuai design handoff
hifi. Rencana deploy: domain `dulinan.space` via GitHub Pages (lihat `CNAME`).

## Cara menjalankan

Buka `index.html` langsung di browser (double-click cukup), atau jalankan
server statis lokal supaya video & font ke-load tanpa batasan `file://`
di sebagian browser:

```
npx serve .
```

lalu buka `http://localhost:3000`.

## Game: Konser Kelinci (`games/konser_kelinci/`)

Rhythm game ala Guitar Hero: gem warna jatuh di jalur 3 lajur bertampilan
3D (perspective + rotateX), pemain menekan tombol warna (atau tombol
A/S/D di keyboard) saat gem sampai garis pelangi. Ada 3 lagu anak
(Bintang Kecil, Si Domba Kecil, Pak Tani Punya Kandang), skor & combo,
efek api saat kena, popup semangat ("Hebat!", dst), dan rating bintang
di akhir lagu.

Struktur:

- `index.html` — markup semua layar (start/song-select, gameplay, end).
- `style.css` — semua styling & animasi (langsung dari spec desain: warna,
  gradient, box-shadow, keyframes `noteFall`/`pop`/`flameUp`/dst).
- `game.js` — logic murni vanilla JS: penjadwalan lagu berbasis
  `AudioContext.currentTime` (bukan `Date.now`, biar tidak drift), hit
  detection (±0.22s), sintesis nada via Web Audio (osilator triangle +
  sine oktaf, tanpa file sample), spawn note/burst effect, state machine.
- `assets/background-video.mp4` — video latar loop dari handoff (kucing main gitar).
- `assets/Baloo2.ttf` + `Baloo2-OFL.txt` — font Baloo 2 (variable font,
  weight 600/700/800), di-host lokal (bukan Google Fonts CDN) supaya game
  tetap tampil benar walau offline.

Semua ukuran/warna/timing mengikuti design tokens di handoff persis
(fall 2.6s, hit window ±0.22s, miss grace 0.25s, dst) — bisa diubah di
3 konstanta atas `game.js`: `TEMPO`, `FALL_SECONDS`, `SHOW_KEYS`.

## Menambah game baru

1. Buat folder `games/<nama_game>/` dengan `index.html` sendiri (boleh
   pola sama: HTML + CSS + JS terpisah, atau single-file seperti prototype).
2. Tambahkan satu entri ke array `GAMES` di `script.js` (root): `emoji`,
   `name`, `tag`, dan `url: 'games/<nama_game>/index.html'`. Kartu di home
   screen dan alur loading → "Main Sekarang" otomatis mengarah ke situ.
3. Di dalam game, sediakan tombol "kembali" yang mengarah ke
   `../../index.html` (lihat `#homeBtn` di Konser Kelinci sebagai contoh).

## Test

Sudah diverifikasi otomatis dengan Playwright (headless Chromium):
klik tombol lagu, gem jatuh & bisa di-hit tepat waktu, skor/combo naik,
efek burst & popup muncul, lagu selesai otomatis → layar akhir dengan
rating bintang benar, tombol "Main Lagi" kembali ke pilih lagu, dan
navigasi hub ↔ game via tombol home berfungsi dua arah.
