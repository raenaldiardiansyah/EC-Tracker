import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bus, Route, Clock, ArrowRight, Navigation, Camera, CalendarDays, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { koridorData } from "@/data/corridorData";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const totalStops = koridorData.reduce((acc, koridor) => acc + koridor.halte.length, 0);
  
  const stats = [
    { icon: Route, label: "Koridor Aktif", value: koridorData.length, color: "text-corridor-1" },
    { icon: MapPin, label: "Total Halte", value: totalStops, color: "text-corridor-2" },
    { icon: Bus, label: "Armada Modern", value: "50+", color: "text-corridor-3" },
    { icon: Clock, label: "Jam Operasional", value: "05:00-21:00", color: "text-corridor-4" },
  ];

  // --- PETUNJUK ---
  // 1. Pastikan foto-foto berikut ada di dalam folder `public/assets/gallery/`.
  //    - foto1.jpg, foto2.jpg, foto3.jpg, foto4.jpg, foto7.jpg, foto8.jpg
  //    - foto5.jpeg, foto6.jpeg
  //
  // 2. Anda bisa mengubah `alt` (teks alternatif) dan `caption` (keterangan) di bawah ini.
  const galleryData = [
    {
      src: "/assets/gallery/foto1.jpg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Armada Bus Modern",
    },
    {
      src: "/assets/gallery/foto2.jpg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Interior Nyaman",
    },
    {
      src: "/assets/gallery/foto3.jpg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Halte Modern",
    },
    {
      src: "/assets/gallery/foto4.jpg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Layanan Prima",
    },
    {
      src: "/assets/gallery/foto5.jpeg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Konektivitas Luas",
    },
    {
      src: "/assets/gallery/foto6.jpeg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Akses Mudah",
    },
    {
      src: "/assets/gallery/foto7.jpg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Perjalanan Aman",
    },
    {
      src: "/assets/gallery/foto8.jpg",
      alt: "Galeri Bojongsoang Travel 1",
      caption: "Tepat Waktu",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <Badge variant="secondary" className="mb-4">
              <Bus className="w-3 h-3 mr-2" />
              Transportasi Publik Bojongsoang
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Bojongsoang Travel
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Sistem transportasi bus terpadu berbasis wilayah yang menghubungkan titik-titik strategis di Kecamatan Bojongsoang secara nyaman, efisien, dan terintegrasi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="gap-2 hover-scale">
                <Link to="/map">
                  <Navigation className="w-4 h-4" />
                  Jelajahi Peta
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a href="#koridor">
                  <Route className="w-4 h-4" />
                  Lihat Rute
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          {stats.map((stat, index) => (
            <Card key={index} className="hover-scale transition-all hover:shadow-glow">
              <CardContent className="p-6 text-center">
                <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Corridors Section */}
      <section id="koridor" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">Koridor Bojongsoang Travel</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Pilih koridor untuk melihat detail rute dan halte yang dilalui
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {koridorData.map((koridor, index) => (
            <Card
              key={koridor.id}
              className="group hover-scale transition-all hover:shadow-glow cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: koridor.warna }}
                      />
                      {koridor.nama}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {koridor.halte.length} Halte
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{koridor.id}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Dari:</span>
                    <span className="font-medium truncate">{koridor.halte[0].nama}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-destructive" />
                    <span className="text-muted-foreground">Ke:</span>
                    <span className="font-medium truncate">
                      {koridor.halte[koridor.halte.length - 1].nama}
                    </span>
                  </div>
                  <Button asChild variant="ghost" className="w-full mt-4 group-hover:bg-accent">
                    <Link to={`/map?koridor=${koridor.id}`}>
                      Lihat di Peta
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Schedule Section */}
      <section id="jadwal" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">Jadwal Operasional</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Informasi jam layanan dan frekuensi kedatangan bus untuk setiap koridor.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {koridorData.map((koridor, index) => (
            <Card
              key={koridor.id}
              className="flex flex-col animate-fade-in hover-scale transition-all"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: koridor.warna }}
                  />
                  <span className="truncate">{koridor.nama}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Hari Kerja</p>
                    <p className="text-sm text-muted-foreground">{koridor.jadwal.hariKerja}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Hari Libur/Akhir Pekan</p>
                    <p className="text-sm text-muted-foreground">{koridor.jadwal.hariLibur}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Timer className="w-5 h-5 text-corridor-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Frekuensi</p>
                    <p className="text-sm text-muted-foreground">Setiap {koridor.jadwal.frekuensi}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-card/50 to-secondary/20 rounded-3xl mb-12">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="animate-fade-in">
            <h2 className="text-4xl font-bold mb-4">Kenapa Pilih Bojongsoang Travel?</h2>
            <p className="text-muted-foreground text-lg">
              Transportasi modern yang mengutamakan kenyamanan dan ketepatan waktu
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Bus,
                title: "Armada Modern",
                desc: "Bus nyaman dengan AC dan kursi empuk untuk perjalanan yang menyenangkan",
              },
              {
                icon: Clock,
                title: "Tepat Waktu",
                desc: "Jadwal teratur dan on-time untuk kemudahan perencanaan perjalanan Anda",
              },
              {
                icon: MapPin,
                title: "Rute Lengkap",
                desc: "Menghubungkan titik-titik strategis di Kecamatan Bojongsoang dengan jaringan terintegrasi",
              },
            ].map((feature, index) => (
              <Card key={index} className="hover-scale animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeri" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">Galeri Bojongsoang Travel</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lihat lebih dekat fasilitas dan layanan kami melalui koleksi foto.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {galleryData.map((photo, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-4">
                <h3 className="text-white font-semibold text-lg">{photo.caption}</h3>
              </div>
              <div className="absolute top-2 right-2 bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-3xl mx-auto bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
          <CardContent className="p-12">
            <h2 className="text-3xl font-bold mb-4">Siap Memulai Perjalanan?</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Jelajahi peta interaktif untuk melihat semua rute Bojongsoang Travel
            </p>
            <Button asChild size="lg" className="gap-2 hover-scale">
              <Link to="/map">
                <Navigation className="w-5 h-5" />
                Buka Peta Interaktif
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Home;
