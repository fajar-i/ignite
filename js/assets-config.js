// ============================================================
//  KONFIGURASI ASET 3D & TEKSTUR PAPAN
//  File ini sengaja dipisah dari main.js agar anggota tim 3D
//  bisa memasang atau menyetel model & tekstur dari satu tempat.
// ============================================================

/**
 * Konfigurasi model karakter 3D (.glb / .gltf / .fbx).
 *
 * Properti umum tiap slot:
 * - url       : path file relatif terhadap index.html. `null` = pakai placeholder bawaan.
 * - height    : tinggi model di dunia game (1 petak = 1 unit). Skala dihitung otomatis.
 * - scale     : (opsional) angka skala manual; jika diisi, mengabaikan `height`.
 * - rotationX : koreksi kemiringan sumbu X dalam radian (mis. `-Math.PI / 2` untuk ekspor Z-up).
 * - rotationY : koreksi arah hadap dalam radian (model harus menghadap +Z).
 *               Contoh: `Math.PI` (180°), `Math.PI / 2` (90°), `-Math.PI / 2` (-90°).
 * - yOffset   : geser ketinggian dasar model secara vertikal (default 0).
 *
 * Properti tambahan khusus `knight`:
 * - walkUrl          : file animasi jalan terpisah (opsional). `null` = pakai klip dari `url`.
 * - walkClip         : nama (string) atau indeks (number) klip animasi jalan.
 * - walkSteps        : jumlah petak langkah dalam satu siklus klip jalan (Mixamo/rig 2 langkah = 2, one-step = 1).
 * - idleUrl          : file animasi diam terpisah (opsional, boleh Mixamo "Without Skin").
 * - idleClip         : nama (string) atau indeks (number) klip animasi diam (dari `idleUrl` atau `url`).
 * - jumpClip         : nama (string) atau indeks (number) klip animasi lompat di dalam `url` (opsional).
 * - includesPrincess : `true` jika model Kesatria sudah membawa Putri di dalamnya -> Putri terpisah disembunyikan.
 *
 * Properti tambahan khusus `princess`:
 * - offset    : posisi relatif [x, y, z] Putri di bahu/sekitar Kesatria jika dipasang terpisah.
 *               Catatan: bayangan Putri sengaja dinonaktifkan di engine (petunjuk halus plot twist).
 */
export const MODELS = {
  // Model kesatria + putri digendong: dimodelkan, di-rig & dianimasikan oleh tim (Ilyas Saputra).
  knight: {
    url: 'MainKnightRig.glb',
    walkClip: 'Walk',
    walkSteps: 2,
    idleClip: 'Idle',
    jumpClip: 'Jump',
    walkUrl: null,
    idleUrl: null,
    includesPrincess: true,
    height: 1.25,
    rotationX: 0,
    rotationY: 0,
    yOffset: 0,
  },

  // Saat `knight.includesPrincess` bernilai `true`, Putri sudah ada di dalam `MainKnightRig.glb`.
  // Jika ingin memasang model Putri terpisah (mis. `'assets/models/princess.glb'`),
  // ubah `knight.includesPrincess` ke `false` lalu isi `princess.url`.
  princess: {
    url: null, // Contoh: 'assets/models/princess.glb'
    height: 0.35,
    rotationX: 0,
    rotationY: 0,
    yOffset: 0,
    offset: [0, 0.62, -0.24],
  },

  monster: {
    url: null, // Contoh: 'assets/models/monster.glb'
    height: 0.9,
    rotationX: 0,
    rotationY: 0,
    yOffset: 0,
  },

  golem: {
    url: null, // Contoh: 'assets/models/golem.glb'
    height: 1.1,
    rotationX: 0,
    rotationY: 0,
    yOffset: 0,
  },
};

/**
 * Konfigurasi tekstur permukaan papan 3D (.png / .jpg / .webp).
 *
 * Tiap slot menerima salah satu dari 3 bentuk berikut:
 * 1. `null`                              -> warna solid tema bawaan (tanpa tekstur).
 * 2. `'assets/textures/floor.png'`       -> string path gambar; warna material `0xffffff` (warna asli gambar).
 * 3. `{ url, repeat: [1, 1], tint }`     -> objek dengan opsi tambahan:
 *    - url    : path file relatif terhadap index.html.
 *    - repeat : [u, v] pengulangan UV (default [1, 1]).
 *    - tint   : warna pengali (default `0xffffff` agar warna tekstur asli terjaga),
 *               atau `'theme'` agar tekstur abu-abu/netral otomatis mengikuti palet warna bab!
 */
export const TEXTURES = {
  default: {
    floor: null,     // permukaan atas petak lantai
    floorSide: null, // sisi samping petak lantai
    wall: null,      // sisi samping dinding
    wallTop: null,   // permukaan atas dinding
    water: null,     // permukaan sungai/air
    wood: null,      // papan jembatan kayu
    metal: null,     // duri, gerbang besi, batang tuas
    gold: null,      // gerbang tujuan emas
  },

  // Override opsional per bab (1..5), digabung di atas `default`.
  // Contoh:
  // 1: { floor: { url: 'assets/textures/stone.png', tint: 'theme' } },
  stages: {
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
  },
};
