import React, { useEffect, useRef, useState } from 'react';
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

export const RouteMap: React.FC<RouteMapProps> = ({
  startLat = 17.4116,
  startLng = 78.4611,
  startLabel = 'Commuter Origin (Khairatabad)',
  destLat = 17.4375,
  destLng = 78.4482,
  destLabel = 'Commuter Destination (Ameerpet)',
  waypoints = [
    { name: 'Punjagutta Junction', lat: 17.4265, lng: 78.4526 },
  ],
  pickupLat,
  pickupLng,
  pickupLabel = 'Package Pickup Point',
  dropLat,
  dropLng,
  dropLabel = 'Package Drop-off Point',
  detourKm,
  className = 'h-80 w-full rounded-xl overflow-hidden'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [usingRoadGeometry, setUsingRoadGeometry] = useState(false);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // React StrictMode & re-mount safety: cleanly dismantle any existing instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Clear internal Leaflet container stamp if lingering
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const abortController = new AbortController();

    const centerLat = pickupLat ? (startLat + pickupLat) / 2 : (startLat + destLat) / 2;
    const centerLng = pickupLng ? (startLng + pickupLng) / 2 : (startLng + destLng) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });
    mapInstanceRef.current = map;

    // Watermark-free OpenStreetMap tiles styled to dark navy theme via CSS filter
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'routepool-dark-tiles',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    // Invalidate size on mount and container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    const createCustomIcon = (bgColor: string, label: string) => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;background:${bgColor};width:26px;height:26px;border-radius:50%;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.6);font-size:11px;font-weight:bold;color:#ffffff;">
            ${label}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
    };

    const latLngBounds: [number, number][] = [];

    // Base corridor straight-line waypoints
    const corridorBasePoints: [number, number][] = [[startLat, startLng]];
    waypoints.forEach(wp => corridorBasePoints.push([wp.lat, wp.lng]));
    corridorBasePoints.push([destLat, destLng]);

    corridorBasePoints.forEach(pt => latLngBounds.push(pt));

    // Place Origin and Destination markers
    L.marker([startLat, startLng], {
      icon: createCustomIcon('#0284c7', 'S')
    }).bindPopup(`<strong style="color:#0f172a;">Origin:</strong><br/>${startLabel}`).addTo(map);

    L.marker([destLat, destLng], {
      icon: createCustomIcon('#0284c7', 'D')
    }).bindPopup(`<strong style="color:#0f172a;">Destination:</strong><br/>${destLabel}`).addTo(map);

    waypoints.forEach(wp => {
      L.circleMarker([wp.lat, wp.lng], {
        radius: 5,
        color: '#38bdf8',
        fillColor: '#0369a1',
        fillOpacity: 0.9,
      }).bindPopup(`<strong>Corridor Waypoint:</strong><br/>${wp.name}`).addTo(map);
    });

    if (pickupLat && pickupLng) {
      latLngBounds.push([pickupLat, pickupLng]);
      L.marker([pickupLat, pickupLng], {
        icon: createCustomIcon('#10b981', 'P')
      }).bindPopup(`<strong style="color:#0f172a;">Package Pickup:</strong><br/>${pickupLabel}`).addTo(map);
    }

    if (dropLat && dropLng) {
      latLngBounds.push([dropLat, dropLng]);
      L.marker([dropLat, dropLng], {
        icon: createCustomIcon('#8b5cf6', 'B')
      }).bindPopup(`<strong style="color:#0f172a;">Package Drop-off:</strong><br/>${dropLabel}`).addTo(map);
    }

    // Auto-fit initial bounds
    if (latLngBounds.length > 1) {
      try {
        map.fitBounds(latLngBounds, { padding: [35, 35], maxZoom: 14 });
      } catch {}
    }

    // Dynamic Polyline Layer Refs for OSRM updates
    let corridorPolyline = L.polyline(corridorBasePoints, {
      color: '#10b981',
      weight: 5,
      opacity: 0.85,
    }).addTo(map);

    let startToPickupLine: L.Polyline | null = null;
    let deliveryPolyline: L.Polyline | null = null;
    let dropToDestLine: L.Polyline | null = null;

    if (pickupLat && pickupLng) {
      startToPickupLine = L.polyline([[startLat, startLng], [pickupLat, pickupLng]], {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.8,
      }).addTo(map);
    }

    if (dropLat && dropLng) {
      if (pickupLat && pickupLng) {
        deliveryPolyline = L.polyline([[pickupLat, pickupLng], [dropLat, dropLng]], {
          color: '#a855f7',
          weight: 4,
          opacity: 0.9,
        }).addTo(map);
      }

      dropToDestLine = L.polyline([[dropLat, dropLng], [destLat, destLng]], {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.8,
      }).addTo(map);
    }

    // Asynchronously request turn-by-turn road geometry from public OSRM
    setIsRoutingLoading(true);
    setUsingRoadGeometry(false);

    async function loadRoadRoutes() {
      try {
        // 1. Fetch main commuter corridor road geometry
        const corridorRoadCoords = await fetchRoadRoute(corridorBasePoints, abortController.signal);
        if (corridorRoadCoords && corridorRoadCoords.length > 1 && mapInstanceRef.current) {
          corridorPolyline.setLatLngs(corridorRoadCoords);
          setUsingRoadGeometry(true);
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

        // 3. Fetch detour segment road geometries (start -> pickup, and dropoff -> dest)
        if (pickupLat && pickupLng && startToPickupLine) {
          const detour1Coords = await fetchRoadRoute(
            [[startLat, startLng], [pickupLat, pickupLng]],
            abortController.signal
          );
          if (detour1Coords && detour1Coords.length > 1 && mapInstanceRef.current) {
            startToPickupLine.setLatLngs(detour1Coords);
          }
        }

        if (dropLat && dropLng && dropToDestLine) {
          const detour2Coords = await fetchRoadRoute(
            [[dropLat, dropLng], [destLat, destLng]],
            abortController.signal
          );
          if (detour2Coords && detour2Coords.length > 1 && mapInstanceRef.current) {
            dropToDestLine.setLatLngs(detour2Coords);
          }
        }
      } catch {
        // If OSRM fails or aborts, retain straight-line polylines as clean fallback
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
  }, [startLat, startLng, destLat, destLng, pickupLat, pickupLng, dropLat, dropLng]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} className={className} style={{ minHeight: '260px' }} />

      {/* Additional Detour Badge */}
      {detourKm !== undefined && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs text-slate-200 shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Estimated Additional Detour: <strong className="text-emerald-400">+{detourKm} km</strong></span>
        </div>
      )}

      {/* Route Legend & Status */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-2 rounded-lg text-[11px] text-slate-300 shadow-xl flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-800">
          <span className="font-semibold text-white flex items-center gap-1">
            <Navigation className="w-3 h-3 text-emerald-400" />
            <span>Route Trajectory</span>
          </span>
          {isRoutingLoading ? (
            <span className="text-[10px] text-amber-400 flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>OSRM Road Routing</span>
            </span>
          ) : usingRoadGeometry ? (
            <span className="text-[10px] text-emerald-400 font-medium">
              Road Geometry (OSRM)
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">
              Corridor Geometry
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-emerald-500 rounded"></span>
          <span>Commuter Corridor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-purple-500 rounded"></span>
          <span>Delivery Transit</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 border-dashed border-b-2 border-amber-400"></span>
          <span>Detour Link</span>
        </div>

        {tileError && (
          <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-400/90 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Map tile loading error</span>
          </div>
        )}
      </div>
    </div>
  );
};
