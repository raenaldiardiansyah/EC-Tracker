import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCompleteRouteWithRateLimit, RouteCoordinate } from "@/lib/routing";
import { Halte, Koridor } from "@/data/corridorData";
import { Vehicle } from "@/hooks/useTrackingSimulation";

interface MapContainerProps {
  selectedKoridor: number | null;
  onMarkerClick: (koridorId: number) => void;
  customRoute?: RouteCoordinate[] | null;
  customRouteStart?: Halte | null;
  customRouteEnd?: Halte | null;
  vehicles?: Vehicle[];
  isTrackingActive?: boolean;
  onRoutesCacheUpdate?: (cache: Map<number, RouteCoordinate[]>) => void;
  searchedLocation?: { lat: number; lng: number; displayName: string } | null;
  koridorData?: Koridor[];
  visibleStops?: Halte[] | null;
}

const MapContainer = ({ selectedKoridor, onMarkerClick, customRoute, customRouteStart, customRouteEnd, vehicles = [], isTrackingActive = false, onRoutesCacheUpdate, searchedLocation, koridorData = [], visibleStops = null }: MapContainerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const customRoutePolylineRef = useRef<L.Polyline | null>(null);
  const customRouteMarkersRef = useRef<L.Marker[]>([]);
  const vehicleMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const searchedLocationMarkerRef = useRef<L.Marker | null>(null);
  const [routesCache, setRoutesCache] = useState<Map<number, RouteCoordinate[]>>(new Map());
  const [loadingRoutes, setLoadingRoutes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Bojongsoang, Bandung area
    const map = L.map(mapRef.current).setView([-7.0250, 107.6350], 13);

    // Base layers: OpenStreetMap, Google Maps (jalan), dan Google Satelit (hybrid)
    const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });

    const googleStreetsLayer = L.tileLayer(
      "https://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}",
      {
        maxZoom: 19,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    );

    const googleHybridLayer = L.tileLayer(
      "https://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}",
      {
        maxZoom: 19,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    );

    const googleTrafficLayer = L.tileLayer(
      "https://{s}.google.com/vt?lyrs=m,traffic&x={x}&y={y}&z={z}",
      {
        maxZoom: 19,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    );

    // Default: OSM ditampilkan
    osmLayer.addTo(map);

    // Kontrol untuk memilih basemap
    L.control
      .layers(
        {
          "Open Street Map": osmLayer,
          "Google Maps": googleStreetsLayer,
          "Satelit": googleHybridLayer,
          "Google Traffic": googleTrafficLayer,
        },
        undefined,
        { position: "topright", collapsed: false }
      )
      .addTo(map);

    mapInstanceRef.current = map;

    // Create markers and polylines for all corridors
    createMarkersAndPolylines(map);

    return () => {
      map.remove();
    };
  }, []);

  // Update markers when koridorData changes (e.g. after fetching from Supabase)
  useEffect(() => {
    if (mapInstanceRef.current && koridorData.length > 0) {
      createMarkersAndPolylines(mapInstanceRef.current);
    }
  }, [koridorData, visibleStops]);

  const createMarkersAndPolylines = async (map: L.Map) => {
    // Clear existing markers and polylines
    markersRef.current.forEach((marker) => marker.remove());
    polylinesRef.current.forEach((polyline) => polyline.remove());
    markersRef.current = [];
    polylinesRef.current = [];

    for (const koridor of koridorData) {
      let path: [number, number][];

      // Check jika sudah ada cache routing
      if (routesCache.has(koridor.id)) {
        const cachedRoute = routesCache.get(koridor.id)!;
        path = cachedRoute.map((coord) => [coord.lat, coord.lng] as [number, number]);
      } else {
        // Tampilkan garis lurus sementara
        path = koridor.halte.map((halte) => [halte.lat, halte.lng] as [number, number]);

        // Mulai proses routing di background
        if (!loadingRoutes.has(koridor.id)) {
          setLoadingRoutes(prev => new Set(prev).add(koridor.id));

          const stops = koridor.halte.map((halte) => ({ lat: halte.lat, lng: halte.lng }));

          getCompleteRouteWithRateLimit(stops, (progress) => {
            if (progress === 100) {
              console.log(`Route loaded for ${koridor.nama}`);
            }
          })
            .then((routedPath) => {
              // Simpan cache
              setRoutesCache(prev => {
                const newCache = new Map(prev);
                newCache.set(koridor.id, routedPath);
                if (onRoutesCacheUpdate) {
                  onRoutesCacheUpdate(newCache);
                }
                return newCache;
              });
              setLoadingRoutes(prev => {
                const newSet = new Set(prev);
                newSet.delete(koridor.id);
                return newSet;
              });

              // Update polyline existing menjadi rute jalan
              const polylineIndex = koridorData.findIndex(k => k.id === koridor.id);
              if (polylineIndex !== -1 && polylinesRef.current[polylineIndex]) {
                const newPath = routedPath.map((coord) => [coord.lat, coord.lng] as [number, number]);
                polylinesRef.current[polylineIndex].setLatLngs(newPath);
              }
            })
            .catch(error => {
              console.error(`Failed to load route for ${koridor.nama}:`, error);
              setLoadingRoutes(prev => {
                const newSet = new Set(prev);
                newSet.delete(koridor.id);
                return newSet;
              });
            });
        }
      }

      // Gambar polyline (bisa lurus sementara atau hasil cache)
      const polyline = L.polyline(path, {
        color: koridor.warna,
        weight: 3,
        opacity: 0.8,
      }).addTo(map);

      polylinesRef.current.push(polyline);

      // Create markers for stops
      koridor.halte.forEach((halte) => {
        // If visibleStops is active, check if this halte should be shown
        if (visibleStops) {
          const isVisible = visibleStops.some(v => v.nama === halte.nama && Math.abs(v.lat - halte.lat) < 0.0001 && Math.abs(v.lng - halte.lng) < 0.0001);
          if (!isVisible) return;
        }

        // Create custom icon
        const icon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              width: 16px;
              height: 16px;
              background-color: ${koridor.warna};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        // Create detailed popup content with dark mode support
        const popupContent = `
          <div class="popup-content" style="padding: 12px; min-width: 240px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid ${koridor.warna}60;">
              <div style="width: 14px; height: 14px; background-color: ${koridor.warna}; border-radius: 50%; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
              <h3 style="font-weight: bold; margin: 0; font-size: 17px; line-height: 1.3;">${halte.nama}</h3>
            </div>
            
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 6px 0; color: ${koridor.warna}; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                🚌 ${koridor.nama}
              </p>
              <p style="margin: 0; font-size: 11px; opacity: 0.7;">
                Koridor ID: <strong>${koridor.id}</strong> • Total <strong>${koridor.halte.length}</strong> Halte
              </p>
            </div>
            
            <div style="background: rgba(0,0,0,0.03); padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 3px solid ${koridor.warna};">
              <p style="margin: 0 0 8px 0; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.9;">
                📅 Jadwal Operasional
              </p>
              <div style="margin-left: 2px; space-y: 6px;">
                <div style="margin-bottom: 6px;">
                  <p style="margin: 0; font-size: 11px; opacity: 0.85;">
                    <span style="font-weight: 600; display: inline-block; min-width: 75px;">Hari Kerja:</span>
                    <span style="color: ${koridor.warna}; font-weight: 600;">${koridor.jadwal.hariKerja}</span>
                  </p>
                </div>
                <div style="margin-bottom: 6px;">
                  <p style="margin: 0; font-size: 11px; opacity: 0.85;">
                    <span style="font-weight: 600; display: inline-block; min-width: 75px;">Hari Libur:</span>
                    <span style="color: ${koridor.warna}; font-weight: 600;">${koridor.jadwal.hariLibur}</span>
                  </p>
                </div>
                <div>
                  <p style="margin: 0; font-size: 11px; opacity: 0.85;">
                    <span style="font-weight: 600; display: inline-block; min-width: 75px;">Frekuensi:</span>
                    <span style="color: ${koridor.warna}; font-weight: 600;">Setiap ${koridor.jadwal.frekuensi}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.1);">
              <div style="width: 6px; height: 6px; background-color: ${koridor.warna}; border-radius: 50%; flex-shrink: 0;"></div>
              <p style="margin: 0; font-size: 10px; opacity: 0.6; font-style: italic;">
                Klik untuk melihat rute koridor lengkap
              </p>
            </div>
          </div>
        `;

        const marker = L.marker([halte.lat, halte.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent, {
            maxWidth: 250,
            className: 'custom-popup'
          });

        marker.on("click", () => {
          onMarkerClick(koridor.id);
        });

        markersRef.current.push(marker);
      });
    }
  };

  // Recreate polylines when routes are loaded
  useEffect(() => {
    if (!mapInstanceRef.current || loadingRoutes.size > 0) return;

    // Check if all routes are cached
    const allRoutesCached = koridorData.every(koridor => routesCache.has(koridor.id));

    if (allRoutesCached && polylinesRef.current.length === 0) {
      createMarkersAndPolylines(mapInstanceRef.current);
    }
  }, [routesCache, loadingRoutes]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // If custom route is active, hide all corridors
    if (customRoute && customRoute.length > 0) {
      markersRef.current.forEach((marker) => marker.remove());
      polylinesRef.current.forEach((polyline) => polyline.remove());
      return;
    }

    // Update visibility based on selected corridor
    if (selectedKoridor === null) {
      // Show all corridors
      markersRef.current.forEach((marker) => {
        if (!marker.getElement()?.parentElement) {
          marker.addTo(map);
        }
      });
      polylinesRef.current.forEach((polyline) => {
        if (!polyline.getElement()?.parentElement) {
          polyline.addTo(map);
        }
        polyline.setStyle({
          weight: 3,
          opacity: 0.8,
        });
      });

      // Reset to Bojongsoang view
      map.setView([-7.0250, 107.6350], 13);
    } else {
      // Show only selected corridor
      const koridor = koridorData.find((k) => k.id === selectedKoridor);
      if (!koridor) return;

      const selectedIndex = selectedKoridor - 1;
      const bounds = L.latLngBounds([]);

      // Calculate which corridor each marker belongs to
      let markerKoridorMap: number[] = [];
      koridorData.forEach((koridor, koridorIdx) => {
        koridor.halte.forEach(() => {
          markerKoridorMap.push(koridorIdx);
        });
      });

      markersRef.current.forEach((marker, index) => {
        const koridorIndex = markerKoridorMap[index];
        if (koridorIndex === selectedIndex) {
          if (!marker.getElement()?.parentElement) {
            marker.addTo(map);
          }
          bounds.extend(marker.getLatLng());
        } else {
          marker.remove();
        }
      });

      polylinesRef.current.forEach((polyline, index) => {
        if (index === selectedIndex) {
          if (!polyline.getElement()?.parentElement) {
            polyline.addTo(map);
          }
          polyline.setStyle({
            weight: 5,
            opacity: 1,
          });
        } else {
          polyline.remove();
        }
      });

      // Zoom to fit selected corridor
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [selectedKoridor, customRoute]);

  // Handle custom route display
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing custom route
    if (customRoutePolylineRef.current) {
      customRoutePolylineRef.current.remove();
      customRoutePolylineRef.current = null;
    }
    customRouteMarkersRef.current.forEach((marker) => marker.remove());
    customRouteMarkersRef.current = [];

    if (customRoute && customRoute.length > 0 && customRouteStart && customRouteEnd) {
      // Draw custom route polyline
      const path = customRoute.map((coord) => [coord.lat, coord.lng] as [number, number]);
      const customPolyline = L.polyline(path, {
        color: "#10B981",
        weight: 5,
        opacity: 0.9,
        dashArray: "10, 5",
      }).addTo(map);

      customRoutePolylineRef.current = customPolyline;

      // Add start marker
      const startIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background-color: #10B981;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 12px;
          ">A</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const startMarker = L.marker([customRouteStart.lat, customRouteStart.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup(
          `
          <div style="color: #1a1f2e; padding: 4px;">
            <h3 style="font-weight: bold; margin: 0 0 4px 0; font-size: 14px;">${customRouteStart.nama}</h3>
            <p style="margin: 0; color: #10B981; font-weight: 600; font-size: 12px;">Halte Asal</p>
          </div>
        `
        );

      customRouteMarkersRef.current.push(startMarker);

      // Add end marker
      const endIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background-color: #EF4444;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 12px;
          ">B</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const endMarker = L.marker([customRouteEnd.lat, customRouteEnd.lng], { icon: endIcon })
        .addTo(map)
        .bindPopup(
          `
          <div style="color: #1a1f2e; padding: 4px;">
            <h3 style="font-weight: bold; margin: 0 0 4px 0; font-size: 14px;">${customRouteEnd.nama}</h3>
            <p style="margin: 0; color: #EF4444; font-weight: 600; font-size: 12px;">Halte Tujuan</p>
          </div>
        `
        );

      customRouteMarkersRef.current.push(endMarker);

      // Fit map to show the entire route
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [100, 100] });
    }
  }, [customRoute, customRouteStart, customRouteEnd]);

  // Handle vehicle markers for tracking simulation
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Remove all existing vehicle markers
    vehicleMarkersRef.current.forEach((marker) => {
      marker.remove();
    });
    vehicleMarkersRef.current.clear();

    if (isTrackingActive && vehicles.length > 0) {
      vehicles.forEach((vehicle) => {
        const koridor = koridorData.find((k) => k.id === vehicle.koridorId);
        if (!koridor) return;

        // Create vehicle icon (bus icon)
        const vehicleIcon = L.divIcon({
          className: "vehicle-marker",
          html: `
            <div style="
              position: relative;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 24px;
                height: 24px;
                background-color: ${vehicle.color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 11px;
                position: relative;
              ">
                🚌
                <div style="
                  position: absolute;
                  top: -2px;
                  right: -2px;
                  width: 8px;
                  height: 8px;
                  background-color: #10B981;
                  border: 2px solid white;
                  border-radius: 50%;
                  animation: pulse 2s infinite;
                "></div>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([vehicle.position.lat, vehicle.position.lng], {
          icon: vehicleIcon,
          zIndexOffset: 1000, // Make sure vehicles appear above other markers
        })
          .addTo(map)
          .bindPopup(
            `
            <div style="color: #1a1f2e; padding: 8px; min-width: 200px; font-family: system-ui, sans-serif;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid ${vehicle.color}60;">
                <div style="width: 12px; height: 12px; background-color: ${vehicle.color}; border-radius: 50%;"></div>
                <h3 style="font-weight: bold; margin: 0; font-size: 15px;">Armada #${vehicle.id}</h3>
              </div>
              
              <div style="margin-bottom: 8px;">
                <p style="margin: 0 0 4px 0; color: ${vehicle.color}; font-weight: 700; font-size: 12px; text-transform: uppercase;">
                  🚌 ${koridor.nama}
                </p>
                <p style="margin: 0; font-size: 11px; opacity: 0.7;">
                  Koridor ID: <strong>${vehicle.koridorId}</strong>
                </p>
              </div>
              
              <div style="background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 6px; border-left: 3px solid #10B981;">
                <p style="margin: 0; font-size: 11px; color: #059669; font-weight: 600;">
                  ✅ Sedang Beroperasi
                </p>
                <p style="margin: 4px 0 0 0; font-size: 10px; opacity: 0.7;">
                  Posisi: ${vehicle.position.lat.toFixed(6)}, ${vehicle.position.lng.toFixed(6)}
                </p>
              </div>
            </div>
          `,
            {
              className: "vehicle-popup",
            }
          );

        vehicleMarkersRef.current.set(vehicle.id, marker);
      });
    }

    return () => {
      vehicleMarkersRef.current.forEach((marker) => {
        marker.remove();
      });
      vehicleMarkersRef.current.clear();
    };
  }, [vehicles, isTrackingActive]);

  // Update vehicle positions smoothly
  useEffect(() => {
    if (!isTrackingActive || vehicles.length === 0) return;

    vehicles.forEach((vehicle) => {
      const marker = vehicleMarkersRef.current.get(vehicle.id);
      if (marker) {
        marker.setLatLng([vehicle.position.lat, vehicle.position.lng]);
      }
    });
  }, [vehicles, isTrackingActive]);

  // Handle searched location
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove existing searched marker
    if (searchedLocationMarkerRef.current) {
      searchedLocationMarkerRef.current.remove();
      searchedLocationMarkerRef.current = null;
    }

    if (searchedLocation) {
      const { lat, lng, displayName } = searchedLocation;

      const icon = L.divIcon({
        className: "search-marker",
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 32px;
              height: 32px;
              background-color: #3B82F6;
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background-color: white;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="padding: 4px; max-width: 200px;">
            <p style="margin: 0; font-weight: 600; font-family: system-ui;">${displayName}</p>
          </div>
        `)
        .openPopup();

      searchedLocationMarkerRef.current = marker;

      map.flyTo([lat, lng], 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [searchedLocation]);

  // Loading UI dihilangkan sesuai permintaan: tidak menampilkan toast atau overlay

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg z-0" />
      {/* Overlay loading dihilangkan */}
    </div>
  );
};

export default MapContainer;