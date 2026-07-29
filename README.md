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

## Game: Kucing Es Krim (`games/kucing_es_krim/`)

Arcade endless survival: geser kucing kiri/kanan untuk menangkap es krim
yang jatuh, hindari bom dan ikan busuk. 3 nyawa, kecepatan naik terus
tanpa henti, musik loop. Single-file (`index.html`, canvas 2D, semua art
digambar prosedural) — dibangun dari prototype desain asli yang sudah
production-ready, hanya ditambah path aset lokal (`assets/music.mp3`) dan
tombol kembali ke hub (ikon rumah kecil di HUD, sebelah tombol mute).

Skor terbaik tersimpan di `localStorage` (`kucing_es_best`). Kontrol:
drag di layar (cone mengikuti jari), tahan tombol ◀/▶ di pojok bawah,
atau A/D / panah kiri-kanan + Space/Enter di keyboard.

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

## Game: K-Pop Hunter Fashion (`games/kpop_hunter_fashion/`)

Dress-up game mobile-first (portrait): style tiga idol original **Rumi, Mira,
Zoey** lewat 9 kategori wardrobe (rambut, atasan, bawahan, gaun, sepatu,
anting, kalung, kacamata, mic — 4 item tiap kategori), lalu saksikan trio
tampil di panggung encore dengan spotlight, confetti, dan fanfare. UI copy
campuran Bahasa Indonesia + istilah K-Pop. Semua karakter & clothing digambar
**inline SVG prosedural** (tanpa file gambar).

Struktur:

- `index.html` — tiga layar (start / dress-up / stage) + tombol home ke hub.
- `style.css` — design tokens hifi (neon purple gradient, Baloo 2, keyframes
  bob/sway/cfall/glowp/popin).
- `game.js` — state machine, draw functions per kategori, aturan dress vs
  top/bottom, Web Audio (blip + fanfare + loop musik sintetis), toggle item.
- `assets/Baloo2.ttf` + `Baloo2-OFL.txt` — font lokal (offline-friendly).

Alur: Start → Dress(Rumi → Mira → Zoey) → Stage. Dari stage, ketuk gadis
untuk edit ulang lalu "Kembali ke Panggung". "Main Lagi" reset semua outfit.

## Game: Telepon Huntrix (`games/telepon_huntrix/`)

Game edukasi angka bertema panggilan video. Anak memilih Rumi, Mira, atau
Zoey, lalu menyelesaikan lima soal mencocokkan angka 1–9 melalui keypad besar.
Jawaban benar memberi bunyi dan kemajuan bintang; jawaban keliru memberi
petunjuk ramah tanpa mengurangi kesempatan bermain. Setelah semua angka cocok,
layar menampilkan animasi menghubungi dan memutar video karakter yang dipilih.

Struktur:

- `index.html` — empat layar: pilih kontak, cocokkan angka, menghubungi, dan
  panggilan video.
- `style.css` — UI telepon warna-warni yang mobile-first, responsif terhadap
  layar pendek, safe area iOS, dan preferensi reduced motion.
- `game.js` — state machine permainan, urutan angka acak, umpan balik suara
  Web Audio, getaran opsional, pemutar video, dan kontrol keyboard 1–9.
- `assets/` — foto dan video Rumi, Mira, dan Zoey serta font Baloo 2 lokal.

Kontrol: ketuk gambar teman, lalu ketuk angka yang sama dengan angka besar di
atas. Tombol 1–9 pada keyboard juga didukung. Tombol suara berlaku untuk efek
permainan sekaligus audio video.

## Game: Golden Piano Tiles (`games/golden_piano_tiles/`)

Rhythm/tap game ala Piano Tiles bertema emas: ubin jatuh di 3 lajur
mengikuti irama lagu; ketuk saat ubin melewati garis hit. Ubin panjang
(TAHAN) harus ditekan & ditahan sampai ujung. Miss (ubin lewat tanpa
ketuk) mengakhiri run; selesai lagu = menang. Combo, progress bar lagu,
skor terbaik di `localStorage` (`goldenTilesHigh`). UI Bahasa Indonesia.

Struktur:

- `index.html` — menu, HUD, gameplay, game-over + tombol home ke hub.
- `style.css` — design tokens hifi (ungu/emas, Baloo 2, floatY/comboPop/
  popIn/shake).
- `game.js` — game loop `requestAnimationFrame` sinkron ke
  `audio.currentTime`, beatmap pattern-based (BPM 100), short + hold
  tiles, Web Audio blip hit/miss, particle burst.
- `assets/background.mp4` — video latar muted loop.
- `assets/golden-song.mp3` — track utama (dimainkan saat MAIN).
- `assets/Baloo2.ttf` + `Baloo2-OFL.txt` — font lokal.

Kontrol: ketuk 3 zona layar (pointer), atau A/S/D (1/2/3) di keyboard.
Space/Enter memulai ulang dari menu / game over. Di menu ada opsi
kecepatan **Lambat / Normal / Cepat** (default Lambat; tersimpan di
`localStorage` `goldenTilesSpeed`) — mengatur playbackRate lagu, waktu
jatuh ubin, kepadatan beatmap, dan hit window. Mode Lambat dirancang
untuk anak usia 3–4 tahun: ubin jauh lebih jarang, waktu jatuh lebih
panjang, tanpa pola setengah-beat, dan waktu ketuk lebih longgar.

## Game: Tumpuk Hewan (`games/tumpuk_hewan/`)

Game keseimbangan endless: geser hewan yang menunggu ke kiri/kanan,
tekan **JATUHKAN!**, lalu susun sebanyak mungkin di atas platform rumput.
Sembilan hewan mempunyai ukuran dan massa berbeda. Fisika rigid-body
ringan menangani gravitasi, rotasi, gesekan, tumbukan, dan efek tumpukan
yang ikut bergeser ketika tersenggol. Permainan berakhir saat salah satu
hewan jatuh keluar platform.

Struktur:

- `index.html` — HUD, tutorial singkat, kontrol jatuhkan, serta layar hasil.
- `style.css` — tampilan portrait mobile-first, panel kaca, animasi, dan
  dukungan safe-area perangkat.
- `game.js` — loop fisika fixed-step, collision SAT untuk kotak berotasi,
  ilustrasi hewan/platform prosedural, partikel, getar, dan Web Audio.

Kontrol: drag di area permainan atau panah kiri/kanan untuk memilih posisi;
tekan tombol **JATUHKAN!**, Space, atau Enter untuk melepas hewan. Rekor dan
pilihan suara tersimpan di `localStorage`.

## Game: Crocodile Dentist (`games/crocodile_dentist/`)

Game keberuntungan sederhana untuk anak: tekan gigi buaya pada rahang atas
atau bawah. Setiap gigi aman masuk ke gusi dan memberi 1 skor, sedangkan satu
gigi jebakan yang dipilih acak akan membuat rahang buaya menutup dan mengakhiri
ronde. Menekan seluruh gigi aman menghasilkan kemenangan dengan skor penuh.

Ilustrasi buaya, hutan, gigi, serta animasi gigitan dibuat sepenuhnya dengan
HTML/CSS. `game.js` mengatur gigi jebakan acak, state ronde, skor terbaik di
`localStorage`, Web Audio, getaran perangkat, akses keyboard, dan mode tanpa
animasi bagi pengguna yang mengaktifkan `prefers-reduced-motion`.

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
