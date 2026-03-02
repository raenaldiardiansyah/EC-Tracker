import { useState } from "react";
import { Link } from "react-router-dom";
import MapContainer from "@/components/MapContainer";
import { Button } from "@/components/ui/button";
import { Home, Navigation } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useGPSTracking } from "@/hooks/useGPSTracking";

const Index = () => {
  const { vehicle, isConnected, isTrackingActive } = useGPSTracking();

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card border-b border-border z-10">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link to="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-bold">AGV Tracker - Peta</h1>
          </div>

          {/* Status MQTT */}
          <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${
            isConnected
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isConnected ? "#16a34a" : "#dc2626",
              display: "inline-block"
            }} />
            {isConnected ? "MQTT Terhubung" : "MQTT Terputus"}
          </div>

          <ThemeToggle />
        </div>

        {/* Info Bar GPS - tampil saat ada data */}
        {vehicle && (
          <div className="flex flex-wrap items-center gap-4 px-6 py-2 bg-blue-600 text-white text-sm">
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              <b>AGV 1</b>
            </span>
            <span>📍 Lat: <b>{vehicle.lat.toFixed(6)}</b></span>
            <span>📍 Lng: <b>{vehicle.lng.toFixed(6)}</b></span>
            <span>🧭 Heading: <b>{vehicle.heading?.toFixed(1)}°</b></span>
            <span>⚡ Kecepatan: <b>{vehicle.speed?.toFixed(1)} km/h</b></span>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 p-4 relative">
          <MapContainer
            vehicles={vehicle ? [vehicle] : []}
            isTrackingActive={isTrackingActive}
          />

          {/* Waiting state - saat belum ada data GPS */}
          {!vehicle && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-card/90 backdrop-blur-sm border rounded-2xl px-8 py-6 text-center shadow-lg">
                <Navigation className="w-12 h-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
                <p className="font-semibold text-lg">Menunggu data GPS...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pastikan AGV sudah menyala dan terhubung ke MQTT
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Index;