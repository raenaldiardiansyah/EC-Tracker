import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import MapContainer from "@/components/MapContainer";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, Info, Home } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RouteCoordinate, findNearestStops, NearestHalte, getRouteBetweenPoints } from "@/lib/routing";
import { Halte } from "@/data/corridorData";
import TrackingSimulation from "@/components/TrackingSimulation";
import { useTrackingSimulation } from "@/hooks/useTrackingSimulation";
import { SearchControl } from "@/components/SearchControl";
import { useQuery } from "@tanstack/react-query";
import { corridorService } from "@/services/corridorService";
import ChatBot from "@/components/ChatBot";

const Index = () => {
  const [searchParams] = useSearchParams();
  const [selectedKoridor, setSelectedKoridor] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customRoute, setCustomRoute] = useState<RouteCoordinate[] | null>(null);
  const [customRouteStart, setCustomRouteStart] = useState<Halte | null>(null);
  const [customRouteEnd, setCustomRouteEnd] = useState<Halte | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [routesCache, setRoutesCacheState] = useState<Map<number, RouteCoordinate[]>>(new Map());
  const [searchedLocation, setSearchedLocation] = useState<{ lat: number; lng: number; displayName: string } | null>(null);
  const [nearestStops, setNearestStops] = useState<NearestHalte[]>([]);
  // State untuk tracking chatbot open/close
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Fetch data from Supabase
  const { data: koridors = [], isLoading } = useQuery({
    queryKey: ["koridors"],
    queryFn: corridorService.getAllCorridors,
  });

  const { vehicles, resetVehicles } = useTrackingSimulation({
    routesCache,
    isRunning: isTrackingActive,
    koridorData: koridors
  });

  // Handle URL parameters for direct corridor selection
  useEffect(() => {
    const koridorParam = searchParams.get("koridor");
    if (koridorParam) {
      const koridorId = parseInt(koridorParam);
      if (!isNaN(koridorId)) {
        setSelectedKoridor(koridorId);
        toast.info(`Koridor ${koridorId} dipilih`);
      }
    }
  }, [searchParams]);

  const handleSelectKoridor = (id: number | null) => {
    setSelectedKoridor(id);
    setSidebarOpen(false);

    if (customRoute) {
      handleClearRoute();
    }

    if (id === null) {
      toast.info("Menampilkan semua koridor");
    } else {
      toast.info(`Koridor ${id} dipilih`);
    }
  };

  const handleMarkerClick = (koridorId: number) => {
    setSelectedKoridor(koridorId);
    toast.info(`Koridor ${koridorId} dipilih dari marker`);
  };

  const handleRouteFound = (route: RouteCoordinate[], start: Halte, end: Halte, distance: number) => {
    setCustomRoute(route);
    setCustomRouteStart(start);
    setCustomRouteEnd(end);
    setSelectedKoridor(null);
  };

  const handleClearRoute = () => {
    setCustomRoute(null);
    setCustomRouteStart(null);
    setCustomRouteEnd(null);
  };

  const handleStartTracking = () => {
    if (routesCache.size === 0) {
      toast.warning("Tunggu rute koridor dimuat terlebih dahulu");
      return;
    }
    setIsTrackingActive(true);
    toast.success("Simulasi tracking dimulai");
  };

  const handleStopTracking = () => {
    setIsTrackingActive(false);
    resetVehicles();
    toast.info("Simulasi tracking dihentikan");
  };

  const handleShowWalkingRoute = async (stop: NearestHalte) => {
    if (!searchedLocation) return;

    toast.loading("Mencari rute jalan kaki...");
    try {
      const startForRoute = { lat: searchedLocation.lat, lng: searchedLocation.lng };
      const endForRoute = { lat: stop.halte.lat, lng: stop.halte.lng };

      const route = await getRouteBetweenPoints(startForRoute, endForRoute, 'foot-walking');

      setCustomRoute(route);
      setCustomRouteStart({ ...stop.halte, nama: "Lokasi Anda" });
      setCustomRouteEnd(stop.halte);
      toast.dismiss();
      toast.success(`Rute ke ${stop.halte.nama} ditampilkan`);
    } catch (e) {
      toast.dismiss();
      toast.error("Gagal memuat rute");
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        selectedKoridor={selectedKoridor}
        onSelectKoridor={handleSelectKoridor}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onRouteFound={handleRouteFound}
        onClearRoute={handleClearRoute}
        isTrackingActive={isTrackingActive}
        onStartTracking={handleStartTracking}
        onStopTracking={handleStopTracking}
        vehicles={vehicles}
        koridorList={koridors}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card border-b border-border z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link to="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
          </div>
          <h1 className="text-lg font-bold">Bojongsoang Travel - Peta</h1>
          <ThemeToggle />
        </div>

        {/* Map Container */}
        <div className="flex-1 p-4 relative">
          <MapContainer
            selectedKoridor={selectedKoridor}
            onMarkerClick={handleMarkerClick}
            customRoute={customRoute}
            customRouteStart={customRouteStart}
            customRouteEnd={customRouteEnd}
            vehicles={vehicles}
            isTrackingActive={isTrackingActive}
            onRoutesCacheUpdate={setRoutesCacheState}
            searchedLocation={searchedLocation}
            koridorData={koridors}
            visibleStops={searchedLocation && nearestStops.length > 0 ? nearestStops.map(n => n.halte) : null}
          />
          
          {/* Pass isChatbotOpen prop to SearchControl */}
          <SearchControl
            onLocationSelect={(lat, lng, displayName) => {
              setSearchedLocation({ lat, lng, displayName });
              setNearestStops(findNearestStops(lat, lng, koridors));
            }}
            isChatbotOpen={isChatbotOpen}
          />

          {/* Nearest Stops Card */}
          {/* Hide when chatbot is open */}
          {searchedLocation && nearestStops.length > 0 && !isChatbotOpen && (
            <div className="absolute top-24 left-6 z-10 w-full max-w-sm">
              <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 animate-in slide-in-from-left-2 duration-300">
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Halte Terdekat
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => {
                      setSearchedLocation(null);
                      setNearestStops([]);
                    }}
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {nearestStops.map((stop, idx) => (
                    <div key={idx} className="bg-background/50 rounded-md p-3 border hover:border-primary/50 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-sm">{stop.halte.nama}</div>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground whitespace-nowrap">
                          {stop.distanceMeter < 1000
                            ? `${stop.distanceMeter} m`
                            : `${(stop.distanceMeter / 1000).toFixed(1)} km`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stop.koridorWarna }}
                        />
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {stop.koridorNama}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          🚶 ±{stop.walkTimeMinutes} menit
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            handleShowWalkingRoute(stop);
                          }}
                        >
                          Lihat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Badge */}
        {/* Hide when chatbot is open */}
        {!isChatbotOpen && (
          <div className="absolute bottom-6 right-6 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg hidden lg:block z-10">
            <div className="flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Peta Interaktif</p>
                <p className="text-muted-foreground text-xs">
                  Klik marker atau pilih koridor
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pass onOpenChange callback to ChatBot */}
        <ChatBot onOpenChange={setIsChatbotOpen} />
      </div>
    </div>
  );
};

export default Index;