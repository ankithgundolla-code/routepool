import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, MapPin, Check, Loader2, AlertCircle, X, Compass, Globe } from 'lucide-react';
import { LocationPoint, HYDERABAD_CORRIDOR_DIRECTORY } from './LocationPicker';

export interface LocationItem {
  name: string;
  area: string;
  lat: number;
  lng: number;
  isExternal?: boolean;
}

export interface LocationComboboxProps {
  label: string;
  value: LocationPoint;
  onChange: (point: LocationPoint) => void;
  accentColor?: 'emerald' | 'cyan';
  placeholder?: string;
  isTargetActive?: boolean;
  onActivateTarget?: () => void;
  onCenterMap?: (lat: number, lng: number) => void;
  error?: string | null;
  required?: boolean;
}

const REGION_CATEGORIES = [
  'All',
  'Central',
  'West / IT',
  'Secunderabad',
  'Old City',
  'East',
] as const;

type RegionCategory = typeof REGION_CATEGORIES[number];

function categorizeArea(area: string, name: string): RegionCategory {
  const combined = `${area} ${name}`.toLowerCase();
  if (
    combined.includes('hitec') ||
    combined.includes('cyber') ||
    combined.includes('madhapur') ||
    combined.includes('gachibowli') ||
    combined.includes('kondapur') ||
    combined.includes('kukatpally') ||
    combined.includes('miyapur') ||
    combined.includes('raidurg') ||
    combined.includes('nanakramguda') ||
    combined.includes('manikonda') ||
    combined.includes('banjara') ||
    combined.includes('jubilee')
  ) {
    return 'West / IT';
  }
  if (
    combined.includes('secunderabad') ||
    combined.includes('paradise') ||
    combined.includes('sanathnagar') ||
    combined.includes('bowenpally') ||
    combined.includes('kompally')
  ) {
    return 'Secunderabad';
  }
  if (
    combined.includes('charminar') ||
    combined.includes('abids') ||
    combined.includes('koti') ||
    combined.includes('nampally') ||
    combined.includes('mehdipatnam') ||
    combined.includes('tolichowki') ||
    combined.includes('attapur') ||
    combined.includes('chandrayangutta')
  ) {
    return 'Old City';
  }
  if (
    combined.includes('dilsukhnagar') ||
    combined.includes('lb nagar') ||
    combined.includes('nagole') ||
    combined.includes('uppal') ||
    combined.includes('tarnaka')
  ) {
    return 'East';
  }
  return 'Central';
}

// In-memory cache for live geocoding queries in the current session
const nominatimQueryCache = new Map<string, LocationItem[]>();

