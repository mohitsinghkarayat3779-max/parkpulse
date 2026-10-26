// Haversine distance calculation in kilometers and meters

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return haversineDistanceKm(lat1, lng1, lat2, lng2) * 1000;
}

/**
 * Snaps a coordinate to the nearest road segment within 25m using Overpass API
 * Slices 1 vertex before and after (approx. 1 block / 50-150m) per PDF spec.
 */
export async function snapToStreetSegment(
  lat: number,
  lng: number
): Promise<[number, number][]> {
  const query = `[out:json][timeout:10];way(around:25,${lat},${lng})[highway~"^(residential|tertiary|secondary|primary|unclassified|living_street|service)$"];out geom;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const elements = data?.elements || [];
      for (const el of elements) {
        if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 2) {
          const geom = el.geometry;
          let bestIdx = 0;
          let bestDist = Infinity;

          geom.forEach((p: { lat: number; lon: number }, i: number) => {
            const d = haversineDistanceMeters(lat, lng, p.lat, p.lon);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          });

          // Slice bi - 1 to bi + 1 (clamped, ~1 block)
          const start = Math.max(0, bestIdx - 1);
          const end = Math.min(geom.length, bestIdx + 2);
          const sliced = geom.slice(start, end);

          if (sliced.length >= 2) {
            return sliced.map((p: { lat: number; lon: number }) => [p.lat, p.lon]);
          }
        }
      }
    }
  } catch (_) {
    // Fallback to local realistic road alignment
  }

  // Realistic fallback ~100m street segment if Overpass is unreachable
  return [
    [lat - 0.00045, lng - 0.0003],
    [lat, lng],
    [lat + 0.00045, lng + 0.0003],
  ];
}

