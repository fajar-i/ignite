# Draf halaman itch.io: Eyes for the Nameless

> Salin bagian di bawah garis ke editor halaman itch.io.
> Checklist wajib dari rulebook ada di paling bawah.

---

## Eyes for the Nameless

**Seorang kesatria kehilangan penglihatannya. Kamulah matanya.**

*Eyes for the Nameless* adalah game puzzle pemrograman 3D untuk belajar berpikir komputasional. Pemain menyusun blok perintah (Maju, Belok, Lompat, Ulangi, Jika, Tarik Tuas, Fungsi) untuk menuntun kesatria buta keluar dari kastil, dibimbing suara sang putri.

### Tema: STEM Education
**Sub-tema: Sebab Akibat & Satu Langkah Kecil**

- **Satu langkah kecil.** Setiap blok adalah satu langkah kesatria. Masalah besar, yaitu keluar dari kastil, dipecah menjadi langkah-langkah kecil yang bisa dipahami. Kurikulumnya juga bertahap: satu konsep baru di setiap bab.
- **Sebab akibat.** Setiap perintah punya akibat yang langsung terlihat di dunia 3D. Menarik tuas (sebab) menurunkan jembatan (akibat). Sensor putri ("Ada jebakan di depan?") menentukan tindakan berikutnya. Saat program gagal, game menunjukkan **blok penyebabnya** dan **akibatnya**, sehingga pemain belajar menelusuri kesalahan kembali ke sumbernya (debugging).

### Yang dipelajari
| Bab | Konsep pemrograman | Kaitan engineering |
|---|---|---|
| I · Menara Atas | Urutan perintah (sequence) | Struktur bangunan |
| II · Lorong Perpustakaan Tua | Perulangan (loop) | Pola & efisiensi |
| III · Ruang Mesin Jam | Percabangan (if/else) + sensor | Sistem kontrol |
| IV · Ruang Bawah Tanah | Fungsi (prosedur) | Modularitas |
| V · Gerbang Kastil | Gabungan + debugging | Perbaikan sistem |

Fitur: 5 bab bercerita dengan plot twist, 3 bintang per bab (waktu menyusun), petunjuk putri bertingkat, kamus blok, editor level custom yang bisa dibagikan lewat kode, 3 slot simpan, dan pengaturan aksesibilitas (ukuran teks, kontras tinggi, kurangi animasi, kontrol penuh keyboard & gamepad).

### Kontrol
**Mouse / sentuh**
- Klik blok di *Kitab Perintah* untuk menambahkannya ke program
- Seret blok untuk mengatur urutan; seret ke luar program untuk menghapus
- Klik **Jalankan** untuk menjalankan program
- Seret dunia 3D untuk memutar kamera, scroll untuk zoom

**Keyboard**
| Tombol | Fungsi |
|---|---|
| Panah | Pindah fokus antar tombol/blok |
| Enter / Spasi | Pilih |
| Esc | Kembali / tutup / jeda |
| P | Jeda permainan |
| Delete / Backspace | Hapus blok terpilih |
| Alt + ↑ / ↓ | Geser blok terpilih |
| Enter (pada Ulangi/Jika) | Masuk ke isi blok |

**Editor level:** 1–9, 0, `-` = pilih alat · Shift + panah = menggambar · Ctrl+Z / Ctrl+Y = undo / redo · Ctrl+Enter = uji coba level

**Gamepad (layout standar)**
| Tombol | Fungsi |
|---|---|
| D-pad / stik kiri | Pindah fokus |
| A | Pilih |
| B | Kembali |
| Y | Jalankan program |
| X | Minta petunjuk |
| LB / RB | Geser blok naik / turun |
| Start | Jeda / pengaturan |

### Cara bermain di browser
Klik **Run game**. Semua file sudah disertakan, tidak butuh unduhan tambahan. Disarankan Chrome/Edge/Firefox versi terbaru. Jika terasa berat, matikan **Pengaturan → Latar animasi**.

### Tim
- Fajari Arkan F — Programmer
- Andika Bahari M — Programmer, Writer, Quality Assurance
- Ilyas Saputra — Game Designer, 3D Artist

