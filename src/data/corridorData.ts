export interface Halte {
  nama: string;
  lat: number;
  lng: number;
}

export interface Jadwal {
  hariKerja: string;
  hariLibur: string;
  frekuensi: string;
}

export interface Koridor {
  id: number;
  nama: string;
  warna: string;
  halte: Halte[];
  jadwal: Jadwal;
}

export const koridorData: Koridor[] = [
  {
    id: 1,
    nama: "Baleendah - BEC (via Bojongsoang)",
    warna: "#EF4444",
    jadwal: {
      hariKerja: "04:30 - 20:00 WIB",
      hariLibur: "05:00 - 19:00 WIB",
      frekuensi: "10-15 menit",
    },
    halte: [
      { nama: "Baleendah", lat: -7.063889, lng: 107.633333 },
      { nama: "Masjid Al-Amanah", lat: -7.055556, lng: 107.620833 },
      { nama: "Matahari Land", lat: -7.050000, lng: 107.615000 },
      { nama: "Masjid Jami Baitul Huda", lat: -7.045000, lng: 107.610000 },
      { nama: "Bubur Ayam Haji Amid", lat: -7.040000, lng: 107.605000 },
      { nama: "Borma Bojongsoang", lat: -7.0250, lng: 107.6350 },
      { nama: "SD Negeri Lengkong", lat: -7.020000, lng: 107.630000 },
      { nama: "Puskesmas Bojongsoang", lat: -7.015000, lng: 107.625000 },
      { nama: "Bluebird Bojongsoang", lat: -7.010000, lng: 107.620000 },
      { nama: "Pasar Kordon", lat: -6.995000, lng: 107.610000 },
      { nama: "JAPNAS", lat: -6.990000, lng: 107.605000 },
      { nama: "PT Medal Sekarwangi", lat: -6.985000, lng: 107.600000 },
      { nama: "Bangunan Mart", lat: -6.980000, lng: 107.595000 },
      { nama: "LPKIA", lat: -6.975000, lng: 107.590000 },
      { nama: "PT LEN Industri", lat: -6.970000, lng: 107.585000 },
      { nama: "PLN UP3 Bandung", lat: -6.965000, lng: 107.580000 },
      { nama: "Muhammad Toha", lat: -6.960000, lng: 107.575000 },
      { nama: "Sekolah Ganesha", lat: -6.955000, lng: 107.570000 },
      { nama: "Taman Tegallega", lat: -6.920833, lng: 107.619444 },
      { nama: "Sekolah Moh Toha", lat: -6.918000, lng: 107.617000 },
      { nama: "ITC Kebon Kelapa", lat: -6.915000, lng: 107.615000 },
      { nama: "Grand Yogya Kepatihan", lat: -6.912000, lng: 107.613000 },
      { nama: "Alun-alun Bandung", lat: -6.921389, lng: 107.606944 },
      { nama: "Banceuy", lat: -6.919000, lng: 107.605000 },
      { nama: "Stasiun Timur", lat: -6.917000, lng: 107.604000 },
      { nama: "Stasiun Bandung", lat: -6.914744, lng: 107.609810 },
      { nama: "SMAN 6 Bandung", lat: -6.912000, lng: 107.608000 },
      { nama: "SDN Pajajaran", lat: -6.910000, lng: 107.607000 },
      { nama: "STHB", lat: -6.908000, lng: 107.606000 },
      { nama: "BEC (Bandung Electronic Center)", lat: -6.905833, lng: 107.605000 },
    ],
  },
  {
    id: 2,
    nama: "BEC - Baleendah (via Bojongsoang)",
    warna: "#3B82F6",
    jadwal: {
      hariKerja: "04:30 - 20:00 WIB",
      hariLibur: "05:00 - 19:00 WIB",
      frekuensi: "10-15 menit",
    },
    halte: [
      { nama: "BEC (Bandung Electronic Center)", lat: -6.905833, lng: 107.605000 },
      { nama: "Museum Kota Bandung", lat: -6.907000, lng: 107.606000 },
      { nama: "Merdeka", lat: -6.909000, lng: 107.607000 },
      { nama: "Alun-alun Bandung", lat: -6.921389, lng: 107.606944 },
      { nama: "Toko Mas ABC", lat: -6.923000, lng: 107.608000 },
      { nama: "Simpang Ijan", lat: -6.925000, lng: 107.610000 },
      { nama: "Lapangan Tegallega", lat: -6.920833, lng: 107.619444 },
      { nama: "PT INTI", lat: -6.928000, lng: 107.615000 },
      { nama: "Madurasa Tengah", lat: -6.930000, lng: 107.618000 },
      { nama: "PLN UP3 Bandung B", lat: -6.965000, lng: 107.580000 },
      { nama: "PT LEN Industri B", lat: -6.970000, lng: 107.585000 },
      { nama: "LPKIA B", lat: -6.975000, lng: 107.590000 },
      { nama: "Bangunan Mart B", lat: -6.980000, lng: 107.595000 },
      { nama: "Buah Batu", lat: -6.985000, lng: 107.600000 },
      { nama: "Swadarma BNI", lat: -6.988000, lng: 107.603000 },
      { nama: "Pasar Kordon B", lat: -6.995000, lng: 107.610000 },
      { nama: "Bluebird B", lat: -7.010000, lng: 107.620000 },
      { nama: "Puskesmas Kujangsari", lat: -7.012000, lng: 107.622000 },
      { nama: "Transmart Buah Batu", lat: -7.014000, lng: 107.624000 },
      { nama: "Permata Buah Batu", lat: -7.016000, lng: 107.626000 },
      { nama: "Podomoro", lat: -7.018000, lng: 107.628000 },
      { nama: "AHASS", lat: -7.020000, lng: 107.630000 },
      { nama: "Griya Bandung Asri", lat: -7.025000, lng: 107.633000 },
      { nama: "Alfamart SPBU Bojongsoang", lat: -7.028000, lng: 107.634000 },
      { nama: "Masjid Jami Baitul Huda B", lat: -7.045000, lng: 107.610000 },
      { nama: "Apotek K24", lat: -7.048000, lng: 107.612000 },
      { nama: "Kejari Bale Bandung", lat: -7.050000, lng: 107.614000 },
      { nama: "RS Al Ihsan", lat: -7.055000, lng: 107.618000 },
      { nama: "Baleendah", lat: -7.063889, lng: 107.633333 },
    ],
  },
  {
    id: 3,
    nama: "Leuwipanjang - Majalaya (via Bojongsoang)",
    warna: "#10B981",
    jadwal: {
      hariKerja: "05:00 - 19:30 WIB",
      hariLibur: "05:30 - 19:00 WIB",
      frekuensi: "15-20 menit",
    },
    halte: [
      { nama: "Terminal Leuwipanjang", lat: -6.973056, lng: 107.575278 },
      { nama: "RS Immanuel", lat: -6.968000, lng: 107.580000 },
      { nama: "PT INTI", lat: -6.928000, lng: 107.615000 },
      { nama: "Zipur Dayeuhkolot", lat: -7.000000, lng: 107.625000 },
      { nama: "Pasar Baleendah", lat: -7.063889, lng: 107.633333 },
      { nama: "Bumi Siliwangi", lat: -7.080000, lng: 107.640000 },
      { nama: "Area Bojongsoang Selatan", lat: -7.035000, lng: 107.638000 },
      { nama: "Terminal Ciparay", lat: -7.110000, lng: 107.650000 },
      { nama: "Terminal Majalaya", lat: -7.130000, lng: 107.660000 },
    ],
  },
  {
    id: 4,
    nama: "Angkot Rute Buahbatu - Dayeuhkolot (melewati Bojongsoang)",
    warna: "#F59E0B",
    jadwal: {
      hariKerja: "05:00 - 21:00 WIB",
      hariLibur: "05:30 - 20:00 WIB",
      frekuensi: "Setiap saat (sistem angkot)",
    },
    halte: [
      { nama: "Buah Batu", lat: -6.985000, lng: 107.600000 },
      { nama: "Jalan Terusan Buah Batu", lat: -6.995000, lng: 107.608000 },
      { nama: "Simpang Bojongsoang", lat: -7.020000, lng: 107.630000 },
      { nama: "Jalan Raya Bojongsoang", lat: -7.0250, lng: 107.6350 },
      { nama: "Sukabirus", lat: -7.030000, lng: 107.638000 },
      { nama: "Telkom University", lat: -7.015000, lng: 107.625000 },
      { nama: "Dayeuhkolot", lat: -7.050000, lng: 107.650000 },
    ],
  },
  {
    id: 5,
    nama: "Angkot Rute Ciparay - Tegallega (melewati Bojongsoang)",
    warna: "#8B5CF6",
    jadwal: {
      hariKerja: "04:00 - 22:00 WIB",
      hariLibur: "05:00 - 21:00 WIB",
      frekuensi: "Setiap saat (sistem angkot)",
    },
    halte: [
      { nama: "Terminal Ciparay", lat: -7.110000, lng: 107.650000 },
      { nama: "Baleendah", lat: -7.063889, lng: 107.633333 },
      { nama: "Simpang Bojongsoang", lat: -7.020000, lng: 107.630000 },
      { nama: "Jalan Bojongsoang", lat: -7.0250, lng: 107.6350 },
      { nama: "Buah Batu", lat: -6.985000, lng: 107.600000 },
      { nama: "Soekarno Hatta", lat: -6.940000, lng: 107.615000 },
      { nama: "Taman Tegallega", lat: -6.920833, lng: 107.619444 },
    ],
  },
  {
    id: 6,
    nama: "Angkot Rute Majalaya - Kalapa (melewati Bojongsoang)",
    warna: "#EC4899",
    jadwal: {
      hariKerja: "03:00 - 23:00 WIB",
      hariLibur: "04:00 - 22:00 WIB",
      frekuensi: "Setiap saat (sistem angkot)",
    },
    halte: [
      { nama: "Terminal Majalaya", lat: -7.130000, lng: 107.660000 },
      { nama: "Ibun", lat: -7.100000, lng: 107.655000 },
      { nama: "Baleendah", lat: -7.063889, lng: 107.633333 },
      { nama: "Griya Bandung Asri", lat: -7.025000, lng: 107.633000 },
      { nama: "Borma Bojongsoang", lat: -7.0250, lng: 107.6350 },
      { nama: "Pasar Kordon", lat: -6.995000, lng: 107.610000 },
      { nama: "Buah Batu", lat: -6.985000, lng: 107.600000 },
      { nama: "Kebon Kelapa", lat: -6.915000, lng: 107.615000 },
    ],
  },
];