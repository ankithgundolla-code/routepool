import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { fetchRoadRoute } from '../services/routing';
import { Navigation, AlertTriangle, Loader2 } from 'lucide-react';

interface RouteMapProps {
  startLat?: number;
  startLng?: number;
  startLabel?: string;
  destLat?: number;
  destLng?: number;
  destLabel?: string;
  waypoints?: { name: string; lat: number; lng: number }[];
  pickupLat?: number;
  pickupLng?: number;
  pickupLabel?: string;
  dropLat?: number;
  dropLng?: number;
  dropLabel?: string;
  detourKm?: number;
  className?: string;
}

/**
 * Creates a professional Google-style SVG GPS teardrop pin with bottom-tip anchoring
 * and a clean white circular core dot (no letters).
 */
function createGpsPin(color: string): L.DivIcon {
  const svg = `
    <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.55));">
      <path d="M15 37C15 37 28 23.5 28 14C28 6.8203 22.1797 1 15 1C7.8203 1 2 6.8203 2 14C2 23.5 15 37 15 37Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="15" cy="14" r="5" fill="#FFFFFF"/>
    </svg>
  `;
  return L.divIcon({
    className: 'routepool-pin-marker',
    html: `<div style="position:relative; width:30px; height:38px; cursor:pointer;">${svg}</div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -36],
  });
}

export const RouteMap: React.FC<RouteMapProps> = ({
  startLat,
  startLng,
  startLabel = 'Commuter Origin',
  destLat,
  destLng,
  destLabel = 'Commuter Destination',
  waypoints = [],
  pickupLat,
  pickupLng,
  pickupLabel = 'Package Pickup Point',
  dropLat,
  dropLng,
  dropLabel = 'Package Drop-off Destination',
  detourKm,
  className = 'h-80 w-full rounded-xl overflow-hidden'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [usingRoadGeometry, setUsingRoadGeometry] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Collects all active LatLng coordinates for bounds calculation
  const getActiveCoordinates = useCallback((): [number, number][] => {
    const coords: [number, number][] = [];
    if (typeof startLat === 'number' && !isNaN(startLat) && typeof startLng === 'number' && !isNaN(startLng)) {
      coords.push([startLat, startLng]);
    }
    if (waypoints && Array.isArray(waypoints)) {
      waypoints.forEach(wp => {
        if (typeof wp.lat === 'number' && !isNaN(wp.lat) && typeof wp.lng === 'number' && !isNaN(wp.lng)) {
          coords.push([wp.lat, wp.lng]);
        }
      });
    }
    if (typeof destLat === 'number' && !isNaN(destLat) && typeof destLng === 'number' && !isNaN(destLng)) {
      coords.push([destLat, destLng]);
    }
    if (typeof pickupLat === 'number' && !isNaN(pickupLat) && typeof pickupLng === 'number' && !isNaN(pickupLng)) {
      coords.push([pickupLat, pickupLng]);
    }
    if (typeof dropLat === 'number' && !isNaN(dropLat) && typeof dropLng === 'number' && !isNaN(dropLng)) {
      coords.push([dropLat, dropLng]);
    }
    return coords;
  }, [startLat, startLng, destLat, destLng, waypoints, pickupLat, pickupLng, dropLat, dropLng]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // React StrictMode & re-mount safety: cleanly dismantle any existing instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const abortController = new AbortController();

    const activeCoords = getActiveCoordinates();
    const centerLat = activeCoords.length > 0 ? activeCoords[0][0] : 17.4116;
    const centerLng = activeCoords.length > 0 ? activeCoords[0][1] : 78.4611;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });
    mapInstanceRef.current = map;

    // Official OpenStreetMap tiles styled to dark theme via CSS filter (zero watermarks / zero API keys)
    const osmDarkLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        className: 'map-tiles-dark',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    osmDarkLayer.on('tileerror', () => {
      setTileError(true);
    });

    // Function to calculate and auto-fit bounds with standard [50, 50] padding
    const fitAllActiveBounds = () => {
      const coords = getActiveCoordinates();
      if (coords.length >= 2 && mapInstanceRef.current) {
        try {
          const bounds = L.latLngBounds(coords);
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 14,
              animate: false
            });
          }
        } catch {
          // Ignore transient layout math errors
        }
      }
    };

    // Auto-fit immediately on mount
    fitAllActiveBounds();

    // Auto-fit after layout settling (150ms) to ensure container pixel dimensions are final
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        fitAllActiveBounds();
      }
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    const hasCommuterRoute =
      typeof startLat === 'number' && !isNaN(startLat) &&
      typeof startLng === 'number' && !isNaN(startLng) &&
      typeof destLat === 'number' && !isNaN(destLat) &&
      typeof destLng === 'number' && !isNaN(destLng);

    // Standardized GPS Teardrop Marker Definitions (no letter badges)
    // 1. Commuter Origin (Start: Emerald Green GPS pin with white dot)
    if (hasCommuterRoute) {
      L.marker([startLat, startLng], {
        icon: createGpsPin('#10b981'),
      })
        .bindTooltip(startLabel, { direction: 'top', offset: [0, -36], className: 'routepool-map-tooltip' })
        .bindPopup(`
          <div style="min-width: 140px;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#10b981;font-size:11px;margin-bottom:2px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
              Commuter Origin
            </div>
            <div style="font-size:11px;color:#cbd5e1;word-break:break-word;">${startLabel}</div>
          </div>
        `)
        .addTo(map);

      // 2. Commuter Destination (End: Crimson Red GPS pin with white dot)
      L.marker([destLat, destLng], {
        icon: createGpsPin('#ef4444'),
      })
        .bindTooltip(destLabel, { direction: 'top', offset: [0, -36], className: 'routepool-map-tooltip' })
        .bindPopup(`
          <div style="min-width: 140px;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#ef4444;font-size:11px;margin-bottom:2px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></span>
              Commuter Destination
            </div>
            <div style="font-size:11px;color:#cbd5e1;word-break:break-word;">${destLabel}</div>
          </div>
        `)
        .addTo(map);

      // 3. Intermediate Corridor Waypoints
      waypoints.forEach(wp => {
        if (typeof wp.lat === 'number' && typeof wp.lng === 'number') {
          L.circleMarker([wp.lat, wp.lng], {
            radius: 4,
            color: '#38bdf8',
            fillColor: '#0284c7',
            fillOpacity: 0.9,
            weight: 1.5
          })
            .bindTooltip(wp.name, { direction: 'top', offset: [0, -8], className: 'routepool-map-tooltip' })
            .addTo(map);
        }
      });
    }

    // 4. Package Pickup Marker (Emerald Green GPS pin with white dot)
    if (typeof pickupLat === 'number' && typeof pickupLng === 'number') {
      L.marker([pickupLat, pickupLng], {
        icon: createGpsPin('#10b981'),
      })
        .bindTooltip(pickupLabel, { direction: 'top', offset: [0, -36], className: 'routepool-map-tooltip' })
        .bindPopup(`
          <div style="min-width: 150px;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#10b981;font-size:11px;margin-bottom:2px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>
              Package Pickup Point
            </div>
            <div style="font-size:11px;color:#cbd5e1;word-break:break-word;">${pickupLabel}</div>
          </div>
        `)
        .addTo(map);
    }

    // 5. Package Destination Marker (Crimson Red GPS pin with white dot)
    if (typeof dropLat === 'number' && typeof dropLng === 'number') {
      L.marker([dropLat, dropLng], {
        icon: createGpsPin('#ef4444'),
      })
        .bindTooltip(dropLabel, { direction: 'top', offset: [0, -36], className: 'routepool-map-tooltip' })
        .bindPopup(`
          <div style="min-width: 150px;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:#ef4444;font-size:11px;margin-bottom:2px;">
              <span style="width:6px;height:6px;border-radius:50%;background:#ef4444;"></span>
              Package Drop-off Destination
            </div>
            <div style="font-size:11px;color:#cbd5e1;word-break:break-word;">${dropLabel}</div>
          </div>
        `)
        .addTo(map);
    }

    // Base Corridor Waypoint Sequence & Polylines
    let corridorPolyline: L.Polyline | null = null;
    let corridorBasePoints: [number, number][] = [];

    if (hasCommuterRoute) {
      corridorBasePoints = [[startLat, startLng]];
      waypoints.forEach(wp => {
        if (typeof wp.lat === 'number' && typeof wp.lng === 'number') {
          corridorBasePoints.push([wp.lat, wp.lng]);
        }
      });
      corridorBasePoints.push([destLat, destLng]);

      // 1. Commuter Corridor: Solid 4px teal/cyan polyline
      corridorPolyline = L.polyline(corridorBasePoints, {
        color: '#06b6d4',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    // 2. Detour connectors: Clean dashed amber line
    let startToPickupLine: L.Polyline | null = null;
    let deliveryPolyline: L.Polyline | null = null;
    let dropToDestLine: L.Polyline | null = null;

    if (pickupLat && pickupLng && hasCommuterRoute) {
      startToPickupLine = L.polyline([[startLat, startLng], [pickupLat, pickupLng]], {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.85,
        lineCap: 'round',
      }).addTo(map);
    }

    if (pickupLat && pickupLng && dropLat && dropLng) {
      // 3. Package Delivery Route: Solid 4px purple polyline along streets
      deliveryPolyline = L.polyline([[pickupLat, pickupLng], [dropLat, dropLng]], {
        color: '#a855f7',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    if (dropLat && dropLng && hasCommuterRoute) {
      dropToDestLine = L.polyline([[dropLat, dropLng], [destLat, destLng]], {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.85,
        lineCap: 'round',
      }).addTo(map);
    }

    // Asynchronously request turn-by-turn road geometry from public OSRM
    setIsRoutingLoading(true);
    setUsingRoadGeometry(false);

    async function loadRoadRoutes() {
      try {
        // 1. Fetch main commuter corridor road geometry
        if (hasCommuterRoute && corridorPolyline && corridorBasePoints.length >= 2) {
          const corridorRoadCoords = await fetchRoadRoute(corridorBasePoints, abortController.signal);
          if (corridorRoadCoords && corridorRoadCoords.length > 1 && mapInstanceRef.current) {
            corridorPolyline.setLatLngs(corridorRoadCoords);
            setUsingRoadGeometry(true);
          }
        }

        // 2. If delivery points exist, fetch road geometry for pickup -> dropoff
        if (pickupLat && pickupLng && dropLat && dropLng && deliveryPolyline) {
          const deliveryRoadCoords = await fetchRoadRoute(
            [[pickupLat, pickupLng], [dropLat, dropLng]],
            abortController.signal
          );
          if (deliveryRoadCoords && deliveryRoadCoords.length > 1 && mapInstanceRef.current) {
            deliveryPolyline.setLatLngs(deliveryRoadCoords);
          }
        }

        // 3. Detour connectors (start -> pickup, and dropoff -> dest)
        if (startLat !== undefined && startLng !== undefined && pickupLat && pickupLng && startToPickupLine) {
          const detour1Coords = await fetchRoadRoute(
            [[startLat, startLng], [pickupLat, pickupLng]],
            abortController.signal
          );
          if (detour1Coords && detour1Coords.length > 1 && mapInstanceRef.current) {
            startToPickupLine.setLatLngs(detour1Coords);
          }
        }

        if (destLat !== undefined && destLng !== undefined && dropLat && dropLng && dropToDestLine) {
          const detour2Coords = await fetchRoadRoute(
            [[dropLat, dropLng], [destLat, destLng]],
            abortController.signal
          );
          if (detour2Coords && detour2Coords.length > 1 && mapInstanceRef.current) {
            dropToDestLine.setLatLngs(detour2Coords);
          }
        }
      } catch {
        // Clean fallback: keep straight-line polylines without crashing Leaflet canvas
      } finally {
        setIsRoutingLoading(false);
      }
    }

    loadRoadRoutes();

    return () => {
      abortController.abort();
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [startLat, startLng, destLat, destLng, pickupLat, pickupLng, dropLat, dropLng, waypoints, getActiveCoordinates]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} className={className} style={{ minHeight: '260px' }} />

      {/* Additional Detour Badge */}
      {detourKm !== undefined && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-200 shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Additional Detour: <strong className="text-emerald-400">+{detourKm} km</strong></span>
        </div>
      )}

      {/* Sleek, Compact Semi-Transparent Route Legend */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 shadow-lg flex flex-col gap-1 max-w-[190px]">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/70">
          <span className="font-semibold text-white flex items-center gap-1">
            <Navigation className="w-3 h-3 text-cyan-400" />
            <span>Trajectory</span>
          </span>
          {isRoutingLoading ? (
            <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>OSRM</span>
            </span>
          ) : usingRoadGeometry ? (
            <span className="text-[9px] text-emerald-400 font-medium">Roads (OSRM)</span>
          ) : (
            <span className="text-[9px] text-slate-400">Corridor</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-cyan-400 rounded-full shrink-0"></span>
          <span className="truncate">Commuter Corridor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-purple-500 rounded-full shrink-0"></span>
          <span className="truncate">Delivery Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-dashed border-b-2 border-amber-400 shrink-0"></span>
          <span className="truncate">Detour Link</span>
        </div>

        {tileError && (
          <div className="pt-0.5 border-t border-slate-800 text-[9px] text-amber-400/90 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
            <span>Tiles loaded in fallback mode</span>
          </div>
        )}
      </div>
    </div>
  );
};
