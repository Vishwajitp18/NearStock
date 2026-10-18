import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SearchResultItem } from '../../types/search';
import { formatCurrency, formatDistance, formatDuration } from '../../lib/format';
import { Crosshair, Plus, Minus, Layers, Navigation, Star, Clock } from 'lucide-react';

export interface MapWrapperProps {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  results?: SearchResultItem[];
  selectedShopId?: string | null;
  onSelectShop?: (shopId: string) => void;
  className?: string;
  isPicker?: boolean;
  onPickLocation?: (lat: number, lng: number) => void;
}

export const MapWrapper: React.FC<MapWrapperProps> = ({
  center,
  zoom = 14,
  results = [],
  selectedShopId,
  onSelectShop,
  className = 'h-full min-h-[420px] w-full',
  isPicker = false,
  onPickLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false, // We use custom Google Maps styled zoom buttons
        attributionControl: false,
      });

      // Real Google Maps Roadmap tiles
      const tileUrl =
        mapType === 'satellite'
          ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          : 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

      const tileLayer = L.tileLayer(tileUrl, {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;

      // Picker mode click handler
      if (isPicker && onPickLocation) {
        map.on('click', (e) => {
          onPickLocation(e.latlng.lat, e.latlng.lng);

          if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLatLng(e.latlng);
          } else {
            const pickerIcon = L.divIcon({
              className: 'custom-google-pin',
              html: `
                <div class="google-pin-wrapper">
                  <div class="google-price-pill selected">
                    <span>Selected Pin</span>
                  </div>
                  <svg width="30" height="38" viewBox="0 0 28 36" fill="none" class="google-teardrop">
                    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#EA4335"/>
                    <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
                  </svg>
                </div>
              `,
              iconSize: [80, 50],
              iconAnchor: [40, 50],
            });
            pickerMarkerRef.current = L.marker(e.latlng, { icon: pickerIcon }).addTo(map);
          }
        });
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Map Type change (Roadmap vs Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    const tileUrl =
      mapType === 'satellite'
        ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);
  }, [mapType]);

  // Center update & Google Maps Blue GPS Pulse Dot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setView(center, map.getZoom());

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userGpsIcon = L.divIcon({
      className: 'google-gps-marker',
      html: `
        <div class="google-gps-pulse"></div>
        <div class="google-gps-core"></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    userMarkerRef.current = L.marker(center, { icon: userGpsIcon, zIndexOffset: 1000 }).addTo(map);
  }, [center]);

  // Render Authentic Google Pins with Price Pills & Info Cards
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (results.length === 0) return;

    const bounds = L.latLngBounds([center]);

    results.forEach((item) => {
      const isSelected = item.shop.id === selectedShopId;
      const isCheapest = item.tags.includes('cheapest');
      const isNearest = item.tags.includes('nearest');

      // Pin Color: Red by default, Green for cheapest, Teal for nearest
      let pinColor = '#EA4335'; // Classic Google Red
      if (isCheapest) pinColor = '#0F9D58'; // Google Green
      else if (isNearest) pinColor = '#00A884'; // NearStock Teal
      if (isSelected) pinColor = '#1A73E8'; // Google Blue

      let pillClass = 'google-price-pill';
      if (isCheapest) pillClass += ' cheapest';
      if (isSelected) pillClass += ' selected';

      const pinIcon = L.divIcon({
        className: 'custom-google-pin',
        html: `
          <div class="google-pin-wrapper ${isSelected ? 'selected' : ''}">
            <div class="${pillClass}">
              <span>${formatCurrency(item.price)}</span>
              ${isCheapest ? '<span class="text-[9px] uppercase tracking-wide bg-white/20 px-1 rounded ml-1">Lowest</span>' : ''}
            </div>
            <svg width="30" height="38" viewBox="0 0 28 36" fill="none" class="google-teardrop">
              <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${pinColor}"/>
              <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
            </svg>
          </div>
        `,
        iconSize: [80, 52],
        iconAnchor: [40, 50],
        popupAnchor: [0, -48],
      });

      // Google Maps Place Card Popup
      const popupHtml = `
        <div class="p-3.5 min-w-[240px] font-sans">
          <div class="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
            <div>
              <h4 class="font-bold text-gray-900 text-sm tracking-tight">${item.shop.name}</h4>
              <div class="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <span class="flex items-center text-amber-500 font-semibold text-[11px]">
                  ★ 4.6
                </span>
                <span>•</span>
                <span class="text-emerald-600 font-semibold text-[11px]">Open · In Stock</span>
              </div>
            </div>
          </div>

          <div class="py-2.5 space-y-1.5 text-xs text-gray-600">
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Item Price:</span>
              <span class="font-bold text-gray-900 text-sm font-mono">${formatCurrency(item.price)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-500">Distance / ETA:</span>
              <span class="font-medium text-gray-800">${formatDistance(item.distance_m)} • ${formatDuration(item.eta_seconds)} walk</span>
            </div>
            <div class="text-[11px] text-gray-400 truncate mt-1">
              📍 ${item.shop.address || 'Local Retail Outlet'}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 flex items-center gap-2">
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${item.shop.lat},${item.shop.lng}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="flex-1 text-center py-1.5 px-3 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-sm"
            >
              Directions
            </a>
            <a 
              href="/shops/${item.shop.id}" 
              class="flex-1 text-center py-1.5 px-3 rounded-lg bg-gray-100 text-gray-800 font-semibold text-xs hover:bg-gray-200 transition-colors"
            >
              View Store
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([item.shop.lat, item.shop.lng], { icon: pinIcon })
        .addTo(map)
        .bindPopup(popupHtml, { closeButton: true, autoPan: true })
        .on('click', () => {
          if (onSelectShop) onSelectShop(item.shop.id);
        });

      if (isSelected) {
        marker.openPopup();
      }

      markersRef.current.push(marker);
      bounds.extend([item.shop.lat, item.shop.lng]);
    });

    if (results.length > 0 && !selectedShopId) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [results, selectedShopId, onSelectShop]);

  // Fly to selected shop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedShopId) return;

    const item = results.find((r) => r.shop.id === selectedShopId);
    if (item) {
      map.flyTo([item.shop.lat, item.shop.lng], 16, { duration: 1.2 });
      const targetMarker = markersRef.current.find(
        (m) =>
          Math.abs(m.getLatLng().lat - item.shop.lat) < 0.0001 &&
          Math.abs(m.getLatLng().lng - item.shop.lng) < 0.0001
      );
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }
  }, [selectedShopId, results]);

  // Custom Google Maps Button Handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleRecenter = () => {
    mapInstanceRef.current?.flyTo(center, 15, { duration: 1 });
  };

  return (
    <div className={`relative overflow-hidden shadow-lg border border-brand-border rounded-2xl ${className}`}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Google Maps Layer Switcher: Map vs Satellite (Top-Left) */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden font-sans text-xs">
        <button
          type="button"
          onClick={() => setMapType('roadmap')}
          className={`px-3 py-1.5 font-medium transition-colors ${
            mapType === 'roadmap'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Map
        </button>
        <div className="w-[1px] h-4 bg-gray-200" />
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 font-medium transition-colors ${
            mapType === 'satellite'
              ? 'bg-blue-50 text-blue-700 font-bold'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Satellite
        </button>
      </div>

      {/* Google Maps Location Target / Recenter Button (Bottom-Right) */}
      <button
        type="button"
        onClick={handleRecenter}
        title="Show your location"
        className="absolute bottom-24 right-3 z-[1000] w-10 h-10 rounded-full bg-white hover:bg-gray-50 text-gray-700 shadow-md border border-gray-200 flex items-center justify-center transition-all active:scale-95 group"
      >
        <Crosshair className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
      </button>

      {/* Google Maps Stacked Zoom Controls (+ / -) (Bottom-Right) */}
      <div className="absolute bottom-6 right-3 z-[1000] flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-10 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-10 h-9 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Google Logo Watermark (Bottom-Left) */}
      <div className="absolute bottom-2 left-3 z-[1000] pointer-events-none select-none flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm text-[10px] text-gray-600 font-sans">
        <span className="font-bold text-gray-800 tracking-tight">Google</span>
        <span className="text-gray-400">·</span>
        <span className="text-[9px] text-gray-500">Map data ©2026</span>
      </div>
    </div>
  );
};
export default MapWrapper;
