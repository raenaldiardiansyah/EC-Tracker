import { useState, useEffect, useRef, useCallback } from "react";
import { RouteCoordinate } from "@/lib/routing";
import { Koridor } from "@/data/corridorData";

export interface Vehicle {
  id: number;
  koridorId: number;
  position: RouteCoordinate;
  progress: number; // 0-1, position along the route
  direction: 1 | -1; // 1 = forward, -1 = backward
  speed: number; // progress increment per update
  color: string;
}

interface UseTrackingSimulationProps {
  routesCache: Map<number, RouteCoordinate[]>;
  isRunning: boolean;
  koridorData: Koridor[];
}

export const useTrackingSimulation = ({ routesCache, isRunning, koridorData }: UseTrackingSimulationProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Initialize vehicles - exactly 1 per corridor
  const initializeVehicles = useCallback(() => {
    const availableKoridors = koridorData.filter(k => routesCache.has(k.id));
    
    if (availableKoridors.length === 0) return;

    const newVehicles: Vehicle[] = [];
    let vehicleId = 1;

    // Assign exactly 1 vehicle per corridor
    availableKoridors.forEach((koridor) => {
      const route = routesCache.get(koridor.id)!;
      
      if (route.length === 0) return;

      // Random starting position along the route
      const startProgress = Math.random();
      const startIndex = Math.floor(startProgress * (route.length - 1));
      const position = route[startIndex];

      newVehicles.push({
        id: vehicleId++,
        koridorId: koridor.id,
        position,
        progress: startProgress,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: 0.0003 + Math.random() * 0.0002, // Vary speed between vehicles
        color: koridor.warna,
      });
    });

    setVehicles(newVehicles);
  }, [routesCache, koridorData]);

  // Update vehicle positions
  const updateVehicles = useCallback(() => {
    if (!isRunning) return;

    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    setVehicles((prevVehicles) => {
      return prevVehicles.map((vehicle) => {
        const route = routesCache.get(vehicle.koridorId);
        if (!route || route.length === 0) return vehicle;

        // Update progress
        let newProgress = vehicle.progress + vehicle.speed * vehicle.direction * (deltaTime / 16);

        // Reverse direction if at the end
        if (newProgress >= 1) {
          newProgress = 1;
          vehicle.direction = -1;
        } else if (newProgress <= 0) {
          newProgress = 0;
          vehicle.direction = 1;
        }

        // Calculate new position based on progress
        const totalLength = route.length - 1;
        const exactIndex = newProgress * totalLength;
        const index = Math.floor(exactIndex);
        const nextIndex = Math.min(index + 1, route.length - 1);
        const fraction = exactIndex - index;

        // Interpolate between two points
        const currentPoint = route[index];
        const nextPoint = route[nextIndex];
        const newPosition: RouteCoordinate = {
          lat: currentPoint.lat + (nextPoint.lat - currentPoint.lat) * fraction,
          lng: currentPoint.lng + (nextPoint.lng - currentPoint.lng) * fraction,
        };

        return {
          ...vehicle,
          position: newPosition,
          progress: newProgress,
          direction: vehicle.direction,
        };
      });
    });

    animationFrameRef.current = requestAnimationFrame(updateVehicles);
  }, [isRunning, routesCache]);

  // Start/stop animation
  useEffect(() => {
    if (isRunning) {
      lastUpdateRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(updateVehicles);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, updateVehicles]);

  // Initialize vehicles when routes are available
  useEffect(() => {
    if (routesCache.size > 0 && vehicles.length === 0) {
      initializeVehicles();
    }
  }, [routesCache, vehicles.length, initializeVehicles]);

  // Reset vehicles when simulation stops
  const resetVehicles = useCallback(() => {
    setVehicles([]);
    initializeVehicles();
  }, [initializeVehicles]);

  return {
    vehicles,
    resetVehicles,
  };
};