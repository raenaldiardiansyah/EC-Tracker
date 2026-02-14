/**
 * Routing utilities using OSRM (OpenStreetMap Routing Machine)
 * Free routing service that follows actual roads
 */

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

// OpenRouteService API key
const ORS_API_KEY: string | undefined = import.meta.env?.VITE_ORS_API_KEY ?? "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJkZTQ0MjFjMWIyNDQyYTI4NjA5MzBmZDg1MmRjZDI1IiwiaCI6Im11cm11cjY0In0=";

/**
 * Cari titik terdekat pada jalan besar (motorway/trunk/primary/secondary)
 * menggunakan Overpass API. Jika gagal, kembalikan titik asli.
 */
export async function snapToMajorRoad(point: RouteCoordinate): Promise<RouteCoordinate> {
  try {
    // Coba radius bertingkat agar tetap cepat namun robust (lebih agresif)
    const radiuses = [300, 600, 1200];
    for (const radius of radiuses) {
      const query = `
        [out:json][timeout:10];
        (
          way(around:${radius},${point.lat},${point.lng})["highway"~"^(motorway|trunk|primary|secondary)$"];
        );
        out tags geom;`;

      const resp = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
      });

      const data = await resp.json();
      const ways: Array<{ tags?: { highway?: string }; geometry: Array<{ lat: number; lon: number }> }> = data?.elements?.filter((el: { type: string }) => el.type === "way") || [];

      if (ways.length === 0) continue;

      // Bobot prioritas per kelas jalan (lebih kecil = lebih diprioritaskan)
      const highwayWeight: Record<string, number> = {
        motorway: 0.5,
        trunk: 0.7,
        primary: 1.0,
        secondary: 1.3,
      };

      // Temukan titik proyeksi terbaik dengan skor (jarak^2 * bobot kelas)
      let bestScore = Number.POSITIVE_INFINITY;
      let bestPoint: RouteCoordinate | null = null;

      for (const way of ways) {
        const geom = way.geometry;
        const cls = way.tags?.highway || "secondary";
        const weight = highwayWeight[cls] ?? 1.5;
        for (let i = 0; i < geom.length - 1; i++) {
          const a = { lat: geom[i].lat, lng: geom[i].lon };
          const b = { lat: geom[i + 1].lat, lng: geom[i + 1].lon };
          const projected = projectPointOnSegment(point, a, b);
          const d2 = squaredDistance(point, projected);
          const score = d2 * weight;
          if (score < bestScore) {
            bestScore = score;
            bestPoint = projected;
          }
        }
      }

      if (bestPoint) {
        return bestPoint;
      }
    }

    // Fallback jika tidak ketemu jalan besar
    return point;
  } catch (e) {
    console.warn("snapToMajorRoad gagal:", e);
    return point;
  }
}

function squaredDistance(a: RouteCoordinate, b: RouteCoordinate): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

// Proyeksi titik ke segmen (koordinat geodesi diperlakukan sebagai planar lokal untuk jarak pendek)
function projectPointOnSegment(p: RouteCoordinate, a: RouteCoordinate, b: RouteCoordinate): RouteCoordinate {
  const ax = a.lng, ay = a.lat;
  const bx = b.lng, by = b.lat;
  const px = p.lng, py = p.lat;

  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;

  const vv = vx * vx + vy * vy;
  if (vv === 0) return a;

  let t = (wx * vx + wy * vy) / vv;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;

  return { lat: ay + t * vy, lng: ax + t * vx };
}

/**
 * Fetch route between two points using OSRM
 */
