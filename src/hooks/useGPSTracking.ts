import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";
import { Vehicle } from "@/components/MapContainer";

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_GPS = "agv/gps";
const TOPIC_BATTERY = "agv/battery";

export const getHeadingText = (heading: number): string => {
  if (heading >= 337.5 || heading < 22.5)  return "Utara ⬆️";
  if (heading >= 22.5  && heading < 67.5)  return "Timur Laut ↗️";
  if (heading >= 67.5  && heading < 112.5) return "Timur ➡️";
  if (heading >= 112.5 && heading < 157.5) return "Tenggara ↘️";
  if (heading >= 157.5 && heading < 202.5) return "Selatan ⬇️";
  if (heading >= 202.5 && heading < 247.5) return "Barat Daya ↙️";
  if (heading >= 247.5 && heading < 292.5) return "Barat ⬅️";
  if (heading >= 292.5 && heading < 337.5) return "Barat Laut ↖️";
  return "Utara ⬆️";
};

export const getSpeedText = (speed: number): string => {
  if (speed <= 0)  return "Berhenti 🛑";
  if (speed < 5)   return "Sangat Pelan 🐢";
  if (speed < 15)  return "Pelan 🚶";
  if (speed < 30)  return "Sedang 🚗";
  return "Cepat 🚀";
};

export const getLocationName = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "id" } }
    );
    const data = await res.json();
    return (
      data.address?.building ||
      data.address?.amenity ||
      data.address?.road ||
      data.address?.neighbourhood ||
      data.address?.suburb ||
      data.address?.city ||
      data.display_name?.split(",")[0] ||
      "Lokasi tidak diketahui"
    );
  } catch {
    return "Gagal mendapat lokasi";
  }
};

export const useGPSTracking = () => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>("Menunggu GPS...");

  const lastGeocodeRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, {
      clientId: `agv_frontend_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
    });

    client.on("connect", () => {
      setIsConnected(true);
      client.subscribe(TOPIC_GPS);
      client.subscribe(TOPIC_BATTERY);
    });

    client.on("message", (topic, message) => {
      try {
        if (topic === TOPIC_GPS) {
          const data = JSON.parse(message.toString());

          setVehicle({
            id: 1,
            lat: data.lat,
            lng: data.lng,
            heading: data.heading ?? 0,
            speed: data.speed ?? 0,
            label: "AGV 1",
          });

          setIsTrackingActive(true);

          // Reverse geocoding hanya jika pindah > ~50 meter
          const last = lastGeocodeRef.current;
          const shouldUpdate =
            !last ||
            Math.abs(data.lat - last.lat) > 0.0005 ||
            Math.abs(data.lng - last.lng) > 0.0005;

          if (shouldUpdate) {
            lastGeocodeRef.current = { lat: data.lat, lng: data.lng };
            getLocationName(data.lat, data.lng).then(setLocationName);
          }
        }

        if (topic === TOPIC_BATTERY) {
          const raw = message.toString();
          try {
            const parsed = JSON.parse(raw);
            setBattery(typeof parsed === "number" ? parsed : parsed.battery ?? null);
          } catch {
            setBattery(parseFloat(raw));
          }
        }
      } catch (e) {
        console.error("❌ Format data tidak valid:", e);
      }
    });

    client.on("disconnect", () => {
      setIsConnected(false);
      setIsTrackingActive(false);
    });

    client.on("error", (err) => {
      console.error("MQTT Error:", err);
    });

    return () => {
      client.end();
    };
  }, []);

  return { vehicle, isConnected, isTrackingActive, battery, locationName };
};