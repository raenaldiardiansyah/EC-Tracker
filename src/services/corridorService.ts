import { supabase } from "@/lib/supabase";
import { Koridor } from "@/data/corridorData";

export const corridorService = {
  async getAllCorridors(): Promise<Koridor[]> {
    // 1️⃣ Fetch Koridor
    const { data: koridors, error: koridorError } = await supabase
      .from("koridor")
      .select("*")
      .order("id", { ascending: true });

    if (koridorError) {
      console.error("Error fetching koridor:", koridorError);
      throw new Error("Gagal mengambil data koridor dari Supabase");
    }

    // 2️⃣ Fetch Halte
    const { data: haltes, error: halteError } = await supabase
      .from("halte")
      .select("*")
      .order("urutan", { ascending: true });

    if (halteError) {
      console.error("Error fetching halte:", halteError);
      throw new Error("Gagal mengambil data halte dari Supabase");
    }

    if (!koridors || !haltes) return [];

    // 3️⃣ Merge sesuai interface Koridor
    const mergedData: Koridor[] = koridors.map((k) => {
      let parsedJadwal = k.jadwal;

      // Jika JSONB berubah jadi string (edge case)
      if (typeof parsedJadwal === "string") {
        try {
          parsedJadwal = JSON.parse(parsedJadwal);
        } catch {
          parsedJadwal = {
            hariKerja: "-",
            hariLibur: "-",
            frekuensi: "-",
          };
        }
      }

      return {
        id: k.id,
        nama: k.nama,
        warna: k.warna,
        jadwal: parsedJadwal,
        halte: haltes
          .filter((h) => h.koridor_id === k.id)
          .map((h) => ({
            nama: h.nama,
            lat: h.lat,
            lng: h.lng,
          })),
      };
    });

    return mergedData;
  },
};