export const LocationCombobox: React.FC<LocationComboboxProps> = ({
  label,
  value,
  onChange,
  accentColor = 'emerald',
  placeholder = 'Search Hyderabad landmark, hub, or address...',
  isTargetActive = false,
  onActivateTarget,
  onCenterMap,
  error = null,
  required = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value.location || '');
  const [activeCategory, setActiveCategory] = useState<RegionCategory>('All');
  const [externalSuggestions, setExternalSuggestions] = useState<LocationItem[]>([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const autoId = useId();

  // Sync internal display query if external value changes
  useEffect(() => {
    if (value.location && value.location !== searchQuery) {
      setSearchQuery(value.location);
    }
  }, [value.location]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Debounced search for Nominatim geocoding with in-memory caching and request cancellation
  useEffect(() => {
    if (!isOpen) return;
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery || cleanQuery.length < 3) {
      setExternalSuggestions([]);
      setSearchError(null);
      setIsSearchingExternal(false);
      return;
    }

    const queryLower = cleanQuery.toLowerCase();
    const localMatches = HYDERABAD_CORRIDOR_DIRECTORY.filter(
      (item) =>
        item.name.toLowerCase().includes(queryLower) ||
        item.area.toLowerCase().includes(queryLower)
    );

    // If we have verified local directory matches, prioritize them and avoid unnecessary network calls
    if (localMatches.length > 0) {
      setExternalSuggestions([]);
      setSearchError(null);
      setIsSearchingExternal(false);
      return;
    }

    // Check in-memory query cache first
    if (nominatimQueryCache.has(queryLower)) {
      const cached = nominatimQueryCache.get(queryLower)!;
      setExternalSuggestions(cached);
      setSearchError(
        cached.length === 0
          ? `No address found for "${cleanQuery}". You can click directly on the interactive map to place a pin.`
          : null
      );
      setIsSearchingExternal(false);
      return;
    }

    // Cancel any previous in-flight search request
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearchingExternal(true);
      setSearchError(null);

      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cleanQuery + ', Hyderabad'
        )}&limit=5&addressdetails=1`;

        const res = await fetch(nominatimUrl, {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const parsed: LocationItem[] = data.map((item: any) => ({
              name: item.display_name.split(',').slice(0, 2).join(','),
              area:
                item.display_name.split(',').slice(2, 4).join(',').trim() ||
                'Hyderabad Metro Area',
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              isExternal: true,
            }));
            nominatimQueryCache.set(queryLower, parsed);
            setExternalSuggestions(parsed);
          } else {
            nominatimQueryCache.set(queryLower, []);
            setExternalSuggestions([]);
            setSearchError(
              `No address found for "${cleanQuery}" in Hyderabad. You can select a nearby corridor hub or click directly on the interactive map.`
            );
          }
        } else {
          setExternalSuggestions([]);
          setSearchError('Live geocoder temporarily unavailable. Please select from the corridor directory or click the map.');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // Cancelled by newer query
        }
        setExternalSuggestions([]);
        setSearchError('Live search unavailable. Please choose from the corridor directory or click directly on the interactive map.');
      } finally {
        setIsSearchingExternal(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
    };
  }, [searchQuery, isOpen]);

  // Compute displayed options: Local corridors matching filter/query + External geocoded results
  const filteredLocalItems: LocationItem[] = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return HYDERABAD_CORRIDOR_DIRECTORY.filter((item) => {
      // Category filter
      if (activeCategory !== 'All') {
        const cat = categorizeArea(item.area, item.name);
        if (cat !== activeCategory) return false;
      }
      // Query filter
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  const allAvailableItems = React.useMemo(() => {
    return [...filteredLocalItems, ...externalSuggestions];
  }, [filteredLocalItems, externalSuggestions]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      const target = items[highlightedIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (item: LocationItem) => {
    setSearchQuery(item.name);
    setIsOpen(false);
    setSearchError(null);
    onChange({
      location: item.name,
      lat: item.lat,
      lng: item.lng,
    });
    if (onCenterMap) {
      onCenterMap(item.lat, item.lng);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    setExternalSuggestions([]);
    setSearchError(null);
    inputRef.current?.focus();
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allAvailableItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : allAvailableItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allAvailableItems.length) {
          handleSelect(allAvailableItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const isSelected = (item: LocationItem) => {
    if (!value.location) return false;
    if (value.location.toLowerCase() === item.name.toLowerCase()) return true;
    if (
      Math.abs(value.lat - item.lat) < 0.0001 &&
      Math.abs(value.lng - item.lng) < 0.0001
    ) {
      return true;
    }
    return false;
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Label and Coordinate Status */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
        <label htmlFor={autoId} className="flex items-center gap-2 select-none">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              accentColor === 'cyan' ? 'bg-cyan-400' : 'bg-emerald-400'
            }`}
          />
          <span className="text-white">{label}</span>
        </label>
        {value.lat && value.lng ? (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              accentColor === 'cyan'
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
            }`}
            title="Location coordinates set"
          >
            <Check className="w-3 h-3" />
            <span>Set</span>
          </span>
        ) : required ? (
          <span className="text-[10px] text-amber-400 font-medium">Required</span>
        ) : null}
      </div>

      {/* Search Input Box */}
      <div
        className={`relative flex items-center bg-slate-950 border rounded-xl transition-all shadow-sm ${
          isOpen
            ? accentColor === 'cyan'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20'
              : 'border-emerald-500 ring-2 ring-emerald-500/20'
            : isTargetActive
            ? accentColor === 'cyan'
              ? 'border-cyan-600'
              : 'border-emerald-600'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <MapPin
          className={`w-4 h-4 ml-3 shrink-0 transition-colors ${
            isOpen || isTargetActive
              ? accentColor === 'cyan'
                ? 'text-cyan-400'
                : 'text-emerald-400'
              : 'text-slate-500'
          }`}
        />

        <input
          id={autoId}
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (onActivateTarget) onActivateTarget();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full pl-2.5 pr-8 py-2 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
        />

        {/* Right side loader or clear button */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {isSearchingExternal ? (
            <Loader2
              className={`w-3.5 h-3.5 animate-spin ${
                accentColor === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'
              }`}
            />
          ) : searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Styled Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 z-[1000] mt-1.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
          style={{ minWidth: '280px' }}
        >
          {/* Header Bar with Region Filter Tabs */}
          <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Compass
                  className={`w-3.5 h-3.5 ${
                    accentColor === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'
                  }`}
                />
                <span>Hyderabad Corridors & Hubs</span>
              </span>
              <span className="text-[10px] text-slate-500">
                {allAvailableItems.length} locations
              </span>
            </div>

            {/* Region Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {REGION_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? accentColor === 'cyan'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Location Items List */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto divide-y divide-slate-800/50 py-1 text-xs"
          >
            {allAvailableItems.length > 0 ? (
              allAvailableItems.map((item, idx) => {
                const selected = isSelected(item);
                const highlighted = idx === highlightedIndex;

                return (
                  <li
                    key={`${item.name}-${item.lat}-${idx}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors flex items-start justify-between gap-2.5 ${
                      selected
                        ? accentColor === 'cyan'
                          ? 'bg-cyan-950/60 text-cyan-200 border-l-2 border-cyan-400'
                          : 'bg-emerald-950/60 text-emerald-200 border-l-2 border-emerald-400'
                        : highlighted
                        ? 'bg-slate-800/80 text-white'
                        : 'text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {item.isExternal ? (
                          <Globe className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          <MapPin
                            className={`w-3.5 h-3.5 ${
                              accentColor === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'
                            }`}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-100 truncate text-xs flex items-center gap-1.5">
                          <span className="truncate">{item.name}</span>
                          {item.isExternal && (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-300 border border-sky-800/60">
                              Live Search
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2 mt-0.5">
                          <span className="truncate">{item.area}</span>
                        </div>
                      </div>
                    </div>

                    {selected && (
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          accentColor === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'
                        }`}
                      />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-6 text-center text-xs text-slate-400">
                <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                <div className="font-medium text-slate-300">No matching corridor locations</div>
                <div className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {searchError || 'Try a different landmark keyword or click anywhere on the map to pin custom coordinates.'}
                </div>
              </li>
            )}
          </ul>

          {/* Quick Footer Notice */}
          <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/70 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Tip: Press Enter to select, Esc to close</span>
            <span
              className={accentColor === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'}
            >
              Or click on map to pin
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
