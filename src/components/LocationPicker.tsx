import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { ArrowLeftRight, AlertCircle, Loader2, Navigation } from 'lucide-react';
import { LocationCombobox } from './LocationCombobox';

export interface LocationPoint {
  location: string;
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  pickupLabel?: string;
  destLabel?: string;
  pickupValue: LocationPoint;
  destValue: LocationPoint;
  onChange: (update: { pickup: LocationPoint; destination: LocationPoint }) => void;
  accentColor?: 'emerald' | 'cyan';
  error?: string | null;
}

// Comprehensive verified Hyderabad transit hubs and commercial landmarks
export const HYDERABAD_CORRIDOR_DIRECTORY: { name: string; area: string; lat: number; lng: number }[] = [
  { name: 'Khairatabad Circle Vendor Hub', area: 'Central Market', lat: 17.4116, lng: 78.4611 },
  { name: 'Punjagutta Commercial Wholesale Depot', area: 'Central Junction', lat: 17.4265, lng: 78.4526 },
  { name: 'Ameerpet Computer Electronics Market', area: 'Tech Market', lat: 17.4375, lng: 78.4482 },
  { name: 'Begumpet Software Technology Park', area: 'Software Park', lat: 17.4448, lng: 78.4664 },
  { name: 'Lakdikapul Station Merchant Corridor', area: 'Transit Gateway', lat: 17.4042, lng: 78.4659 },
  { name: 'Somajiguda Medical & Hardware Depot', area: 'Corridor Hub', lat: 17.4260, lng: 78.4590 },
  { name: 'SR Nagar Engineering & Tech Cluster', area: 'Academic / Tech', lat: 17.4428, lng: 78.4481 },
  { name: 'Banjara Hills Road 12 Commercial Hub', area: 'West Retail', lat: 17.4156, lng: 78.4357 },
  { name: 'Banjara Hills Road 1 Transit Junction', area: 'Banjara Hills', lat: 17.4208, lng: 78.4479 },
  { name: 'Jubilee Hills Checkpost / Metro Station', area: 'Jubilee Hills', lat: 17.4277, lng: 78.4114 },
  { name: 'Jubilee Hills Road 36 Retail Plaza', area: 'Commercial Zone', lat: 17.4319, lng: 78.4072 },
  { name: 'Hitec City Cyber Gateway & Towers', area: 'Cyberabad IT', lat: 17.4485, lng: 78.3772 },
  { name: 'Madhapur Mindspace IT Campus', area: 'Mindspace SEZ', lat: 17.4435, lng: 78.3812 },
  { name: 'Gachibowli Financial District Hub', area: 'Financial District', lat: 17.4190, lng: 78.3490 },
  { name: 'Gachibowli Stadium Transit Junction', area: 'Outer Ring Corridor', lat: 17.4434, lng: 78.3582 },
  { name: 'Kondapur Botanical Garden Road', area: 'Kondapur Corridor', lat: 17.4563, lng: 78.3644 },
  { name: 'Kukatpally KPHB Colony Commercial Hub', area: 'North-West Transit', lat: 17.4938, lng: 78.3995 },
  { name: 'Miyapur Metro Terminal Junction', area: 'Miyapur Corridor', lat: 17.4968, lng: 78.3614 },
  { name: 'Secunderabad Railway Station Terminal', area: 'Station Node', lat: 17.4399, lng: 78.4983 },
  { name: 'Paradise Circle Transit Plaza', area: 'Secunderabad', lat: 17.4418, lng: 78.4871 },
  { name: 'Abids Wholesale Component Center', area: 'Old City Hub', lat: 17.3916, lng: 78.4740 },
  { name: 'Koti Commercial Market Junction', area: 'Central Wholesale', lat: 17.3853, lng: 78.4867 },
  { name: 'Nampally Railway Station / Exhibition Grounds', area: 'Nampally', lat: 17.3920, lng: 78.4697 },
  { name: 'Charminar Heritage & Trade District', area: 'Old City', lat: 17.3616, lng: 78.4747 },
  { name: 'Mehdipatnam Rythu Bazar & Bus Terminal', area: 'South-West Hub', lat: 17.3953, lng: 78.4380 },
  { name: 'Tolichowki Main Road Corridor', area: 'Golkonda Corridor', lat: 17.4011, lng: 78.4143 },
  { name: 'Manikonda Marichettu Junction', area: 'Cyberabad West', lat: 17.4016, lng: 78.3892 },
  { name: 'Raidurg Metro Station & IKEA Square', area: 'Hitec City South', lat: 17.4357, lng: 78.3756 },
  { name: 'Nanakramguda WaveRock Tech Campus', area: 'Financial Corridor', lat: 17.4201, lng: 78.3429 },
  { name: 'Dilsukhnagar Bus Station & Commercial Hub', area: 'East Transit', lat: 17.3688, lng: 78.5247 },
  { name: 'LB Nagar Ring Road Interchange', area: 'South-East Gateway', lat: 17.3457, lng: 78.5522 },
  { name: 'Nagole Metro Station Junction', area: 'East Metro', lat: 17.3750, lng: 78.5601 },
  { name: 'Uppal Ring Road Junction', area: 'Uppal Tech Hub', lat: 17.4018, lng: 78.5602 },
  { name: 'Tarnaka Osmania University Cross Road', area: 'North-East Node', lat: 17.4285, lng: 78.5317 },
  { name: 'Sanathnagar Industrial Depot', area: 'Industrial Node', lat: 17.4578, lng: 78.4410 },
  { name: 'Bowenpally Dairy Farm Cross Road', area: 'North Highway', lat: 17.4764, lng: 78.4878 },
  { name: 'Kompally National Highway Hub', area: 'North Corridor', lat: 17.5348, lng: 78.4842 },
  { name: 'Attapur Pillar 143 Express Corridor', area: 'Airport Transit', lat: 17.3732, lng: 78.4336 },
  { name: 'Chandrayangutta Flyover Junction', area: 'South Corridor', lat: 17.3245, lng: 78.4735 },
];