export async function getRouteBetweenPoints(
  start: RouteCoordinate,
  end: RouteCoordinate,
  profile: 'driving-car' | 'foot-walking' = 'driving-car'
): Promise<RouteCoordinate[]> {
  try {
    // 1) Coba OpenRouteService terlebih dahulu (Directions v2)
    if (ORS_API_KEY) {
      try {
        const orsResp = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ORS_API_KEY,
          },
          body: JSON.stringify({
            coordinates: [
              [start.lng, start.lat],
              [end.lng, end.lat],
            ],
            instructions: false,
            geometry_simplify: false,
            preference: "recommended",
          }),
        });

        if (orsResp.ok) {
          const orsData = await orsResp.json();
          const coords = orsData?.features?.[0]?.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length > 1) {
            return coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
          }
        }
      } catch (_) {
        // lanjut ke OSRM
      }
    }

    // 2) Fallback OSRM publik (multi-mirror + retry/backoff)
    // OSRM Public server usually supports 'driving', 'walking' might be under different endpoint or profile
    // Standard OSRM demo server profiles: /route/v1/driving, /route/v1/walking, /route/v1/cycling

    const osrmProfile = profile === 'foot-walking' ? 'walking' : 'driving';

    const baseUrls = [
      "https://router.project-osrm.org",
      "https://routing.openstreetmap.de/routed-car", // Note: routed-car might only support car
      "https://osrm.mfdz.de",
      "https://routing.anyways.eu/osrm",
    ];

    // For walking, some mirrors might not work, so we prioritize the main one
    const urlsToUse = profile === 'foot-walking'
      ? ["https://router.project-osrm.org"]
      : baseUrls;

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    for (const base of urlsToUse) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const url = `${base}/route/v1/${osrmProfile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=false`;
          const response = await fetch(url, { mode: "cors" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (data?.code === "Ok" && data.routes && data.routes.length > 0) {
            const coordinates = data.routes[0].geometry.coordinates;
            return coordinates.map((coord: number[]) => ({ lat: coord[1], lng: coord[0] }));
          }
        } catch (_) {
          await sleep(150 * Math.pow(2, attempt));
          continue;
        }
      }
    }

    // Fallback to straight line if routing fails
    return [start, end];
  } catch (error) {
    console.error("Routing error:", error);
    // Fallback to straight line
    return [start, end];
  }
}

/**
 * Get complete route path for multiple stops
 * This will fetch routes between consecutive stops
 */
export async function getCompleteRoute(
  stops: RouteCoordinate[]
): Promise<RouteCoordinate[]> {
  if (stops.length < 2) return stops;

  const allCoordinates: RouteCoordinate[] = [];

  // Fetch routes between consecutive stops
  for (let i = 0; i < stops.length - 1; i++) {
    const segment = await getRouteBetweenPoints(stops[i], stops[i + 1]);

    // Add coordinates, avoiding duplicates at connection points
    if (i === 0) {
      allCoordinates.push(...segment);
    } else {
      allCoordinates.push(...segment.slice(1));
    }
  }

  return allCoordinates;
}

/**
 * Batch routing with rate limiting
 * OSRM has rate limits, so we space out requests
 */
export async function getCompleteRouteWithRateLimit(
  stops: RouteCoordinate[],
  onProgress?: (progress: number) => void
): Promise<RouteCoordinate[]> {
  if (stops.length < 2) return stops;

  const allCoordinates: RouteCoordinate[] = [];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Coba satu kali request OpenRouteService untuk seluruh halte (lebih stabil)
  if (ORS_API_KEY) {
    try {
      const orsResp = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ORS_API_KEY,
        },
        body: JSON.stringify({
          coordinates: stops.map(s => [s.lng, s.lat]),
          instructions: false,
          geometry_simplify: false,
          preference: "recommended",
        }),
      });
      if (orsResp.ok) {
        const orsData = await orsResp.json();
        const coords = orsData?.features?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 1) {
          const route = coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
          if (onProgress) onProgress(100);
          return route;
        }
      }
    } catch (_) {
      // lanjut ke metode segmen
    }
  }

  // Snap seluruh titik ke jalan besar terlebih dahulu (rate-limited)
  const snappedStops: RouteCoordinate[] = [];
  for (let i = 0; i < stops.length; i++) {
    const snapped = await snapToMajorRoad(stops[i]);
    snappedStops.push(snapped);
    if (i < stops.length - 1) {
      await delay(80);
    }
  }

  for (let i = 0; i < snappedStops.length - 1; i++) {
    const segment = await getRouteBetweenPoints(snappedStops[i], snappedStops[i + 1]);

    if (i === 0) {
      allCoordinates.push(...segment);
    } else {
      allCoordinates.push(...segment.slice(1));
    }

    // Report progress
    if (onProgress) {
      const progress = ((i + 1) / (snappedStops.length - 1)) * 100;
      onProgress(progress);
    }

    // Small delay to respect rate limits (only if not the last segment)
    if (i < snappedStops.length - 2) {
      await delay(100);
    }
  }

  return allCoordinates;
}

