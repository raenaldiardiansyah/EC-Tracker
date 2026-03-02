import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Vehicle {
  id: number;
  lat: number;
  lng: number;
  heading?: number; // derajat 0-360
  speed?: number;   // km/h
  label?: string;
}

interface MapContainerProps {
  vehicles?: Vehicle[];
  isTrackingActive?: boolean;
}

const MapContainer = ({
  vehicles = [],
  isTrackingActive = false,
}: MapContainerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const trailRef = useRef<Map<number, L.Polyline>>(new Map());
  const trailPointsRef = useRef<Map<number, [number, number][]>>(new Map());

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([-7.025, 107.635], 15);

    const osmLayer = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    );

    const googleStreetsLayer = L.tileLayer(
      "https://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}",
      { maxZoom: 19, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    const googleHybridLayer = L.tileLayer(
      "https://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}",
      { maxZoom: 19, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    const googleTrafficLayer = L.tileLayer(
      "https://{s}.google.com/vt?lyrs=m,traffic&x={x}&y={y}&z={z}",
      { maxZoom: 19, subdomains: ["mt0", "mt1", "mt2", "mt3"] }
    );

    osmLayer.addTo(map);

    L.control
      .layers(
        {
          "Open Street Map": osmLayer,
          "Google Maps": googleStreetsLayer,
          Satelit: googleHybridLayer,
          "Google Traffic": googleTrafficLayer,
        },
        undefined,
        { position: "topright", collapsed: false }
      )
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update vehicle markers & trail
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    vehicles.forEach((vehicle) => {
      const { id, lat, lng, heading = 0, speed = 0, label = `AGV ${id}` } = vehicle;

      // Buat icon panah sesuai heading
      const arrowIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            position: relative;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Lingkaran biru -->
            <div style="
              width: 36px;
              height: 36px;
              background: #2563EB;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              position: absolute;
            "></div>
            <!-- Panah arah -->
            <div style="
              position: absolute;
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-bottom: 18px solid white;
              transform: rotate(${heading}deg);
              transform-origin: center center;
              top: -2px;
            "></div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const popupContent = `
        <div style="font-family: system-ui; padding: 8px; min-width: 160px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 15px; color: #1e40af;">
            🚗 ${label}
          </h3>
          <p style="margin: 0 0 4px 0; font-size: 12px;">
            📍 <b>Lat:</b> ${lat.toFixed(6)}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 12px;">
            📍 <b>Lng:</b> ${lng.toFixed(6)}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 12px;">
            🧭 <b>Heading:</b> ${heading.toFixed(1)}°
          </p>
          <p style="margin: 0; font-size: 12px;">
            ⚡ <b>Kecepatan:</b> ${speed.toFixed(1)} km/h
          </p>
        </div>
      `;

      if (vehicleMarkersRef.current.has(id)) {
        // Update posisi & icon
        const marker = vehicleMarkersRef.current.get(id)!;
        marker.setLatLng([lat, lng]);
        marker.setIcon(arrowIcon);
        marker.getPopup()?.setContent(popupContent);
      } else {
        // Buat marker baru
        const marker = L.marker([lat, lng], { icon: arrowIcon })
          .addTo(map)
          .bindPopup(popupContent);
        vehicleMarkersRef.current.set(id, marker);
      }

      // Update trail (jejak rute)
      if (!trailPointsRef.current.has(id)) {
        trailPointsRef.current.set(id, []);
      }

      const points = trailPointsRef.current.get(id)!;
      points.push([lat, lng]);

      // Batasi trail max 200 titik
      if (points.length > 200) points.shift();

      if (trailRef.current.has(id)) {
        trailRef.current.get(id)!.setLatLngs(points);
      } else {
        const trail = L.polyline(points, {
          color: "#2563EB",
          weight: 3,
          opacity: 0.6,
          dashArray: "6, 4",
        }).addTo(map);
        trailRef.current.set(id, trail);
      }

      // Auto follow kendaraan saat tracking aktif
      if (isTrackingActive) {
        map.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    });
  }, [vehicles, isTrackingActive]);

  // Bersihkan trail saat tracking stop
  useEffect(() => {
    if (!isTrackingActive) {
      trailPointsRef.current.clear();
      trailRef.current.forEach((trail) => trail.remove());
      trailRef.current.clear();
    }
  }, [isTrackingActive]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full rounded-lg z-0" />

      {/* Badge status tracking */}
      {isTrackingActive && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1000,
            background: "#2563EB",
            color: "white",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: "#4ade80",
              borderRadius: "50%",
              display: "inline-block",
              animation: "pulse 1.5s infinite",
            }}
          />
          GPS Aktif
        </div>
      )}
    </div>
  );
};

export default MapContainer;