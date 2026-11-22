Tidak perlu instal apa pun. Game ini hanya terdiri dari file HTML/JS standar dengan Three.js yang dimuat langsung dari internet. Kamu hanya membutuhkan **Python** dan koneksi internet.

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

### Kredit & Lisensi Aset

| Aset | Pembuat / Sumber | Kegunaan | Lisensi |
| --- | --- | --- | --- |
| `Walking.fbx`, `Idle.fbx` | [Mixamo](https://www.mixamo.com) (Adobe) | Model kesatria serta animasi berjalan & diam | Lisensi Mixamo (bebas royalti untuk proyek pribadi & komersial; file mentah tidak boleh didistribusikan ulang terpisah dari game) |
| [Three.js](https://threejs.org) r160 (+ addon `OrbitControls`, `GLTFLoader`, `FBXLoader`, `SkeletonUtils`) | Para kontributor Three.js, dimuat via [jsDelivr](https://www.jsdelivr.com) | Mesin 3D | MIT |
| Font Nodesto Caps Condensed (`assets/fonts/NodestoCapsCondensed-Bold.otf`) | Solbera (imitasi font Nodesto untuk materi D&D 5e) | Teks judul / heading | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Font Solbera Imitation (`assets/fonts/SolberaImitation.otf`) | Solbera (imitasi huruf hias Solbera untuk materi D&D 5e) | Huruf hias awal (drop cap) di layar cerita | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Font [Cinzel](https://fonts.google.com/specimen/Cinzel) | Natanael Gama (via Google Fonts) | Cadangan teks judul (simbol yang tidak ada di Nodesto) | SIL Open Font License 1.1 |
| Font [Lora](https://fonts.google.com/specimen/Lora) | Cyreal (via Google Fonts) | Teks isi | SIL Open Font License 1.1 |
| `assets/paper.jpg` (tile 640px dari foto asli) | [Smithsonian](https://unsplash.com/@smithsonian) & [Olga Thelavart](https://unsplash.com/@olga_o) (via [Unsplash](https://unsplash.com)) | Tekstur kertas/kain UI | [Unsplash License](https://unsplash.com/license) |

**Aset Orisinal:**
Seluruh elemen lainnya dibuat secara mandiri, meliputi kode program, alur cerita, desain level, ikon blok (SVG), model bentuk dasar (putri, monster, golem, papan, tuas, jembatan, gerbang), serta musik dan efek suara (dibuat menggunakan WebAudio). Emoji pada dialog dan editor menggunakan font bawaan sistem operasi.