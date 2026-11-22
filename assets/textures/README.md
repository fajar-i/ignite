# Tempat Tekstur Papan 3D (`assets/textures/`)

Folder ini disiapkan untuk menampung tekstur permukaan papan 3D (`.png`, `.jpg`, atau `.webp`).
Selama slot di `js/assets-config.js` bernilai `null`, papan tetap memakai warna solid bawaan tiap bab.

## Daftar Slot Tekstur

| Slot | Objek yang Memakai | Catatan |
| --- | --- | --- |
| `floor` | Permukaan atas petak lantai | Tekstur utama papan jalan |
| `floorSide` | Sisi samping petak lantai | Disarankan terpisah agar tidak gepeng pada tinggi lantai `0.5` |
| `wall` | Sisi samping dinding | Tekstur batu/bata dinding |
| `wallTop` | Permukaan atas dinding | Atap blok dinding |
| `water` | Permukaan sungai / air | Otomatis memakai transparansi & kilau tema sungai |
| `wood` | Papan jembatan kayu | Tekstur bilah kayu jembatan |
| `metal` | Duri jebakan, gerbang besi, batang tuas | Material metalik |
| `gold` | Gerbang tujuan emas | Pilar dan palang gerbang finish |

## Spesifikasi Tekstur yang Disarankan

- **Format:** `.png`, `.jpg`, atau `.webp`
- **Ukuran:** `256x256` atau `512x512` piksel (kelipatan pangkat dua, ringan untuk WebGL & itch.io)
- **Jenis:** *Seamless / tileable* agar batas antar sisi tidak patah

## Cara Pakai di `js/assets-config.js`

1. Taruh file gambar di folder ini, misalnya `assets/textures/floor.png`.
2. Edit `TEXTURES.default` (berlaku untuk semua bab) atau `TEXTURES.stages[1..5]` (khusus bab tertentu):
   ```js
   // Warna asli tekstur apa adanya:
   floor: 'assets/textures/floor.png',

   // Atau tekstur batu abu-abu/netral yang otomatis mengikuti warna tema tiap bab:
   floor: { url: 'assets/textures/stone_neutral.png', repeat: [1, 1], tint: 'theme' },
   ```
3. Atau **tes langsung di Browser DevTools Console**:
   ```js
   setBoardTextures({ floor: 'assets/textures/floor.png' })
   setBoardTextures({ floor: { url: 'assets/textures/stone.png', tint: 'theme' } }, 1) // khusus Bab 1
   ```

> File `.md` di dalam `assets/` otomatis tidak ikut masuk ke ZIP build itch.io (`tools/build_web.py`).
