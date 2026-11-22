// ============================================================
//  Cerita, dialog, dan hint (Bab 3 & 6.3).
//  Nama tokoh masih placeholder -> ganti di NAMES.
// ============================================================

export const GAME_TITLE = 'Eyes for the Nameless';
export const NAMES = {
  princess: 'Putri',
  knight: 'Nameless Knight',
  king: 'Raja',
  land: 'Negeri yang Terlupakan',
};

// Gambar karakter dialog disimpan di assets/portraits/<nama>.png (latar transparan).
// portrait: path PNG (null = pakai ikon emoji), side: 'left' | 'right' | 'center',
// flip: true untuk membalik arah hadap gambar secara horizontal.
// Ikon cadangan (dipakai bila potret tidak ada/gagal dimuat): Lucide static
// (https://lucide.dev, lisensi ISC; lihat assets/licenses/lucide-LICENSE.txt)
const lucide = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON_CROWN = lucide('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /><path d="M5 21h14" />'); // lucide: crown
const ICON_SHIELD = lucide('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />'); // lucide: shield
const ICON_SCROLL = lucide('<path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />'); // lucide: scroll-text

export const SPEAKERS = {
  princess: { name: NAMES.princess, icon: ICON_CROWN,  portrait: 'assets/portraits/princess.png', side: 'right', flip: false },
  knight:   { name: NAMES.knight,   icon: ICON_SHIELD, portrait: 'assets/portraits/knight.png',   side: 'left',  flip: true },
  narrator: { name: 'Narator',      icon: ICON_SCROLL, portrait: null,                            side: 'center', flip: false },
};

export const PROLOG = [
  'Hiduplah seorang putri di sebuah kerajaan ternama, di tanah yang indah dan megah. Suatu hari, sang putri berkelana ke Negeri yang Terlupakan untuk mencari Harta yang Terlupakan.',
  'Menurut cerita masyarakat, harta itu tersimpan di sebuah kastil tua yang telah usang. Sang putri menjelajahi kastil itu hingga tiba di menara tertingginya. Di sana, harta itu benar-benar ada.',
  'Namun harta itu menyimpan racun yang melumpuhkan kedua kakinya, dan sang putri pun terjebak di menara.',
  'Enam bulan berlalu tanpa kabar. Sang raja mengutus kesatria kepercayaannya—yang hanya dikenal sebagai Nameless Knight—untuk mencari putri. Ia menyusul ke Negeri yang Terlupakan dan menemukan kastil yang sama.',
  'Di dalam kastil, monster-monster bangkit dari jasad yang telah kehilangan jiwanya. Sang kesatria menumbangkan satu per satu hingga mencapai menara tertinggi.',
  'Sebelum ia sempat membuka pintu menara, seekor monster yang sengaja menunggu menjebaknya, dan kesatria itu kehilangan penglihatannya. Dari balik pintu, ia mendengar suara sang putri.',
  'Satu-satunya jalan keluar: penglihatan sang putri menjadi mata bagi sang kesatria. Maka kesatria itu menggendong sang putri dan memulai perjalanan keluar dari kastil.',
  '{pemain}, kamu adalah suara sang putri. Susun perintah, dan sang kesatria akan melangkah sesuai ucapanmu.',
];

export const EPILOG = [
  'Fajar menyingsing. Untuk pertama kalinya setelah sekian lama, udara terasa hangat.',
  'Nameless Knight dan sang putri kembali menuju tanah kelahiran mereka. Sang kesatria tersenyum: ia berhasil.',
  'Namun ada satu hal yang tidak diketahui sang kesatria.',
  'Yang ia gendong bukanlah sang putri, melainkan entitas terkutuk yang dapat meniru siapa pun, termasuk suaranya.',
  'Entitas itu telah tersegel ratusan tahun. Kini bebas, ia berencana menebar teror ke seluruh negeri.',
  'Terima kasih telah menjadi mata sang kesatria, {pemain}. Kisah ini... belum selesai.',
  'Bersambung...',
];
export const EPILOG_MOODS = ['dawn', 'dawn', 'hush', 'reveal', 'cursed', 'cursed', 'finale'];

// Dialog pembuka tiap stage. Beberapa kalimat putri adalah petunjuk halus plot twist (Bab 3.3 no. 5).
export const STAGE_INTRO = {
  1: [
    ['narrator', 'Bab pertama dimulai, {pemain}. Ingat: setiap perintahmu adalah satu langkah sang kesatria.'],
    ['knight', 'Aku tidak bisa melihat apa pun... Putri, kau masih di sana?'],
    ['princess', 'Aku di punggungmu. Dengarkan suaraku. Aku akan menjadi matamu.'],
    ['princess', 'Lantai menara ini sudah rapuh. Ada lubang di beberapa tempat. Langkah demi langkah, ikuti urutan perintahku.'],
  ],
  2: [
    ['princess', 'Ini lorong perpustakaan tua. Ada jebakan duri yang berulang dengan pola yang sama.'],
    ['knight', 'Buku-buku ini... apa isinya, Putri?'],
    ['princess', 'Hanya catatan usang. Tidak penting. ...Terus saja jalan.'],
    ['princess', 'Polanya berulang. Daripada menyebutkan satu per satu, gunakan Ulangi.'],
  ],
  3: [
    ['knight', 'Bunyi detak ini... roda gigi. Semua ini mesin buatan manusia.'],
    ['princess', 'Ada monster penjaga. Mereka bergantian tidur dan bangun, dan aku tidak bisa menebak kapan.'],
    ['princess', 'Aku akan melaporkan apa yang kulihat. Gunakan Jika: kalau monster tertidur, lompati dengan Lompat. Kalau bangun, Tunggu.'],
    ['princess', 'Jangan melompat saat monster bangun. Ia akan menangkapmu! Tanyakan dulu padaku apakah ia tertidur.'],
    ['princess', 'Sudah lama sekali aku mendengar detak jam ini. ...Enam bulan, maksudku.'],
  ],
  4: [
    ['knight', 'Udaranya berbau racun. Kakiku mulai lemas.'],
    ['princess', 'Ada tiga jembatan di atas sungai racun. Cara menyeberanginya selalu sama.'],
    ['princess', 'Buat satu Fungsi untuk menyeberang, lalu panggil berulang kali.'],
    ['knight', 'Putri, tanganmu dingin sekali.'],
    ['princess', 'Racun itu... ya. Racun itu.'],
  ],
  5: [
    ['princess', 'Gerbang kastil! Tapi ada golem batu yang berjaga, dan jembatan angkatnya macet.'],
    ['princess', 'Hati-hati—tubuh golem batu terlalu besar untuk dilewati dengan Maju. Sama seperti monster di ruang mesin jam: saat ia tertidur, lompati dengan Lompat!'],
    ['princess', 'Aku sudah menyusun rencana, tapi sepertinya ada yang keliru. Coba jalankan, lalu perbaiki bagian yang salah.'],
    ['princess', 'Sedikit lagi. Sedikit lagi aku bebas... kita bebas.'],
  ],
};

