# Panduan Presentasi & Pembagian Peran Tim Bojongsoang Travel Route Mapper

Dokumen ini berisi poin-poin teknis untuk presentasi tugas besar, dibagi berdasarkan peran anggota tim.

---

## 👤 Orang 1: The Backend Engineer (Database)
**Fokus: Manajemen Data & Server**

### 🎯 Poin Bicara Utama:
1.  **Transformasi Data:**
    *   Jelaskan migrasi dari *hardcoded JSON* (lokal) ke **Cloud Database** menggunakan **Supabase (PostgreSQL)**.
    *   **Value:** Data bersifat dinamis, bisa diupdate kapan saja tanpa perlu *re-deploy* aplikasi.
2.  **Struktur Database Relasional:**
    *   Tabel `koridor`: Menyimpan metadata rute (Nama, Warna, Jadwal Operasional).
    *   Tabel `halte`: Menyimpan koordinat geospasial ratusan titik halte di Kecamatan Bojongsoang.
    *   Relasi: *One-to-Many* (Satu koridor memiliki banyak halte).
3.  **Real-time Update:**
    *   Perubahan data di sisi server langsung terefleksi di aplikasi klien saat itu juga.

### 📂 File Kunci:
*   `src/lib/supabase.ts` (Koneksi Client)
*   `supabase_full_migration.sql` (Skrip Database)

---

## 👤 Orang 2: The Frontend Designer (UI/UX)
**Fokus: Tampilan & Interaksi Pengguna**

### 🎯 Poin Bicara Utama:
1.  **Tech Stack Modern:**
    *   Dibangun dengan **React + Vite** untuk performa tinggi.
    *   **Tailwind CSS** untuk styling yang cepat dan responsif.
2.  **User Interface Premium:**
    *   Menggunakan komponen **Shadcn UI** (Card, Sheet/Sidebar, Button) untuk tampilan yang bersih dan profesional.
3.  **Mobile Responsiveness:**
    *   Desain adaptif: Sidebar menu di HP dapat disembunyikan (*collapsible*), mengutamakan tampilan peta.
4.  **User Experience (UX):**
    *   Alur pengguna yang mulus: Cari Lokasi -> Lihat Rekomendasi -> Klik -> Navigasi.

### 📂 File Kunci:
*   `src/components/Sidebar.tsx` (Navigasi Utama)
*   `src/pages/Index.tsx` (Layout Halaman Peta)
*   `src/components/SearchControl.tsx` (Pencarian)

---

## 👤 Orang 3: The GIS Specialist (Maps)
**Fokus: Visualisasi Peta & Spasial**

### 🎯 Poin Bicara Utama:
1.  **Map Engine:**
    *   Menggunakan **Leaflet JS** sebagai core peta interaktif yang ringan.
2.  **Multi-Layer System:**
    *   Fitur ganti *Basemap*: OpenStreetMap (Default), Google Satellite (Citra udara), dan **Google Traffic Layer** (Info kemacetan real-time).
3.  **Visualisasi Dinamis:**
    *   **Custom Markers:** Marker halte dibuat menggunakan CSS murni (bukan gambar statis) agar warnanya bisa mengikuti warna unik tiap koridor (Merah, Hijau, Biru).
    *   **Polylines:** Penggambaran garis rute yang tebal dan jelas diatas peta.
4.  **Interaktivitas:**
    *   Fly-to animations saat lokasi dicari atau marker diklik.

### 📂 File Kunci:
*   `src/components/MapContainer.tsx` (Komponen Peta Utama)

---

## 👤 Orang 4: The Algorithm Logic (Otak Sistem)
**Fokus: Logika Bisnis & Perhitungan**

### 🎯 Poin Bicara Utama:
1.  **Feature: Geocoding:**
    *   Integrasi **Nominatim API** untuk mengubah input teks (nama tempat di Bojongsoang) menjadi koordinat latitude/longitude secara otomatis.
2.  **Feature: Rekomendasi Halte Cerdas:**
    *   Menggunakan algoritma jarak **Haversine Formula** untuk menghitung jarak lurus dari posisi pengguna ke ratusan halte.
    *   Menampilkan 3 halte terdekat beserta estimasi waktu jalan kaki.
3.  **Feature: Smart Routing:**
    *   Jalur bus tidak ditarik garis lurus, melainkan mengikuti lekuk jalan raya menggunakan **OpenRouteService API**.
    *   **Snap-to-Road:** Memastikan titik halte menempel presisi di jalan, bukan melayang di bangunan.

### 📂 File Kunci:
*   `src/lib/routing.ts` (Logika Routing & Kalkulasi Jarak)

---

## 📍 Cakupan Wilayah
Sistem ini mencakup **Kecamatan Bojongsoang, Kabupaten Bandung** dengan 10 koridor yang menghubungkan berbagai titik strategis di wilayah tersebut.