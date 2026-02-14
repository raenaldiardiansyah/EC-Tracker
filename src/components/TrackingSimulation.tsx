import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Koridor } from "@/data/corridorData";

interface TrackingSimulationProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  vehicles: Array<{
    id: number;
    koridorId: number;
    position: { lat: number; lng: number };
    color: string;
  }>;
  koridorData: Koridor[];
}

const TrackingSimulation = ({ isRunning, onStart, onStop, vehicles, koridorData }: TrackingSimulationProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const getKoridorName = (koridorId: number) => {
    const koridor = koridorData.find(k => k.id === koridorId);
    return koridor?.nama || `Koridor ${koridorId}`;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
              </div>
              Simulasi Live Tracking
            </CardTitle>
            <CardDescription>
              {isRunning 
                ? `${vehicles.length} armada sedang beroperasi (1 armada per koridor)` 
                : "Mulai simulasi tracking armada"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={onStart} className="flex-1" size="lg">
              <Play className="mr-2 h-4 w-4" />
              Start Simulation
            </Button>
          ) : (
            <Button onClick={onStop} variant="destructive" className="flex-1" size="lg">
              <Square className="mr-2 h-4 w-4" />
              Stop Simulation
            </Button>
          )}
        </div>

        {isRunning && vehicles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Armada Aktif ({vehicles.length})</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <RefreshCw className={`h-4 w-4 ${showDetails ? 'rotate-180' : ''} transition-transform`} />
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: vehicle.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Armada #{vehicle.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getKoridorName(vehicle.koridorId)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Aktif
                  </Badge>
                </div>
              ))}
            </div>

            {showDetails && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 Armada bergerak otomatis di sepanjang rute koridor. 
                  Klik marker armada di peta untuk melihat detail.
                </p>
              </div>
            )}
          </div>
        )}

        {!isRunning && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Simulasi akan menampilkan 1 armada per koridor yang bergerak di sepanjang rute.
              Pastikan rute koridor sudah dimuat sebelum memulai simulasi.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrackingSimulation;