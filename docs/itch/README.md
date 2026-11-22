# Panduan halaman itch.io

File di folder ini dibuat dari aset game (`python tools/make_itch_art.py`).

| File | Dipakai di itch.io |
|---|---|
| `cover.png` (630×500) | **Edit game → Cover image** (juga tampil di halaman jam) |
| `banner.png` (960×320) | **Edit theme → Banner** (gambar header) |
| `bg-tile.png` | **Edit theme → Background** (opsional; boleh pakai warna saja) |
| `description.html` | Buka di browser, salin isinya ke **Edit game → Description** |

## 1. Edit game
- **Kind of project:** HTML
- **Uploads:** `dist/eyes-for-the-nameless-web.zip` (buat ulang dengan `python tools/build_web.py`), centang **This file will be played in the browser**
- **Embed options:**
  - Viewport dimensions: **1280 × 720**
  - Centang **Fullscreen button**
  - Centang **Mobile friendly**, orientasi **Landscape**
  - Jangan centang *Automatically start on page load* (agar audio tidak diblokir browser)
- **Genre:** Puzzle · **Tags:** educational, programming, puzzle, 3d, coding, stem
- **Screenshots:** minimal 3–5 dari game (menu, gameplay beberapa bab, dialog dengan potret, layar menang, editor level). Ambil dalam mode fullscreen di browser (Win+Shift+S).

## 2. Edit theme
Buka halaman game → **Edit theme** (di atas halaman).

| Pengaturan | Nilai |
|---|---|
| Background | `#120B1E` (+ gambar `bg-tile.png`, Repeat) |
| Inner background (BG2) | `#F3E6C8` |
| BG3 (kotak/komentar) | `#E6D3A8` |
| Text | `#3B2A1A` |
| Link | `#9C2F2F` |
| Button | `#9C2F2F` |
| Banner | `banner.png`, posisi **Center** |
| Header font | *Cinzel* (bila ada di daftar). Font judul game, Nodesto Caps Condensed, tidak tersedia di itch.io, tapi sudah tampil di banner |
| Body font | **Rosario** (font paragraf game; tersedia di Google Fonts). Bila tidak ada di daftar: *Lato* / *Open Sans* |
| Layout | Description di kiri, info di kanan (bawaan) |

Hasilnya: latar malam gelap seperti menu game, dengan kolom isi berwarna perkamen seperti panel di dalam game.

### Catatan font
- Font game ada di `assets/fonts/`: **Nodesto Caps Condensed** (judul), **Rosario** (paragraf), **Solbera Imitation** (huruf hias).
- Editor tema itch.io hanya menyediakan daftar font tetap, jadi file font lokal tidak bisa dipasang langsung. Pilih **Rosario** untuk teks bila tersedia.
- Judul berfont Nodesto sudah tampil lewat **banner** dan **cover** (dibuat dari `assets/fonts` oleh `tools/make_itch_art.py`).
- Bila akun mendapat fitur *Custom CSS* dari itch.io, font lokal bisa dipakai lewat `@font-face` yang menunjuk ke file font yang diunggah.

