Tidak perlu instal apa pun. Game ini cuma file HTML/JS biasa, dan Three.js dimuat dari internet. Yang dibutuhkan hanya **Python** dan koneksi internet.

**Jalankan game:**
```powershell
python serve.py
```

Lalu buka alamat yang muncul di terminal, biasanya http://localhost:5173. Kalau port itu sedang dipakai, server otomatis pindah ke 5174, 5175, dan seterusnya. Gunakan alamat yang tercetak di terminal.

**Berhenti:** tekan `Ctrl+C` di terminal.

**Cek level masih bisa diselesaikan** (opsional, butuh Node.js, sudah terpasang):
```powershell
node tools/validate.mjs
```

Membuka `index.html` dengan klik dua kali tidak akan jalan: browser memblokir file `.js` dan `.fbx` kalau dibuka langsung tanpa server. Jadi selalu jalankan lewat `serve.py`.
## Kredit & lisensi aset

| Aset | Pembuat / sumber | Dipakai untuk | Lisensi |
|---|---|---|---|
| `Walking.fbx`, `Idle.fbx` | [Mixamo](https://www.mixamo.com) (Adobe) | Model kesatria + animasi jalan & diam | Lisensi Mixamo: bebas royalti untuk proyek pribadi & komersial; file mentah tidak boleh didistribusikan ulang terpisah dari game |
| [Three.js](https://threejs.org) r160 (+ addon OrbitControls, GLTFLoader, FBXLoader, SkeletonUtils) | three.js authors, dimuat via [jsDelivr](https://www.jsdelivr.com) | Mesin 3D | MIT |
| Font [Cinzel](https://fonts.google.com/specimen/Cinzel) | Natanael Gama, via Google Fonts | Judul | SIL Open Font License 1.1 |
| Font [Lora](https://fonts.google.com/specimen/Lora) | Cyreal, via Google Fonts | Teks | SIL Open Font License 1.1 |
| `assets/paper.jpg` (tile 640px dari foto asli) | Photo by <a href="https://unsplash.com/@smithsonian?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Smithsonian</a> on <a href="https://unsplash.com/photos/light-yellow-woven-fabric-texture-NlrtBD3Iw7I?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a> | Tekstur kertas/kain UI | [Unsplash License](https://unsplash.com/license) |

Selain itu dibuat sendiri: kode, cerita, desain level, ikon blok (SVG), model bentuk dasar
(putri, monster, golem, papan, tuas, jembatan, gerbang), musik & efek suara
(dibuat dengan WebAudio). Emoji di dialog/editor memakai font emoji bawaan sistem.