// Hint bertingkat: umum -> spesifik -> sebagian solusi.
export const HINTS = {
  1: [
    'Bayangkan jalurnya dulu sebelum menyusun blok. Ke mana kesatria harus menghadap?',
    'Ada lubang dua langkah di depan. Belok kanan dulu, turun dua petak, lalu belok kiri.',
    'Awal solusi: Belok Kanan, Maju, Maju, Belok Kiri, Maju, Maju, ...',
  ],
  2: [
    'Lihat polanya: lantai, lalu duri. Lantai, lalu duri. Pola ini berulang.',
    'Maju satu petak, lalu Lompat melewati duri. Masukkan dua blok itu ke dalam Ulangi.',
    'Ulangi 4 kali { Maju, Lompat }, lalu satu Maju terakhir ke pintu.',
  ],
  3: [
    'Monster bangun dan tidur secara acak. Jangan menghafal waktu; tanyakan padaku setiap langkah. Monster yang tertidur dilompati.',
    'Jika ada monster di depan: Jika monster tertidur, Lompat; lainnya Tunggu. Jika tidak ada monster: Jika ada jebakan, Lompat; lainnya Maju.',
    'Bungkus satu "langkah aman" dalam Ulangi 10 kali. Setelah itu: Tarik Tuas, Belok Kanan, Maju, Maju, Belok Kanan, lalu langkah aman lagi.',
  ],
  4: [
    'Ketiga jembatan disusun sama: tuas, jembatan, papan patah, jembatan, daratan.',
    'Isi Fungsi dengan: Tarik Tuas, Maju, Lompat, Maju. Lalu panggil fungsi itu di tiap jembatan.',
    'Program utama: Maju, Panggil, Belok Kanan, Maju, Panggil, Belok Kiri, Maju, Panggil, Maju.',
  ],
  5: [
    'Jalankan dulu programnya dan perhatikan di mana kesatria tertahan atau gagal. Ingat: golem batu harus dilompati saat ia tertidur.',
    'Ada tiga bug: saat golem tertidur masih memakai Maju (seharusnya Lompat), satu belokan salah arah, dan satu perulangan yang kelebihan.',
    'Di dalam "Monster tertidur?", ganti Maju menjadi Lompat. Ganti Belok Kiri menjadi Belok Kanan. Ulangi Maju cukup 3 kali.',
  ],
};

export const FAIL_LINES = {
  fall: 'Hati-hati! Kita jatuh. Petak itu tidak punya pijakan.',
  river: 'Racun! Petak itu air, bukan jembatan. Apakah tuasnya sudah ditarik?',
  trap: 'Aduh, duri! Gunakan Lompat untuk melewatinya.',
  caught: 'Monster itu bangun dan menangkap kita! Tunggu sampai ia tertidur, lalu lompati.',
  golem: 'Golem batu terlalu besar untuk dilewati dengan Maju! Gunakan Lompat saat ia tertidur.',
  incomplete: 'Perintahnya habis, tapi kita belum sampai di pintu keluar.',
  steps: 'Perintahnya terlalu panjang atau berputar terus. Periksa perulanganmu.',
  depth: 'Fungsi itu memanggil dirinya sendiri terus-menerus. Jangan panggil fungsi di dalam dirinya sendiri.',
};

// Sub-tema "sebab akibat": kalimat akibat untuk tiap alasan gagal (sebabnya = blok yang disorot).
export const EFFECT_LINES = {
  fall: 'kesatria jatuh, karena petak itu tidak punya pijakan',
  river: 'kesatria tercebur ke sungai racun',
  trap: 'kesatria menginjak duri',
  caught: 'monster terbangun dan menangkap kesatria',
  golem: 'kesatria menabrak golem batu yang sedang tidur karena memakai Maju, bukan Lompat',
  incomplete: 'perintah habis sebelum kesatria sampai di pintu keluar',
  steps: 'program terus berputar dan tidak pernah selesai',
  depth: 'fungsi memanggil dirinya sendiri tanpa henti',
};

export const WIN_LINES = {
  1: 'Kita berhasil turun! Kau mulai percaya pada suaraku, bukan?',
  2: 'Lorongnya terlewati. Satu pola, diulang. Rapi sekali.',
  3: 'Mesinnya kita kalahkan dengan membaca keadaan. Seperti seorang insinyur.',
  4: 'Tiga jembatan, satu fungsi. Kau hemat tenaga.',
  5: 'Gerbangnya terbuka... Akhirnya. Akhirnya.',
};
