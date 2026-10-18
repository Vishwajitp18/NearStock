import geohash from 'ngeohash';

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function toGeohash(lat: number, lng: number, precision: number = 7): string {
  return geohash.encode(lat, lng, precision);
}

export function estimateEtaSeconds(distanceMeters: number, averageSpeedKmh: number = 25): number {
  // Road distance is generally ~1.2x to 1.4x straight line distance
  const roadFactor = 1.3;
  const roadDistanceKm = (distanceMeters * roadFactor) / 1000;
  const travelHours = roadDistanceKm / averageSpeedKmh;
  // Add 2 minutes base handling/traffic buffer
  const totalSeconds = Math.round(travelHours * 3600 + 120);
  return Math.max(60, totalSeconds);
}

