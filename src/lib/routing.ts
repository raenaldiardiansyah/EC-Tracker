/**
 * Routing utilities with rate limiting and error handling
 */

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

const ORS_API_KEY: string | undefined =
  import.meta.env?.VITE_ORS_API_KEY ??
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImJkZTQ0MjFjMWIyNDQyYTI4NjA5MzBmZDg1MmRjZDI1IiwiaCI6Im11cm11cjY0In0=";

// Cache for API responses
const routeCache = new Map<string, RouteCoordinate[]>();
const snapCache = new Map<string, RouteCoordinate>();

// Rate limiting
let lastApiCall = 0;
const MIN_DELAY_MS = 200;

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastCall));
  }
  lastApiCall = Date.now();
}

/**
 * Snap point to major road with error handling and caching
 */
export async function snapToMajorRoad(point: RouteCoordinate): Promise<RouteCoordinate> {
  const cacheKey = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;

  if (snapCache.has(cacheKey)) {
    return snapCache.get(cacheKey)!;
  }

  try {
    await waitForRateLimit();

    const radiuses = [300, 600, 1200];

    for (const radius of radiuses) {
      const query = `
        [out:json][timeout:10];
        (
          way(around:${radius},${point.lat},${point.lng})["highway"~"^(motorway|trunk|primary|secondary)$"];
        );
        out tags geom;`;

      try {
        const resp = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }),
        });

        if (!resp.ok) {
          if (resp.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          throw new Error(`HTTP ${resp.status}`);
        }

        const text = await resp.text();
        let data;

        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error('Invalid JSON from Overpass API:', text.substring(0, 100));
          continue;
        }

        const ways: Array<{
          tags?: { highway?: string };
          geometry: Array<{ lat: number; lon: number }>;
        }> = data?.elements?.filter((el: { type: string }) => el.type === "way") || [];

        if (ways.length === 0) continue;

        const highwayWeight: Record<string, number> = {
          motorway: 0.5,
          trunk: 0.7,
          primary: 1.0,
          secondary: 1.3,
        };

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
          snapCache.set(cacheKey, bestPoint);
          return bestPoint;
        }
      } catch (fetchError) {
        console.warn(`Overpass API error at radius ${radius}:`, fetchError);
        continue;
      }
    }

    return point;
  } catch (e) {
    console.warn("snapToMajorRoad failed:", e);
    return point;
  }
}

function squaredDistance(a: RouteCoordinate, b: RouteCoordinate): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

function projectPointOnSegment(
  p: RouteCoordinate,
  a: RouteCoordinate,
  b: RouteCoordinate
): RouteCoordinate {
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
 * Calculate total distance of a route in kilometers
 */
export function calculateRouteDistance(
  coordinates: RouteCoordinate[]
): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const coord1 = coordinates[i];
    const coord2 = coordinates[i + 1];
    totalDistance += haversineDistance(coord1, coord2);
  }

  return totalDistance;
}

function haversineDistance(
  coord1: RouteCoordinate,
  coord2: RouteCoordinate
): number {
  const R = 6371;
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
 * Get route distance from API
 */
export async function getRouteDistance(
  start: RouteCoordinate,
  end: RouteCoordinate
): Promise<number | null> {
  try {
    await waitForRateLimit();

    if (ORS_API_KEY) {
      try {
        const orsResp = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
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
          }
        );

        if (orsResp.ok) {
          const orsData = await orsResp.json();
          const distance =
            orsData?.features?.[0]?.properties?.segments?.[0]
              ?.distance;
          if (typeof distance === "number") {
            return distance / 1000;
          }
        }
      } catch (error) {
        console.warn("ORS distance fetch failed:", error);
      }
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false&alternatives=false`;
    const response = await fetch(url, { mode: "cors" });

    if (response.ok) {
      const data = await response.json();
      if (
        data?.code === "Ok" &&
        data.routes &&
        data.routes.length > 0
      ) {
        const distance = data.routes[0].distance;
        if (typeof distance === "number") {
          return distance / 1000;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting route distance:", error);
    return null;
  }
}

/**
 * Get route between two points using OpenRouteService or OSRM
 */
export async function getRouteBetweenPoints(
  start: RouteCoordinate,
  end: RouteCoordinate,
  profile: 'driving-car' | 'foot-walking' = 'driving-car'
): Promise<RouteCoordinate[]> {
  const cacheKey = `${start.lat},${start.lng}-${end.lat},${end.lng}-${profile}`;
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    await waitForRateLimit();

    // Try OpenRouteService first
    if (ORS_API_KEY) {
      try {
        const orsResp = await fetch(
          `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
          {
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
            }),
          }
        );

        if (orsResp.ok) {
          const orsData = await orsResp.json();
          const coordinates = orsData?.features?.[0]?.geometry?.coordinates;
          if (coordinates && Array.isArray(coordinates)) {
            const route = coordinates.map((coord: number[]) => ({
              lat: coord[1],
              lng: coord[0],
            }));
            routeCache.set(cacheKey, route);
            return route;
          }
        }
      } catch (error) {
        console.warn("ORS routing failed:", error);
      }
    }

    // Fallback to OSRM (only supports driving)
    if (profile === 'driving-car') {
      const osrmProfile = 'driving';
      const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url, { mode: "cors" });

      if (response.ok) {
        const data = await response.json();
        if (data?.code === "Ok" && data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          const route = coordinates.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0],
          }));
          routeCache.set(cacheKey, route);
          return route;
        }
      }
    }

    // If all else fails, return a straight line
    const straightLine = [start, end];
    routeCache.set(cacheKey, straightLine);
    return straightLine;
  } catch (error) {
    console.error("Error getting route:", error);
    return [start, end];
  }
}

/**
 * Get complete route with rate limiting and progress callback
 */
export async function getCompleteRouteWithRateLimit(
  stops: RouteCoordinate[],
  onProgress?: (progress: number) => void
): Promise<RouteCoordinate[]> {
  if (stops.length < 2) return stops;

  const completeRoute: RouteCoordinate[] = [];
  const totalSegments = stops.length - 1;

  for (let i = 0; i < stops.length - 1; i++) {
    const segmentRoute = await getRouteBetweenPoints(stops[i], stops[i + 1]);
    
    // Add segment route, avoiding duplicate points
    if (i === 0) {
      completeRoute.push(...segmentRoute);
    } else {
      completeRoute.push(...segmentRoute.slice(1));
    }

    if (onProgress) {
      const progress = Math.round(((i + 1) / totalSegments) * 100);
      onProgress(progress);
    }
  }

  return completeRoute;
}

// Nearby stops logic
import { Halte, Koridor } from "@/data/corridorData";

export interface NearestHalte {
  halte: Halte;
  koridorId: number;
  koridorNama: string;
  koridorWarna: string;
  distanceMeter: number;
  walkTimeMinutes: number;
}

function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export function findNearestStops(
  userLat: number,
  userLng: number,
  koridorData: Koridor[],
  limit: number = 3
): NearestHalte[] {
  const allHalteDistance: NearestHalte[] = [];
  const WALKING_SPEED_KMH = 4.8;

  koridorData.forEach((koridor) => {
    koridor.halte.forEach((halte) => {
      const distKm = getDistanceFromLatLonInKm(
        userLat,
        userLng,
        halte.lat,
        halte.lng
      );
      const walkTime = (distKm / WALKING_SPEED_KMH) * 60;

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

  return allHalteDistance
    .sort((a, b) => a.distanceMeter - b.distanceMeter)
    .slice(0, limit);
}