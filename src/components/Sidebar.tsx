import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bus, X, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import RoutePlanner from "@/components/RoutePlanner";
import TrackingSimulation from "@/components/TrackingSimulation";
import { RouteCoordinate } from "@/lib/routing";
import { Koridor, Halte } from "@/data/corridorData";
import { Vehicle } from "@/hooks/useTrackingSimulation";

interface SidebarProps {
  selectedKoridor: number | null;
  onSelectKoridor: (id: number | null) => void;
  isOpen: boolean;
  onClose: () => void;
  onRouteFound?: (route: RouteCoordinate[], start: Halte, end: Halte, distance: number) => void;
  onClearRoute?: () => void;
  isTrackingActive?: boolean;
  onStartTracking?: () => void;
  onStopTracking?: () => void;
  vehicles?: Vehicle[];
  koridorList?: Koridor[];
  isLoading?: boolean;
}

const Sidebar = ({ 
  selectedKoridor, 
  onSelectKoridor, 
  isOpen, 
  onClose, 
  onRouteFound, 
  onClearRoute, 
  isTrackingActive = false, 
  onStartTracking, 
  onStopTracking, 
  vehicles = [], 
  koridorList = [], // ✅ PERBAIKAN: Default ke array kosong, bukan hardcoded data
  isLoading = false 
}: SidebarProps) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static top-0 left-0 h-full w-80 bg-card border-r border-border z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bus className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Bojongsoang Travel</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Pilih koridor bus untuk melihat rute dan halte
            </p>
          </div>

          {/* Scrollable Content Area - All features */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-6 pt-4 space-y-4">
              {/* Route Planner */}
              {onRouteFound && onClearRoute && (
                <div>
                  <RoutePlanner onRouteFound={onRouteFound} onClearRoute={onClearRoute} />
                </div>
              )}

              {/* Tracking Simulation */}
              {onStartTracking && onStopTracking && (
                <div>
                  <TrackingSimulation
                    isRunning={isTrackingActive}
                    onStart={onStartTracking}
                    onStop={onStopTracking}
                    vehicles={vehicles}
                    koridorData={koridorList} // ✅ PERBAIKAN: Gunakan koridorList dari props (data Supabase)
                  />
                </div>
              )}


              {/* Home Button */}
              <Link to="/" className="w-full">
                <Button variant="outline" className="w-full justify-start mb-2">
                  <Home className="mr-2 h-4 w-4" />
                  Beranda
                </Button>
              </Link>

              {/* All Corridors Button */}
              <Button
                variant={selectedKoridor === null ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => onSelectKoridor(null)}
              >
                <Bus className="mr-2 h-4 w-4" />
                Semua Koridor
              </Button>

              {/* Corridor List */}
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center text-sm py-4">Memuat data...</div>
                ) : koridorList.length === 0 ? (
                  <div className="text-center text-sm py-4 text-muted-foreground">
                    Tidak ada data koridor
                  </div>
                ) : (
                  koridorList.map((koridor) => (
                    <Card
                      key={koridor.id}
                      className={cn(
                        "p-4 cursor-pointer transition-all duration-200 hover:shadow-lg",
                        selectedKoridor === koridor.id
                          ? "ring-2 ring-primary shadow-glow"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => onSelectKoridor(koridor.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full ring-2 ring-white"
                          style={{ backgroundColor: koridor.warna }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{koridor.nama}</h3>
                          <p className="text-xs text-muted-foreground">
                            {koridor.halte.length} halte
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Legend */}
              {koridorList.length > 0 && (
                <div className="pt-4 mt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Legenda</h3>
                  <div className="space-y-2">
                    {koridorList.map((koridor) => (
                      <div key={koridor.id} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: koridor.warna }}
                        />
                        <span className="text-xs text-muted-foreground">{koridor.nama}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;