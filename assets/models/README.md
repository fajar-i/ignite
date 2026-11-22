# Tempat Model 3D Karakter (`assets/models/`)

Folder ini disiapkan untuk menampung model 3D karakter tambahan atau override untuk **Eyes for the Nameless**.
Saat ini model **Nameless Knight + Putri** sudah berjalan dari `MainKnightRig.glb` di root proyek (karya tim 3D artist: Ilyas Saputra), sedangkan slot `monster`, `golem`, dan `princess` terpisah tetap aman memakai placeholder selama nilainya masih `null` di `js/assets-config.js`.

## Nama File yang Disarankan

Letakkan file `.glb` (disarankan) atau `.fbx` di folder ini:

- `monster.glb` — **Monster Gua** (Bab 3 & 5)
- `golem.glb` — **Golem Batu** (Bab 4 & 5)
- `knight.glb` — **Nameless Knight** (opsional jika ingin memindahkan/mengganti `MainKnightRig.glb`)
- `princess.glb` — **Putri** terpisah (opsional; set `MODELS.knight.includesPrincess = false` terlebih dahulu agar tidak dobel; bayangan Putri terpisah otomatis dimatikan engine untuk foreshadowing plot twist)

> `.gltf` dan `.fbx` juga didukung, tetapi `.glb` (glTF Binary) paling aman karena tekstur dan material terkemas rapi dalam satu file.

## Cara Mengubah Model Khusus Unity ke Web (`.glb`)

Jika model awalnya hanya tersedia dalam proyek/format Unity (`.prefab`, `.unitypackage`, atau `.fbx` + material terpisah):

### Opsi A — Ekspor langsung dari Unity (Praktis)
1. Buka Unity -> **Window -> Package Manager -> Add package by name...**
2. Masukkan `com.unity.cloud.gltfast` (**glTFast**) atau gunakan **UnityGLTF**.
3. Taruh prefab/karakter ke Scene (pastikan material sudah memakai Standard/Lit agar ikut terekspor).
4. Klik kanan objek di Hierarchy -> **Export glTF** -> pilih format **glTF Binary (`.glb`)**.

### Opsi B — Ekspor lewat Blender (Paling Stabil & Ringan)
1. Impor file `.fbx` / `.obj` / `.blend` ke Blender dan pasang kembali teksturnya di tab *Shading*.
2. Pastikan karakter berdiri di dasar kaki `0`, menghadap depan (arah hadap bisa disesuaikan lagi lewat `rotationY`, dan jika hasil ekspor masih Z-up bisa dikoreksi lewat `rotationX: -Math.PI / 2`).
3. **File -> Export -> glTF 2.0 (`.glb`)**:
   - **Format:** `glTF Binary (.glb)`
   - **Transform:** centang **+Y Up**
   - **Include:** centang *Selected Objects* (jika hanya ekspor karakter itu)
   - **Data -> Material:** *Export* (tekstur ikut tersemat otomatis ke `.glb`)
   - **Animation:** centang *Animation* jika membawa klip `Walk` / `Idle` / `Jump`.

## Ketentuan Teknis di Engine (`js/assets-config.js`)

- **Skala otomatis:** Tidak perlu pusing satuan cm/meter—isi `height` (tinggi dalam satuan petak; 1 petak = `1.0`) atau isi `scale` manual.
- **Arah hadap & sumbu:** Karakter di game dianggap menghadap **`+Z`**. Jika miring atau menghadap arah lain, sesuaikan `rotationX` / `rotationY`.
- **Posisi kaki:** Engine otomatis menempatkan dasar bounding box di `y = 0 + yOffset` dan memusatkan X/Z ke tengah petak.
- **Putri menyatu vs terpisah (`includesPrincess`):** Jika Putri sudah ikut digendong di dalam rig Kesatria (seperti `MainKnightRig.glb`), set `includesPrincess: true`. Jika Putri ingin dimuat sebagai model terpisah (`princess.glb`), set `includesPrincess: false`.

## Cara Mengaktifkan & Tes Cepat

1. Taruh file `.glb` ke `assets/models/`.
2. Buka `js/assets-config.js` lalu ubah `url: null` menjadi path file, misalnya:
   ```js
   monster: {
     url: 'assets/models/monster.glb',
     height: 0.9,
     rotationX: 0,
     rotationY: 0,
     yOffset: 0,
   },
   ```
3. Atau **tes langsung di Browser DevTools Console** sambil game berjalan (tanpa edit kode dulu):
   ```js
   setKnightModel({ url: 'assets/models/knight.glb', walkClip: 'Walk', idleClip: 'Idle', jumpClip: 'Jump', includesPrincess: true })
   setPrincessModel({ url: 'assets/models/princess.glb', height: 0.35, offset: [0, 0.62, -0.24] })
   setMonsterModel({ url: 'assets/models/monster.glb', height: 0.9, rotationY: 0 })
   setGolemModel({ url: 'assets/models/golem.glb', height: 1.1, rotationY: 0 })
   ```

> File `.md` di dalam `assets/` otomatis tidak ikut masuk ke ZIP build itch.io (`tools/build_web.py`).