/**
 * Calculate total distance of a route in kilometers using Haversine formula
 * This calculates the distance along the route path
 */
export function calculateRouteDistance(coordinates: RouteCoordinate[]): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const coord1 = coordinates[i];
    const coord2 = coordinates[i + 1];
    totalDistance += haversineDistance(coord1, coord2);
  }

  return totalDistance;
}

/**
 * Haversine formula to calculate distance between two coordinates in kilometers
 */
function haversineDistance(coord1: RouteCoordinate, coord2: RouteCoordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
    Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get route distance from routing API response (more accurate)
 * This extracts distance from OpenRouteService or OSRM response
 */
export async function getRouteDistance(
  start: RouteCoordinate,
  end: RouteCoordinate
): Promise<number | null> {
  try {
    // Try OpenRouteService first
    if (ORS_API_KEY) {
      try {
        const orsResp = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: ORS_API_KEY,
          },
          body: JSON.stringify({
            coordinates: [
              [start.lng, start.lat],
              [end.lng, end.lat],
            ],
            instructions: false,
            geometry_simplify: false,
            preference: "recommended",
          }),
        });

        if (orsResp.ok) {
          const orsData = await orsResp.json();
          const distance = orsData?.features?.[0]?.properties?.segments?.[0]?.distance;
          if (typeof distance === "number") {
            return distance / 1000; // Convert meters to kilometers
          }
        }
      } catch (_) {
        // Continue to OSRM
      }
    }

    // Try OSRM
    const baseUrls = [
      "https://router.project-osrm.org",
      "https://routing.openstreetmap.de/routed-car",
      "https://osrm.mfdz.de",
      "https://routing.anyways.eu/osrm",
    ];

    for (const base of baseUrls) {
      try {
        const url = `${base}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false&alternatives=false`;
        const response = await fetch(url, { mode: "cors" });
        if (response.ok) {
          const data = await response.json();
          if (data?.code === "Ok" && data.routes && data.routes.length > 0) {
            const distance = data.routes[0].distance;
            if (typeof distance === "number") {
              return distance / 1000; // Convert meters to kilometers
            }
          }
        }
      } catch (_) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting route distance:", error);
    return null;
  }
}

// --- NEARBY STOPS LOGIC ---

// ✅ PERBAIKAN: Hanya import types, bukan data
import { Halte, Koridor } from "@/data/corridorData";

export interface NearestHalte {
  halte: Halte;
  koridorId: number;
  koridorNama: string;
  koridorWarna: string;
  distanceMeter: number;
  walkTimeMinutes: number;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// ✅ PERBAIKAN: Tambah parameter koridorData
export function findNearestStops(
  userLat: number,
  userLng: number,
  koridorData: Koridor[], // ✅ Terima sebagai parameter, bukan hardcoded
  limit: number = 3
): NearestHalte[] {
  const allHalteDistance: NearestHalte[] = [];
  const WALKING_SPEED_KMH = 4.8; // Average walking speed

  koridorData.forEach((koridor) => {
    koridor.halte.forEach((halte) => {
      const distKm = getDistanceFromLatLonInKm(userLat, userLng, halte.lat, halte.lng);
      const walkTime = (distKm / WALKING_SPEED_KMH) * 60; // minutes

      allHalteDistance.push({
        halte: halte,
        koridorId: koridor.id,
        koridorNama: koridor.nama,
        koridorWarna: koridor.warna,
        distanceMeter: Math.round(distKm * 1000),
        walkTimeMinutes: Math.round(walkTime),
      });
    });
  });

  // Sort by distance ASC
  return allHalteDistance
    .sort((a, b) => a.distanceMeter - b.distanceMeter)
    .slice(0, limit);
}