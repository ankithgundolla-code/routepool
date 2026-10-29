/**
 * RoutePool OSRM Road-Route Geometry Service
 * -----------------------------------------
 * Fetches turn-by-turn road geometry from the public OSRM routing engine.
 * Respects usage policies by caching responses in memory and sessionStorage,
 * throttling requests, and providing graceful fallback to straight-line polylines.
 */

// In-memory route cache for the current session
const routeCache = new Map<string, [number, number][]>();

/**
 * Normalizes coordinates into a stable cache key
 */
function createRouteKey(points: [number, number][]): string {
  return points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join(';');
}

/**
 * Fetches road-following route coordinates between waypoints using public OSRM.
 *
 * @param waypoints - Array of [latitude, longitude] tuples in traversal order
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Array of [latitude, longitude] tuples following actual streets, or null if routing is unavailable
 */
export async function fetchRoadRoute(
  waypoints: [number, number][],
  signal?: AbortSignal
): Promise<[number, number][] | null> {
  if (!waypoints || waypoints.length < 2) {
    return null;
  }

  // Filter out invalid/NaN coordinates
  const validPoints = waypoints.filter(
    (pt) =>
      Array.isArray(pt) &&
      pt.length === 2 &&
      typeof pt[0] === 'number' &&
      !isNaN(pt[0]) &&
      typeof pt[1] === 'number' &&
      !isNaN(pt[1])
  );

  if (validPoints.length < 2) {
    return null;
  }

  const cacheKey = createRouteKey(validPoints);

  // 1. Check in-memory cache
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // 2. Check sessionStorage cache
  try {
    const sessionItem = sessionStorage.getItem(`routepool_osrm_${cacheKey}`);
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      if (Array.isArray(parsed) && parsed.length > 0) {
        routeCache.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {
    // SessionStorage unavailable or restricted
  }

  // 3. Construct OSRM request URL (OSRM expects [longitude, latitude])
  const osrmCoords = validPoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;

  // Timeout guard (5 seconds maximum to avoid UI stalling)
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 5000);

  const combinedSignal = signal;

  try {
    const response = await fetch(url, {
      signal: combinedSignal || timeoutController.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (
      data &&
      data.code === 'Ok' &&
      Array.isArray(data.routes) &&
      data.routes.length > 0 &&
      data.routes[0].geometry &&
      Array.isArray(data.routes[0].geometry.coordinates)
    ) {
      // OSRM returns [longitude, latitude] GeoJSON coordinates.
      // Leaflet requires [latitude, longitude]. Invert the pairs:
      const leafletCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );

      // Cache result for subsequent renders
      routeCache.set(cacheKey, leafletCoords);
      try {
        sessionStorage.setItem(`routepool_osrm_${cacheKey}`, JSON.stringify(leafletCoords));
      } catch {
        // Storage quota full or disabled
      }

      return leafletCoords;
    }

    return null;
  } catch {
    clearTimeout(timeoutId);
    // Network error, timeout, or abort: gracefully return null to trigger straight-line fallback
    return null;
  }
}