// In-memory cache for reverse-geocoded coordinates in the current session
const reverseGeocodeCache = new Map<string, string>();

export const LocationPicker: React.FC<LocationPickerProps> = ({
  pickupLabel = 'Pickup Location (Store / Hub)',
  destLabel = 'Destination Location (Client / Drop-off)',
  pickupValue,
  destValue,
  onChange,
  accentColor = 'emerald',
  error,
}) => {
  const [activePinTarget, setActivePinTarget] = useState<'pickup' | 'dest'>('pickup');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [tileError, setTileError] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);

  // Keep a ref to activePinTarget to prevent stale closure in map click handler
  const activePinTargetRef = useRef<'pickup' | 'dest'>(activePinTarget);
  useEffect(() => {
    activePinTargetRef.current = activePinTarget;
  }, [activePinTarget]);

  // Keep refs to latest pickup and dest values to prevent stale closures
  const valuesRef = useRef({ pickup: pickupValue, dest: destValue });
  useEffect(() => {
    valuesRef.current = { pickup: pickupValue, dest: destValue };
  }, [pickupValue, destValue]);

  // Safe reverse-geocoding helper with caching and abort handling
  const resolveAddressForCoords = async (lat: number, lng: number): Promise<string> => {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (reverseGeocodeCache.has(cacheKey)) {
      return reverseGeocodeCache.get(cacheKey)!;
    }

    if (reverseAbortRef.current) {
      reverseAbortRef.current.abort();
    }
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    let fallbackName = `Map Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    setReverseGeocoding(true);
    try {
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`;
      const res = await fetch(reverseUrl, {
        headers: { 'Accept-Language': 'en' },
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          const resolvedName = parts.slice(0, 2).join(',').trim() || fallbackName;
          reverseGeocodeCache.set(cacheKey, resolvedName);
          return resolvedName;
        }
      }
    } catch {
      // Aborted or network failed; use formatted coordinate string
    } finally {
      setReverseGeocoding(false);
    }

    return fallbackName;
  };

  // 1. Map Lifecycle: Initialize once and safely clean up
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // React StrictMode safety: remove existing instance and delete container ID
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    const initialLat = pickupValue.lat || 17.4116;
    const initialLng = pickupValue.lng || 78.4611;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
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

    // Handle map clicks to set coordinates directly on interactive map
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const clickedLat = Number(e.latlng.lat.toFixed(5));
      const clickedLng = Number(e.latlng.lng.toFixed(5));
      const target = activePinTargetRef.current;

      const resolvedName = await resolveAddressForCoords(clickedLat, clickedLng);
      const currentValues = valuesRef.current;

      if (target === 'pickup') {
        onChange({
          pickup: { location: resolvedName, lat: clickedLat, lng: clickedLng },
          destination: currentValues.dest,
        });
        // Auto-switch to destination target for seamless 2-step setup
        setActivePinTarget('dest');
      } else {
        onChange({
          pickup: currentValues.pickup,
          destination: { location: resolvedName, lat: clickedLat, lng: clickedLng },
        });
      }
    });

    // Invalidate size on container resize (handles modal opening and layout animations)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    resizeObserverRef.current = resizeObserver;

    // Delay timers to handle modal transitions smoothly
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (reverseAbortRef.current) {
        reverseAbortRef.current.abort();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      pickupMarkerRef.current = null;
      destMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  // 2. Update Markers & Polylines whenever coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const createCustomIcon = (type: 'P' | 'D', isEmerald: boolean) => {
      const bgColor = isEmerald ? '#10b981' : '#06b6d4';
      const label = type === 'P' ? 'Pickup' : 'Dest';
      return L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: ${bgColor}; color: #020617; font-weight: 800; font-size: 11px; padding: 2px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 2px solid #ffffff; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
              <span>${type}</span>
              <span style="font-size: 9px; opacity: 0.85;">${label}</span>
            </div>
            <div style="width: 2px; height: 10px; background-color: ${bgColor};"></div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${bgColor}; border: 1.5px solid #ffffff;"></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });
    };

    // Update Pickup Marker
    if (pickupValue.lat && pickupValue.lng) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickupValue.lat, pickupValue.lng], {
          icon: createCustomIcon('P', true),
          draggable: true,
        }).addTo(map);

        pickupMarkerRef.current.on('dragend', async (e: any) => {
          const pos = e.target.getLatLng();
          const lat = Number(pos.lat.toFixed(5));
          const lng = Number(pos.lng.toFixed(5));
          const locName = await resolveAddressForCoords(lat, lng);

          onChange({
            pickup: { location: locName, lat, lng },
            destination: valuesRef.current.dest,
          });
        });
      } else {
        pickupMarkerRef.current.setLatLng([pickupValue.lat, pickupValue.lng]);
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // Update Destination Marker
    if (destValue.lat && destValue.lng) {
      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destValue.lat, destValue.lng], {
          icon: createCustomIcon('D', false),
          draggable: true,
        }).addTo(map);

        destMarkerRef.current.on('dragend', async (e: any) => {
          const pos = e.target.getLatLng();
          const lat = Number(pos.lat.toFixed(5));
          const lng = Number(pos.lng.toFixed(5));
          const locName = await resolveAddressForCoords(lat, lng);

          onChange({
            pickup: valuesRef.current.pickup,
            destination: { location: locName, lat, lng },
          });
        });
      } else {
        destMarkerRef.current.setLatLng([destValue.lat, destValue.lng]);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // Connect both points with dashed polyline
    if (pickupValue.lat && pickupValue.lng && destValue.lat && destValue.lng) {
      const points: L.LatLngExpression[] = [
        [pickupValue.lat, pickupValue.lng],
        [destValue.lat, destValue.lng],
      ];

      if (!polylineRef.current) {
        polylineRef.current = L.polyline(points, {
          color: accentColor === 'emerald' ? '#10b981' : '#06b6d4',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(points);
      }

      // Auto fit bounds to both points with gentle padding
      try {
        map.fitBounds(
          L.latLngBounds([pickupValue.lat, pickupValue.lng], [destValue.lat, destValue.lng]),
          { padding: [40, 40], maxZoom: 14 }
        );
      } catch {}
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  }, [pickupValue.lat, pickupValue.lng, destValue.lat, destValue.lng, accentColor]);

  const handleSwap = () => {
    const prevPickup = { ...pickupValue };
    const prevDest = { ...destValue };

    onChange({
      pickup: prevDest,
      destination: prevPickup,
    });

    if (mapInstanceRef.current && prevDest.lat && prevPickup.lat) {
      mapInstanceRef.current.fitBounds(
        L.latLngBounds([prevDest.lat, prevDest.lng], [prevPickup.lat, prevPickup.lng]),
        { padding: [40, 40], maxZoom: 14 }
      );
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Top Header & Swap Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            Geospatial Location Selector
          </span>
        </div>
        <button
          type="button"
          onClick={handleSwap}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
          title="Swap Pickup and Destination locations"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Swap Pickup & Destination</span>
        </button>
      </div>

      {/* Validation Error Banner */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Reusable Searchable Location Comboboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <LocationCombobox
          label={pickupLabel}
          value={pickupValue}
          onChange={(newPickup) => {
            onChange({
              pickup: newPickup,
              destination: destValue,
            });
            if (mapInstanceRef.current && newPickup.lat && newPickup.lng) {
              mapInstanceRef.current.setView([newPickup.lat, newPickup.lng], 14);
            }
          }}
          accentColor="emerald"
          placeholder="Select or search pickup hub in Hyderabad..."
          isTargetActive={activePinTarget === 'pickup'}
          onActivateTarget={() => setActivePinTarget('pickup')}
          onCenterMap={(lat, lng) => mapInstanceRef.current?.setView([lat, lng], 14)}
          required
        />

        <LocationCombobox
          label={destLabel}
          value={destValue}
          onChange={(newDest) => {
            onChange({
              pickup: pickupValue,
              destination: newDest,
            });
            if (mapInstanceRef.current && newDest.lat && newDest.lng) {
              mapInstanceRef.current.setView([newDest.lat, newDest.lng], 14);
            }
          }}
          accentColor="cyan"
          placeholder="Select or search destination hub in Hyderabad..."
          isTargetActive={activePinTarget === 'dest'}
          onActivateTarget={() => setActivePinTarget('dest')}
          onCenterMap={(lat, lng) => mapInstanceRef.current?.setView([lat, lng], 14)}
          required
        />
      </div>

      {/* Interactive Leaflet Map Canvas with Pin Tool Switcher */}
      <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-inner">
        {/* Map Header with Active Pin Mode Switcher */}
        <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Click Map to set:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActivePinTarget('pickup')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                  activePinTarget === 'pickup'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Pickup Pin (P)</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePinTarget('dest')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                  activePinTarget === 'dest'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Destination Pin (D)</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            {reverseGeocoding ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Resolving pin address...
              </span>
            ) : tileError ? (
              <span className="text-amber-400 flex items-center gap-1 text-[10px]">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                Tile fallback active (OSM)
              </span>
            ) : (
              <span>Interactive Leaflet Map · Click anywhere in Hyderabad</span>
            )}
          </div>
        </div>

        {/* Leaflet DOM container */}
        <div ref={mapContainerRef} className="h-60 sm:h-64 w-full z-10" style={{ minHeight: '240px' }} />

        {/* Bottom Coordinates & Resolved Addresses Bar */}
        <div className="px-3 py-2 bg-slate-900/90 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center justify-between bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-semibold truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              Pickup: {pickupValue.location || 'Not set'}
            </span>
            <span className="text-slate-500 font-mono shrink-0 ml-2">
              {pickupValue.lat ? `${pickupValue.lat.toFixed(4)}, ${pickupValue.lng.toFixed(4)}` : 'None'}
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <span className="text-cyan-400 font-semibold truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
              Destination: {destValue.location || 'Not set'}
            </span>
            <span className="text-slate-500 font-mono shrink-0 ml-2">
              {destValue.lat ? `${destValue.lat.toFixed(4)}, ${destValue.lng.toFixed(4)}` : 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
