import type { GeoPoint } from "@/db/schema";

export function pointFromLatLng(latitude: number, longitude: number): GeoPoint {
  return { x: longitude, y: latitude };
}

export function nullablePointFromLatLng(input: {
  latitude?: number | null;
  longitude?: number | null;
}): GeoPoint | null {
  if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
    return null;
  }

  return pointFromLatLng(input.latitude, input.longitude);
}
