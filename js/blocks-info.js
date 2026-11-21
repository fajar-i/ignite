// ============================================================
//  Kamus blok: ditampilkan saat pemain pertama kali mendapat blok baru.
//  example: program mini dalam format ringkas (lihat interpreter.js fromCompact).
//  fn: isi Fungsi untuk contoh (opsional).
// ============================================================
export const BLOCK_INFO = {
  move: {
    desc: 'Kesatria melangkah satu petak ke arah ia menghadap. Kalau di depannya tembok, ia hanya terbentur dan tetap di tempat.',
    example: ['maju', 'maju'],
    note: 'Kesatria maju dua petak lurus ke depan.',
    tip: 'Hati-hati: Maju ke lubang atau duri membuat kesatria gagal.',
  },
  left: {
    desc: 'Memutar arah hadap kesatria 90° ke kiri. Ia tidak berpindah petak, hanya berputar di tempat.',
    example: ['kiri', 'maju'],
    note: 'Kesatria menoleh ke kiri, lalu melangkah satu petak ke arah barunya.',
    tip: '"Kiri" dihitung dari arah hadap kesatria, bukan dari layar.',
  },
  right: {
    desc: 'Memutar arah hadap kesatria 90° ke kanan, tanpa berpindah petak.',
    example: ['kanan', 'maju', 'maju'],
    note: 'Kesatria berbelok ke kanan, lalu maju dua petak.',
    tip: 'Dua kali Belok Kanan = berbalik arah.',
  },
  jump: {
    desc: 'Melompati satu petak di depan (lubang, duri, atau sungai) dan mendarat dua petak di depan. Tidak bisa melompati tembok atau monster.',
    example: ['maju', 'lompat'],
    note: 'Kesatria maju, lalu melompati duri di depannya.',
    tip: 'Petak pendaratan harus aman, atau kesatria tetap gagal.',
  },
  repeat: {
    desc: 'Menjalankan blok-blok di dalamnya berulang kali. Ubah angkanya untuk menentukan berapa kali diulang.',
    example: [['ulangi', 3, ['maju']]],
    note: 'Sama dengan Maju, Maju, Maju, tapi cukup dua blok.',
    tip: 'Cari pola yang berulang di peta, lalu bungkus polanya dengan Ulangi.',
  },
  if: {
    desc: 'Bertanya pada putri tentang petak di depan. Kalau jawabannya benar, bagian "maka" dijalankan; kalau salah, bagian "lainnya".',
    example: [['jika', 'trap', ['lompat'], ['maju']]],
    note: 'Ada jebakan di depan? Lompat. Tidak ada? Cukup Maju.',
    tip: 'Pertanyaan: Ada jebakan di depan? · Ada monster di depan? · Monster tertidur?',
  },
  lever: {
    desc: 'Menarik tuas di petak tempat kesatria berdiri. Tuas membuka gerbang atau menurunkan jembatan dengan nomor yang sama.',
    example: ['maju', 'tuas', 'kanan', 'maju'],
    note: 'Kesatria berjalan ke tuas, menariknya, lalu lewat gerbang yang terbuka.',
    tip: 'Kesatria harus berdiri tepat di petak tuas.',
  },
  wait: {
    desc: 'Kesatria diam selama satu giliran. Berguna untuk menunggu monster tertidur.',
    example: [['jika', 'sleep', ['maju'], ['tunggu']]],
    note: 'Kalau monster tidur, lewat. Kalau masih bangun, tunggu dulu.',
    tip: 'Gabungkan dengan Ulangi agar kesatria terus bertanya sampai aman.',
  },
  call: {
    desc: 'Menjalankan isi Fungsi yang kamu susun di bawah program utama. Susun sekali, pakai berkali-kali.',
    fn: ['tuas', 'maju', 'lompat', 'maju'],
    fnName: 'Seberangi',
    example: ['panggil', 'kanan', 'panggil'],
    note: 'Fungsi "Seberangi" dipakai dua kali. Kalau caranya berubah, cukup ubah isi fungsinya.',
    tip: 'Inilah modularitas: komponen yang bisa dipakai ulang, seperti dalam engineering.',
  },
};
