import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { RouteCoordinate, getRouteBetweenPoints, getRouteDistance, calculateRouteDistance } from "@/lib/routing";
import { Halte, Koridor } from "@/data/corridorData";
import { MapPin, Navigation, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { corridorService } from "@/services/corridorService";

interface RoutePlannerProps {
  onRouteFound: (route: RouteCoordinate[], start: Halte, end: Halte, distance: number) => void;
  onClearRoute: () => void;
}

interface RouteResult {
  route: RouteCoordinate[];
  start: Halte;
  end: Halte;
  distance: number;
}

const RoutePlanner = ({ onRouteFound, onClearRoute }: RoutePlannerProps) => {
  const [startHalte, setStartHalte] = useState<string>("");
  const [endHalte, setEndHalte] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  // ✅ PERBAIKAN: Fetch data dari Supabase
  const { data: koridorData = [], isLoading: isLoadingKoridor } = useQuery({
    queryKey: ["koridors"],
    queryFn: corridorService.getAllCorridors,
  });

  // Group halte by koridor
  const halteByKoridor = koridorData.map((koridor) => ({
    koridor,
    halte: koridor.halte.map((halte) => ({
      ...halte,
      koridorId: koridor.id,
      koridorNama: koridor.nama,
      koridorWarna: koridor.warna,
    })),
  }));

  const handleSearchRoute = async () => {
    if (!startHalte || !endHalte) {
      toast.error("Pilih halte asal dan tujuan terlebih dahulu");
      return;
    }

    if (startHalte === endHalte) {
      toast.error("Halte asal dan tujuan tidak boleh sama");
      return;
    }

    setIsLoading(true);

    try {
      // Find halte from all koridor
      let start: typeof halteByKoridor[0]['halte'][0] | undefined;
      let end: typeof halteByKoridor[0]['halte'][0] | undefined;
      
      for (const group of halteByKoridor) {
        const foundStart = group.halte.find((h) => `${h.nama}|${h.lat}|${h.lng}` === startHalte);
        const foundEnd = group.halte.find((h) => `${h.nama}|${h.lat}|${h.lng}` === endHalte);
        if (foundStart) start = foundStart;
        if (foundEnd) end = foundEnd;
      }

      if (!start || !end) {
        toast.error("Halte tidak ditemukan");
        setIsLoading(false);
        return;
      }

      const startCoord: RouteCoordinate = { lat: start.lat, lng: start.lng };
      const endCoord: RouteCoordinate = { lat: end.lat, lng: end.lng };

      // Get route
      const route = await getRouteBetweenPoints(startCoord, endCoord);

      // Get distance from API (more accurate)
      let distance = await getRouteDistance(startCoord, endCoord);
      
      // Fallback to calculated distance if API fails
      if (distance === null) {
        distance = calculateRouteDistance(route);
      }

      const result: RouteResult = {
        route,
        start: { nama: start.nama, lat: start.lat, lng: start.lng },
        end: { nama: end.nama, lat: end.lat, lng: end.lng },
        distance,
      };

      setRouteResult(result);
      onRouteFound(route, result.start, result.end, distance);
      toast.success(`Rute ditemukan! Jarak: ${distance.toFixed(2)} km`);
    } catch (error) {
      console.error("Error finding route:", error);
      toast.error("Gagal mencari rute. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setStartHalte("");
    setEndHalte("");
    setRouteResult(null);
    onClearRoute();
    toast.info("Rute dihapus");
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Cari Rute
            </CardTitle>
            <CardDescription>Pilih halte asal dan tujuan untuk melihat rute</CardDescription>
          </div>
          {routeResult && (
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-500" />
            Halte Asal
          </label>
          <Select value={startHalte} onValueChange={setStartHalte} disabled={isLoading || isLoadingKoridor}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingKoridor ? "Memuat data..." : "Pilih halte asal"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {halteByKoridor.map((group) => (
                <SelectGroup key={group.koridor.id}>
                  <SelectLabel className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.koridor.warna }}
                    />
                    {group.koridor.nama}
                  </SelectLabel>
                  {group.halte.map((halte) => (
                    <SelectItem
                      key={`${halte.nama}|${halte.lat}|${halte.lng}`}
                      value={`${halte.nama}|${halte.lat}|${halte.lng}`}
                    >
                      {halte.nama}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            Halte Tujuan
          </label>
          <Select value={endHalte} onValueChange={setEndHalte} disabled={isLoading || isLoadingKoridor}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingKoridor ? "Memuat data..." : "Pilih halte tujuan"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {halteByKoridor.map((group) => (
                <SelectGroup key={group.koridor.id}>
                  <SelectLabel className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.koridor.warna }}
                    />
                    {group.koridor.nama}
                  </SelectLabel>
                  {group.halte.map((halte) => (
                    <SelectItem
                      key={`${halte.nama}|${halte.lat}|${halte.lng}`}
                      value={`${halte.nama}|${halte.lat}|${halte.lng}`}
                    >
                      {halte.nama}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSearchRoute}
          disabled={isLoading || isLoadingKoridor || !startHalte || !endHalte}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mencari rute...
            </>
          ) : (
            <>
              <Navigation className="mr-2 h-4 w-4" />
              Cari Rute
            </>
          )}
        </Button>

        {routeResult && (
          <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Dari</p>
                <p className="font-medium text-sm">{routeResult.start.nama}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Ke</p>
                <p className="font-medium text-sm">{routeResult.end.nama}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Jarak</p>
              <p className="font-bold text-lg text-primary">
                {routeResult.distance.toFixed(2)} km
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoutePlanner;