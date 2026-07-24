# Game Kucing

Platform game anak-anak untuk mobile (Godot 4.x, portrait 480×854). Setiap game
hidup di foldernya sendiri di bawah `games/`, jadi nanti tinggal menambah game
baru + scene pemilih game (hub) tanpa mengubah game yang sudah ada.

## Cara menjalankan

1. Install [Godot 4.x](https://godotengine.org/download) (dites dengan 4.3, cukup versi standar, bukan .NET).
2. Buka Godot → **Import** → pilih folder ini (`project.godot`).
3. Tekan **F5** (Run Project). Di desktop, klik mouse dianggap sentuhan.

## Game: Kucing Es Krim (`games/kucing_es_krim/`)

Arcade endless survival: geser kucing untuk menangkap es krim, hindari bom dan
ikan busuk. 3 nyawa, makin lama makin cepat. Skor terbaik tersimpan di
`user://save.cfg`.

Kontrol: drag di layar (cone mengikuti jari), tahan tombol ◀/▶ di pojok bawah,
atau A/D / panah kiri-kanan + Space/Enter di keyboard.

Struktur:

- `main.tscn` — scene utama; node `Shaker` menampung semua layer (untuk screen shake).
- `scripts/main.gd` — state machine (START/PLAY/OVER), spawner, collision, skor/nyawa, input, musik, save.
- `scripts/cat.gd` — kucing + tumpukan scoop di cone (easing, mood happy/sedih).
- `scripts/falling_item.gd` — item jatuh (scoop/bom/ikan).
- `scripts/background.gd`, `hud.gd`, `overlay.gd`, `particles.gd`, `popups.gd` — layer visual.
- `scripts/draw_utils.gd` (`KDraw`) — helper gambar prosedural + palet warna.

Semua art masih digambar prosedural (mengikuti prototype desain). Kalau nanti
mau upgrade ke sprite PNG/SVG, cukup ganti isi fungsi `_draw()` — logika game
tidak perlu disentuh. Semua tuning gameplay (kecepatan jatuh, interval spawn,
peluang item jahat, hitbox) mengikuti spec di design handoff.

## Test

Smoke test headless (simulasi tangkap 8 scoop → bonus YUMMY, 3 bom → game over,
cek save):

```
godot --headless --path . -s res://tests/smoke.gd
```

## Menambah game baru (rencana platform)

1. Buat folder `games/<nama_game>/` dengan `main.tscn` sendiri.
2. Buat scene hub (grid tombol pilihan game) dan jadikan main scene di
   `project.godot`; tiap tombol memanggil
   `get_tree().change_scene_to_file("res://games/<nama_game>/main.tscn")`.
3. Beri tombol "kembali ke menu" di tiap game.

## Export ke Android

Project sudah diset portrait + stretch `canvas_items`/`keep` + renderer
`gl_compatibility`, jadi siap untuk device low-end. Tinggal pasang export
template Android di Godot (Editor → Manage Export Templates) lalu buat preset
Android di Project → Export.
