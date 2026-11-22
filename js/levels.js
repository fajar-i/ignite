// ============================================================
//  Data 5 stage (lihat Bab 5 dokumen desain).
//  Peta: lihat legenda di world.js -> parseLevel().
//  startDir: 0 utara, 1 timur, 2 selatan, 3 barat.
//  time / stars dalam detik: stars = [batas 3 bintang, 2 bintang, 1 bintang].
//  solution: solusi acuan (diuji otomatis oleh tools/validate.mjs).
// ============================================================

// Langkah aman satu petak: dipakai di Stage 3.
const STEP_SAFE = ['jika', 'monster',
  [['jika', 'sleep', ['maju'], ['tunggu']]],
  [['jika', 'trap', ['lompat'], ['maju']]],
];
// Langkah aman untuk golem (Bab 5): golem yang tertidur harus dilompati, bukan Maju.
const STEP_SAFE_GOLEM = ['jika', 'monster',
  [['jika', 'sleep', ['lompat'], ['tunggu']]],
  [['jika', 'trap', ['lompat'], ['maju']]],
];

export const LEVELS = [
  {
    id: 1,
    name: 'Menara Atas',
    concept: 'Urutan perintah (sequence)',
    engineering: 'Struktur bangunan: tangga, lantai, dan titik runtuh',
    subtheme: 'Satu langkah kecil: setiap blok adalah satu langkah kesatria',
    blocks: ['move', 'left', 'right'],
    limit: null,
    time: 195, stars: [75, 120, 180],
    theme: {
      bg: '#1c1a24', sky: 'senja', top: '#4f4757', side: '#2f2a36', wall: '#3d3545', light: 0xffb070,
      music: { root: 57, tempo: 70, notes: [0, 3, 7, 3, 10, 7, 3, null, 0, 5, 8, 5, 7, null, 3, null] },
    },
    map: [
      '#######',
      '#S. ..#',
      '#.#. .#',
      '#...#.#',
      '###.E.#',
      '#######',
    ],
    startDir: 1,
    solution: ['kanan', 'maju', 'maju', 'kiri', 'maju', 'maju', 'kanan', 'maju', 'kiri', 'maju'],
  },
  {
    id: 2,
    name: 'Lorong Perpustakaan Tua',
    concept: 'Perulangan (loop)',
    engineering: 'Pola dan efisiensi: mengotomatiskan pekerjaan berulang',
    subtheme: 'Satu langkah kecil, diulang: pola kecil membangun jalan panjang',
    blocks: ['move', 'left', 'right', 'jump', 'repeat'],
    limit: 6,
    time: 195, stars: [75, 120, 180],
    theme: {
      bg: '#221b14', sky: 'biru', top: '#5c4a36', side: '#3a2c1f', wall: '#5a3622', light: 0xffe2b0,
      music: { root: 62, tempo: 80, notes: [0, 7, 12, 7, 9, 5, 9, null, 2, 9, 14, 9, 7, 4, 0, null] },
    },
    map: [
      '################',
      '#S.^..^..^..^.E#',
      '################',
    ],
    startDir: 1,
    solution: [['ulangi', 4, ['maju', 'lompat']], 'maju'],
  },
  {
    id: 3,
    name: 'Ruang Mesin Jam',
    concept: 'Percabangan (if / else) dan sensor',
    engineering: 'Mekanisme, tuas, dan sistem kontrol dengan sensor',
    subtheme: 'Sebab akibat: hasil sensor (sebab) menentukan tindakan (akibat)',
    blocks: ['move', 'left', 'right', 'jump', 'repeat', 'if', 'lever', 'wait'],
    limit: null,
    time: 300, stars: [120, 180, 270],
    monsterKind: 'monster',
    monsterCycle: { awake: 2, sleep: 2 },
    theme: {
      bg: '#162026', sky: 'perak', top: '#5d6368', side: '#363c41', wall: '#7a6430', light: 0xdde6ff,
      music: { root: 60, tempo: 100, notes: [0, null, 7, null, 0, null, 7, 6, 0, null, 7, null, 3, null, 2, null] },
    },
    map: [
      '##########',
      '#S..^.M.1#',
      '########X#',
      '#E.^.M...#',
      '##########',
    ],
    startDir: 1,
    solution: [['ulangi', 10, [STEP_SAFE]], 'tuas', 'kanan', 'maju', 'maju', 'kanan', ['ulangi', 10, [STEP_SAFE]]],
  },
  {
    id: 4,
    name: 'Ruang Bawah Tanah dan Sungai Racun',
    concept: 'Fungsi (prosedur)',
    engineering: 'Modularitas: komponen yang bisa dipakai ulang',
    subtheme: 'Sebab akibat: tarik tuas (sebab), jembatan turun (akibat)',
    blocks: ['move', 'left', 'right', 'jump', 'repeat', 'if', 'lever', 'wait', 'call'],
    limit: 13,
    time: 300, stars: [120, 180, 270],
    fnName: 'Seberangi',
    theme: {
      bg: '#0d1714', sky: 'rimba', top: '#3d4c43', side: '#25302a', wall: '#2b3530', river: '#2fae5c', light: 0xa8ffcc,
      music: { root: 55, tempo: 62, notes: [0, null, 3, null, 2, null, -2, null, 0, null, 7, null, 5, 3, 2, null] },
    },
    map: [
      '##############',
      '~S1a~a.~~~~~~~',
      '~~~~~~2~~~~~~~',
      '~~~~~~b~~~~~~~',
      '~~~~~~~~~~~~~~',
      '~~~~~~b~~~~~~~',
      '~~~~~~.3c~c.E~',
      '##############',
    ],
    startDir: 1,
    solution: ['maju', 'panggil', 'kanan', 'maju', 'panggil', 'kiri', 'maju', 'panggil', 'maju'],
    solutionFn: ['tuas', 'maju', 'lompat', 'maju'],
  },
  {
    id: 5,
    name: 'Gerbang Kastil dan Jembatan Angkat',
    concept: 'Gabungan semua konsep + debugging',
    engineering: 'Debugging dan perbaikan sistem: jembatan angkat',
    subtheme: 'Sebab akibat: telusuri akibat yang salah kembali ke sebabnya',
    blocks: ['move', 'left', 'right', 'jump', 'repeat', 'if', 'lever', 'wait', 'call'],
    limit: null,
    time: 360, stars: [150, 225, 330],
    monsterKind: 'golem',
    monsterCycle: { awake: 2, sleep: 2 },
    theme: {
      bg: '#2a2238', sky: 'mawar', top: '#6e6658', side: '#463f36', wall: '#7a6f62', river: '#2d6cdf', light: 0xffc9a0,
      music: { root: 60, tempo: 112, notes: [0, 4, 7, 12, 7, 4, 9, 7, 5, 9, 12, 9, 7, 11, 14, null] },
    },
    map: [
      '#########',
      '#S.^.M.1#',
      '#######a#',
      '~~~~~~~a~',
      '~~~~~~E.~',
      '~~~~~~~~~',
    ],
    startDir: 1,
    // Program bawaan berisi 3 bug: pakai Maju (bukan Lompat) saat golem tidur, salah belok, loop berlebih.
    initialProgram: [
      ['ulangi', 6, [['jika', 'monster',
        [['jika', 'sleep', ['maju'], ['tunggu']]],
        [['jika', 'trap', ['lompat'], ['maju']]]]]],
      'kiri', 'tuas', ['ulangi', 4, ['maju']], 'kanan', 'maju',
    ],
    solution: [['ulangi', 6, [STEP_SAFE_GOLEM]], 'kanan', 'tuas', ['ulangi', 3, ['maju']], 'kanan', 'maju'],
  },
];