### Kredit aset eksternal
| Aset | Pembuat / Sumber | Kegunaan | Lisensi |
| --- | --- | --- | --- |
| [Three.js](https://threejs.org) r160 (+ addon `OrbitControls`, `GLTFLoader`, `FBXLoader`, `SkeletonUtils`) | Para kontributor Three.js, disertakan lokal | Mesin 3D | MIT |
| Font Nodesto Caps Condensed (`assets/fonts/NodestoCapsCondensed-Bold.otf`) | Solbera (imitasi font Nodesto untuk materi D&D 5e) | Teks judul / heading | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Font Solbera Imitation (`assets/fonts/SolberaImitation.otf`) | Solbera (imitasi huruf hias Solbera untuk materi D&D 5e) | Huruf hias awal (drop cap) di layar cerita | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Ikon UI & ikon blok ([Lucide](https://lucide.dev) v0.460.0, paket `lucide-static`) | Lucide Contributors (sebagian dari Feather oleh Cole Bemis) | Semua ikon tombol dan ikon blok perintah | ISC License (teks lisensi: `assets/licenses/lucide-LICENSE.txt`) |
| Font [Cinzel](https://github.com/NDISCOVER/Cinzel) | The Cinzel Project Authors (Natanael Gama), disertakan lokal | Cadangan teks judul (simbol yang tidak ada di Nodesto) | SIL Open Font License 1.1 |
| Font [Rosario](https://github.com/Omnibus-Type/Rosario) (`assets/fonts/rosario/`) | Copyright 2019 The Rosario Project Authors ([Omnibus-Type](https://github.com/Omnibus-Type/Rosario)) | Teks isi / paragraf | SIL Open Font License 1.1 (teks lisensi: `assets/fonts/rosario/OFL.txt`) |
| `assets/sfx/click.mp3` | Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=140881">Official Profile</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=140881">Pixabay</a> | Suara klik tombol / blok; juga belok, sensor, dan tombol Simpan (nada digeser) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/win.mp3` | Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=143022">Official Profile</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=143022">Pixabay</a> | Suara bab/level selesai dan kartu "Blok Baru!" | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/menu.mp3` | Sound Effect by <a href="https://pixabay.com/users/gregorquendel-19912121/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=291600">Gregor Quendel</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=291600">Pixabay</a> | Musik layar utama (dipotong, diputar berulang) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/game.mp3` | Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=49820">freesound_community</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=49820">Pixabay</a> | Musik latar di dalam bab (diputar berulang) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/fail.mp3` | Sound Effect by <a href="https://pixabay.com/users/wefgf-52753747/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=554381">wefgf</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=554381">Pixabay</a> | Suara program gagal | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/move/*.mp3` (step, turn, jump, land, lever, hit, attack, dive, splash) | "[12 Player Movement SFX](https://opengameart.org/content/12-player-movement-sfx)" oleh [leohpaz](https://opengameart.org/users/leohpaz) (via OpenGameArt) | Suara gerakan kesatria, jebakan, dan monster. Diubah: dikonversi dari WAV ke MP3 dan volumenya dinormalisasi | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `assets/paper.jpg` (tile 1400px yang dipotong & disambung dari foto asli) | [Olga Thelavart](https://unsplash.com/@olga_o) (via [Unsplash](https://unsplash.com)) | Tekstur kertas/kain UI | [Unsplash License](https://unsplash.com/license) |

**Aset buatan tim:**
Konsep game, cerita, dan rancangan materi edukasi berasal dari dokumen desain tim. Model 3D kesatria yang menggendong putri (`MainKnightRig.glb`) beserta rig dan animasinya (diam, jalan, lompat), serta gambar karakter dialog (`assets/portraits/princess.png`, `assets/portraits/knight.png`), dimodelkan dan dirender oleh tim.

**Elemen lain di dalam kode game:**
- Model 3D sederhana (monster, golem, papan, tuas, jembatan, gerbang, duri) disusun dari bentuk dasar bawaan Three.js (kubus, kapsul, kerucut, silinder, bola) dengan warna polos, tanpa tekstur.
- Latar animasi (`js/bgfx.js`) adalah shader WebGL di dalam kode game dan bisa dimatikan di Pengaturan → Latar animasi.
- Semua ikon, audio, font, dan foto tekstur berasal dari sumber berlisensi di tabel di atas.

Emoji pada dialog dan editor menggunakan font bawaan sistem operasi.

---

## Checklist wajib halaman itch.io (rulebook)
- [ ] Deskripsi singkat game
- [ ] Petunjuk kontrol / keybindings
- [ ] Screenshot game (menu, gameplay tiap bab, editor level, dialog dengan potret)
- [ ] Video gameplay singkat (bisa direkam setelah jam)
- [ ] Kredit anggota tim & perannya
- [ ] Kredit aset eksternal
- [ ] Upload `dist/eyes-for-the-nameless-web.zip` (buat dengan `python tools/build_web.py`), Kind of project: **HTML**, centang **This file will be played in the browser**, viewport disarankan 1280×720 + tombol fullscreen
- [ ] Kumpulkan sebelum 22 November 2026 pukul 23:59 WIB
