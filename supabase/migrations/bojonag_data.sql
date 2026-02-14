-- ============================================================================
-- BOJONGSOANG TRAVEL - COMPLETE RESET & SEED SCRIPT
-- SAFE VERSION (NO RELATION ERROR)
-- ============================================================================

-- 0️⃣ Pastikan tabel ada dulu
CREATE TABLE IF NOT EXISTS public.koridor (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  warna TEXT NOT NULL,
  jadwal JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.halte (
  id SERIAL PRIMARY KEY,
  koridor_id INTEGER REFERENCES public.koridor(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  urutan INTEGER NOT NULL
);

-- ============================================================================
-- 1️⃣ Bersihkan data lama + reset ID
-- ============================================================================

TRUNCATE TABLE public.halte, public.koridor RESTART IDENTITY CASCADE;

-- ============================================================================
-- 2️⃣ Insert Koridor
-- ============================================================================

INSERT INTO public.koridor (id, nama, warna, jadwal) VALUES
(1,'Baleendah - BEC (via Bojongsoang)','#EF4444','{"hariKerja":"04:30 - 20:00 WIB","hariLibur":"05:00 - 19:00 WIB","frekuensi":"10-15 menit"}'),
(2,'BEC - Baleendah (via Bojongsoang)','#3B82F6','{"hariKerja":"04:30 - 20:00 WIB","hariLibur":"05:00 - 19:00 WIB","frekuensi":"10-15 menit"}'),
(3,'Leuwipanjang - Majalaya (via Bojongsoang)','#10B981','{"hariKerja":"05:00 - 19:30 WIB","hariLibur":"05:30 - 19:00 WIB","frekuensi":"15-20 menit"}'),
(4,'Angkot Rute Buahbatu - Dayeuhkolot','#F59E0B','{"hariKerja":"05:00 - 21:00 WIB","hariLibur":"05:30 - 20:00 WIB","frekuensi":"Setiap saat"}'),
(5,'Angkot Rute Ciparay - Tegallega','#8B5CF6','{"hariKerja":"04:00 - 22:00 WIB","hariLibur":"05:00 - 21:00 WIB","frekuensi":"Setiap saat"}'),
(6,'Angkot Rute Majalaya - Kalapa','#EC4899','{"hariKerja":"03:00 - 23:00 WIB","hariLibur":"04:00 - 22:00 WIB","frekuensi":"Setiap saat"}'),
(7,'Koridor 7 Bojongsoang','#06B6D4','{"hariKerja":"05:45 - 20:00 WIB","hariLibur":"06:15 - 19:00 WIB","frekuensi":"20-25 menit"}'),
(8,'Koridor 8 Bojongsoang','#14B8A6','{"hariKerja":"05:45 - 20:00 WIB","hariLibur":"06:15 - 19:00 WIB","frekuensi":"20-25 menit"}'),
(9,'Koridor 9 Bojongsoang','#EAB308','{"hariKerja":"05:00 - 21:30 WIB","hariLibur":"05:30 - 21:00 WIB","frekuensi":"10-20 menit"}'),
(10,'Koridor 10 Bojongsoang','#A855F7','{"hariKerja":"05:00 - 21:30 WIB","hariLibur":"05:30 - 21:00 WIB","frekuensi":"10-20 menit"}');

-- ============================================================================
-- 3️⃣ Insert Halte (Sample Core Data)
-- ============================================================================
-- (Saya berikan struktur lengkap, Anda bisa extend sesuai kebutuhan)

INSERT INTO public.halte (koridor_id,nama,lat,lng,urutan) VALUES
-- Koridor 1
(1,'Baleendah',-7.063889,107.633333,1),
(1,'Borma Bojongsoang',-7.0250,107.6350,2),
(1,'Taman Tegallega',-6.920833,107.619444,3),
(1,'Alun-alun Bandung',-6.921389,107.606944,4),
(1,'Stasiun Bandung',-6.914744,107.609810,5),
(1,'BEC (Bandung Electronic Center)',-6.905833,107.605000,6),

-- Koridor 2
(2,'BEC (Bandung Electronic Center)',-6.905833,107.605000,1),
(2,'Alun-alun Bandung',-6.921389,107.606944,2),
(2,'Pasar Kordon',-6.995000,107.610000,3),
(2,'Baleendah',-7.063889,107.633333,4),

-- Koridor 3
(3,'Terminal Leuwipanjang',-6.973056,107.575278,1),
(3,'Pasar Baleendah',-7.063889,107.633333,2),
(3,'Terminal Majalaya',-7.130000,107.660000,3),

-- Koridor 4
(4,'Buah Batu',-6.985000,107.600000,1),
(4,'Telkom University',-7.015000,107.625000,2),
(4,'Dayeuhkolot',-7.050000,107.650000,3),

-- Placeholder koridor 7–10
(7,'Terminal A',-7.025000,107.635000,1),
(8,'Terminal A',-7.020000,107.630000,1),
(9,'Terminal A',-7.015000,107.625000,1),
(10,'Terminal A',-7.010000,107.620000,1);

-- ============================================================================
-- DONE
-- ============================================================================
