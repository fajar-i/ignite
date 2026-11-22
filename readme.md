Tidak perlu instal apa pun. Game ini hanya terdiri dari file HTML/JS standar; Three.js dan semua font sudah disertakan di folder `vendor/` dan `assets/`, jadi game bisa berjalan tanpa internet. Kamu hanya membutuhkan **Python** untuk menjalankan server lokal.

### Cara Menjalankan

Jalankan perintah berikut di terminal:

```powershell
python serve.py

```

Setelah itu, buka alamat yang muncul di terminal (biasanya `http://localhost:5173`). Jika port tersebut sedang digunakan, server akan otomatis berpindah ke `5174`, `5175`, dan seterusnya. Pastikan kamu membuka alamat yang tertera di terminal.

* **Menghentikan server:** Tekan `Ctrl+C` di terminal.
* **Validasi level (opsional):** Jika ingin mengecek apakah semua level masih bisa diselesaikan (membutuhkan Node.js yang sudah terpasang), jalankan:
```powershell
node tools/validate.mjs

```



> **Catatan:** Jangan membuka `index.html` secara langsung (klik dua kali) karena browser akan memblokir pemuatan file `.js` dan `.fbx` tanpa server lokal. Selalu jalankan game melalui `serve.py`.

---

### Tim

| Nama | Peran |
| --- | --- |
| Fajari Arkan F | Programmer |
| Andika Bahari M | Programmer, Writer, Quality Assurance |
| Ilyas Saputra | Game Designer, 3D Artist |

### Kredit & Lisensi Aset

| Aset | Pembuat / Sumber | Kegunaan | Lisensi |
| --- | --- | --- | --- |
| [Three.js](https://threejs.org) r160 (+ addon `OrbitControls`, `GLTFLoader`, `FBXLoader`, `SkeletonUtils`) | Para kontributor Three.js, disertakan lokal di `vendor/three/` | Mesin 3D | MIT (teks lisensi: `vendor/three/LICENSE`) |
| Font Nodesto Caps Condensed (`assets/fonts/NodestoCapsCondensed-Bold.otf`) | Solbera (imitasi font Nodesto untuk materi D&D 5e) | Teks judul / heading | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Font Solbera Imitation (`assets/fonts/SolberaImitation.otf`) | Solbera (imitasi huruf hias Solbera untuk materi D&D 5e) | Huruf hias awal (drop cap) di layar cerita | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Ikon UI & ikon blok ([Lucide](https://lucide.dev) v0.460.0, paket `lucide-static`) | Lucide Contributors (sebagian dari Feather oleh Cole Bemis) | Semua ikon tombol dan ikon blok perintah | ISC License (teks lisensi: `assets/licenses/lucide-LICENSE.txt`) |
| Font [Cinzel](https://github.com/NDISCOVER/Cinzel) | The Cinzel Project Authors (Natanael Gama), disertakan lokal di `vendor/cinzel/` | Cadangan teks judul (simbol yang tidak ada di Nodesto) | SIL Open Font License 1.1 (teks lisensi: `vendor/cinzel/LICENSE`) |
| Font [Rosario](https://github.com/Omnibus-Type/Rosario) (`assets/fonts/rosario/`) | Copyright 2019 The Rosario Project Authors ([Omnibus-Type](https://github.com/Omnibus-Type/Rosario)) | Teks isi / paragraf | SIL Open Font License 1.1 (teks lisensi: `assets/fonts/rosario/OFL.txt`) |
| `assets/sfx/click.mp3` | Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=140881">Official Profile</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=140881">Pixabay</a> | Suara klik tombol / blok; juga belok, sensor, dan tombol Simpan (nada digeser) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/win.mp3` | Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=143022">Official Profile</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=143022">Pixabay</a> | Suara bab/level selesai dan kartu "Blok Baru!" | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/menu.mp3` | Sound Effect by <a href="https://pixabay.com/users/gregorquendel-19912121/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=291600">Gregor Quendel</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=291600">Pixabay</a> | Musik layar utama (dipotong, diputar berulang) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/game.mp3` | Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=49820">freesound_community</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=49820">Pixabay</a> | Musik latar di dalam bab (diputar berulang) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/fail.mp3` | Sound Effect by <a href="https://pixabay.com/users/wefgf-52753747/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=554381">wefgf</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=554381">Pixabay</a> | Suara program gagal | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `assets/sfx/move/*.mp3` (step, turn, jump, land, lever, hit, attack, dive, splash) | "[12 Player Movement SFX](https://opengameart.org/content/12-player-movement-sfx)" oleh [leohpaz](https://opengameart.org/users/leohpaz) (via OpenGameArt) | Suara gerakan kesatria, jebakan, dan monster. Diubah: dikonversi dari WAV ke MP3 dan volumenya dinormalisasi | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `assets/paper.jpg` (tile 1400px yang dipotong & disambung dari foto asli) | [Olga Thelavart](https://unsplash.com/@olga_o) (via [Unsplash](https://unsplash.com)) | Tekstur kertas/kain UI | [Unsplash License](https://unsplash.com/license) |

**Aset buatan tim:**
Konsep game, cerita, dan rancangan materi edukasi berasal dari dokumen desain tim. Model 3D kesatria yang menggendong putri (`MainKnightRig.glb`) dan golem batu (`assets/models/golem.glb`) beserta rig dan animasinya, render diorama menu utama (`assets/menu/scene.webp`), serta gambar karakter dialog (`assets/portraits/princess.png`, `assets/portraits/knight.png`), dimodelkan dan dirender oleh tim.

**Elemen lain di dalam kode game:**
- Model 3D sederhana (monster gua, papan, tuas, jembatan, gerbang, duri) disusun dari bentuk dasar bawaan Three.js (kubus, kapsul, kerucut, silinder, bola) dengan warna polos, tanpa tekstur.
- Latar animasi (`js/bgfx.js`) adalah shader WebGL di dalam kode game dan bisa dimatikan di Pengaturan → Latar animasi.
- Semua ikon, audio, font, dan foto tekstur berasal dari sumber berlisensi di tabel di atas.

Emoji pada dialog dan editor menggunakan font bawaan sistem operasi.
