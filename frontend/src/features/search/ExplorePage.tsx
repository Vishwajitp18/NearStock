import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearch } from './useSearch';
import { ResultCard } from './ResultCard';
import { MapWrapper } from '../../components/map/MapWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLocationStore } from '../../store/locationStore';
import { formatCurrency, formatDistance, formatDuration } from '../../lib/format';
import {
  Search,
  Sparkles,
  X,
  MapPin,
  SlidersHorizontal,
  Store,
  Clock,
  Tag,
  Navigation,
  Compass,
  ArrowRight,
  Map as MapIcon,
  List as ListIcon,
  RefreshCw,
} from 'lucide-react';
import { SearchFilters } from '../../types/search';
import { toast } from 'sonner';

const trySuggestions = [
  'Amul butter 500g',
  'Amul Taaza Toned Milk 1L',
  'Aashirvaad Shudh Chakki Atta 5kg',
  'Maggi 2-Minute Instant Noodles 280g',
  'Paracetamol 500mg',
];

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || 'Amul butter 500g';
  const sortParam = (searchParams.get('sort') as any) || 'best';
  const radiusParam = parseInt(searchParams.get('radius') || '3000', 10);

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [activeQuery, setActiveQuery] = useState(queryParam);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'split' | 'list' | 'map'>('split');

  const { lat, lng, address } = useLocationStore();

  const [filters, setFilters] = useState<SearchFilters>({
    sort: sortParam,
    radius: radiusParam,
    openOnly: true,
    inStockOnly: true,
    deliveryOnly: false,
    minRating: 0,
  });

  // Sync state to URL params
  useEffect(() => {
    setSearchParams(
      {
        q: activeQuery,
        sort: filters.sort,
        radius: filters.radius.toString(),
      },
      { replace: true }
    );
  }, [activeQuery, filters.sort, filters.radius, setSearchParams]);

  const { data, isLoading, isError, refetch } = useSearch(
    activeQuery,
    lat,
    lng,
    filters
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;
    setActiveQuery(inputQuery.trim());
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputQuery(suggestion);
    setActiveQuery(suggestion);
  };

  const results = data?.results || [];

  // Stat cards values
  const totalShops = results.length;
  const openShops = results.filter((r) => r.in_stock).length;
  const lowestPrice =
    results.length > 0 ? Math.min(...results.map((r) => r.price)) : null;
  const nearestResult =
    results.length > 0
      ? results.reduce((min, r) => (r.distance_m < min.distance_m ? r : min), results[0])
      : null;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 1. Hero Card */}
      <div className="relative overflow-hidden bg-brand-surface border border-brand-border rounded-3xl p-6 sm:p-10 shadow-surface">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-teal/10 border border-brand-teal/30 text-xs font-semibold text-brand-teal">
            <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
            Live stock from shops near you
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-black text-brand-heading tracking-tight leading-[1.1]">
            Find it nearby, <br className="hidden sm:inline" />
            before you leave home.
          </h1>

          <p className="text-sm sm:text-base text-brand-body leading-relaxed max-w-xl">
            Real-time shelf inventory, store-by-store road ETA, and instant price comparisons across verified neighborhood retailers.
          </p>

          {/* Big Pill Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center bg-brand-bg/90 border border-brand-border rounded-full p-2 shadow-2xl focus-within:border-brand-teal focus-within:ring-2 focus-within:ring-brand-teal/30 transition-all">
              <div className="pl-3.5 pr-2 text-brand-teal pointer-events-none">
                <Sparkles className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Amul butter 500g near me..."
                className="w-full bg-transparent text-brand-heading placeholder-brand-muted text-sm sm:text-base focus:outline-none px-2"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => setInputQuery('')}
                  className="p-1.5 rounded-full text-brand-muted hover:text-brand-heading hover:bg-brand-surface transition-colors mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <Button type="submit" variant="primary" size="md" className="flex-shrink-0">
                Ask
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </form>

          {/* "Try:" Suggestion chips */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-brand-muted font-mono uppercase tracking-wider">Try:</span>
            {trySuggestions.map((item) => (
              <Chip
                key={item}
                label={item}
                variant="muted"
                size="sm"
                onClick={() => handleSuggestionClick(item)}
              />
            ))}
          </div>

          {/* Location indicator & radius selector */}
          <div className="flex items-center gap-3 pt-3 flex-wrap text-xs text-brand-body border-t border-brand-border-subtle">
            <div className="flex items-center gap-1.5 text-brand-teal font-medium">
              <MapPin className="w-4 h-4" />
              <span>{address}</span>
            </div>
            <span className="text-brand-muted">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-brand-muted">Radius:</span>
              {[1000, 3000, 5000, 10000].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilters((f) => ({ ...f, radius: r }))}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                    filters.radius === r
                      ? 'bg-brand-teal text-[#07110f]'
                      : 'text-brand-muted hover:text-brand-heading bg-brand-surface'
                  }`}
                >
                  {r / 1000} km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stat Cards Row (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Shops Near You</span>
            <Store className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-brand-heading">
            {totalShops}
          </div>
          <div className="text-xs text-brand-muted mt-1">Within {filters.radius / 1000} km radius</div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Open Now</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {openShops}
          </div>
          <div className="text-xs text-brand-muted mt-1">Ready for pickup or visit</div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Lowest Price Found</span>
            <Tag className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-brand-teal">
            {lowestPrice !== null ? formatCurrency(lowestPrice) : '—'}
          </div>
          <div className="text-xs text-brand-muted mt-1">
            {lowestPrice !== null ? 'Best deal nearby' : 'Awaiting item search'}
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-muted mb-2">
            <span className="text-xs uppercase font-mono tracking-wider">Nearest Shop</span>
            <Navigation className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-brand-heading">
            {nearestResult ? formatDistance(nearestResult.distance_m) : '—'}
          </div>
          <div className="text-xs text-brand-muted mt-1">
            {nearestResult ? `${formatDuration(nearestResult.eta_seconds)} travel time` : 'Select an item to view'}
          </div>
        </Card>
      </div>

      {/* Auto-expand Radius Notification Banner */}
      {data?.radius_auto_expanded && (
        <div className="bg-brand-teal/10 border border-brand-teal/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-brand-teal flex-shrink-0" />
            <span className="text-sm text-brand-heading">
              No shops were stocking this within {data.original_radius_m ? data.original_radius_m / 1000 : 1} km.
              We automatically expanded your search to <strong>{data.radius_m / 1000} km</strong>.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFilters((f) => ({ ...f, radius: data.radius_m }))}
          >
            Keep {data.radius_m / 1000} km
          </Button>
        </div>
      )}

      {/* Mobile Map / List Toggle */}
      <div className="flex md:hidden items-center justify-between bg-brand-surface border border-brand-border rounded-2xl p-2">
        <span className="text-xs font-semibold px-2 text-brand-heading">
          {results.length} shops found
        </span>
        <div className="flex items-center gap-1 bg-brand-bg rounded-xl p-1">
          <button
            onClick={() => setMobileView('list')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
              mobileView === 'list'
                ? 'bg-brand-teal text-[#07110f]'
                : 'text-brand-muted'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
              mobileView === 'map'
                ? 'bg-brand-teal text-[#07110f]'
                : 'text-brand-muted'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map
          </button>
        </div>
      </div>

      {/* 3. Results Split View Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filters Card + Result Cards (7 cols on lg) */}
        <div
          className={`lg:col-span-7 space-y-4 ${
            mobileView === 'map' ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Filters & Sorting Segmented Control Card */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-teal" />
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-brand-heading">
                  Sort & Filters
                </span>
              </div>
              <button
                onClick={() =>
                  setFilters({
                    sort: 'best',
                    radius: 3000,
                    openOnly: true,
                    inStockOnly: true,
                    deliveryOnly: false,
                    minRating: 0,
                  })
                }
                className="text-xs text-brand-muted hover:text-brand-teal transition-colors"
              >
                Reset all
              </button>
            </div>

            {/* Sort Mode Segmented Control */}
            <div className="grid grid-cols-4 gap-1.5 bg-brand-bg p-1.5 rounded-2xl border border-brand-border text-xs font-semibold">
              {(
                [
                  { id: 'best', label: 'Best match' },
                  { id: 'nearest', label: 'Nearest' },
                  { id: 'fastest', label: 'Fastest' },
                  { id: 'cheapest', label: 'Cheapest' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setFilters((f) => ({ ...f, sort: mode.id }))}
                  className={`py-2 rounded-xl text-center transition-all ${
                    filters.sort === mode.id
                      ? 'bg-brand-teal text-[#07110f] shadow-sm'
                      : 'text-brand-muted hover:text-brand-heading'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Quick Filter Toggles */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => setFilters((f) => ({ ...f, openOnly: !f.openOnly }))}
                className={`px-3 py-1.5 rounded-full border transition-all ${
                  filters.openOnly
                    ? 'bg-brand-teal/15 border-brand-teal text-brand-teal font-semibold'
                    : 'border-brand-border text-brand-muted hover:text-brand-heading'
                }`}
              >
                Open now only
              </button>
              <button
                onClick={() =>
                  setFilters((f) => ({ ...f, deliveryOnly: !f.deliveryOnly }))
                }
                className={`px-3 py-1.5 rounded-full border transition-all ${
                  filters.deliveryOnly
                    ? 'bg-brand-teal/15 border-brand-teal text-brand-teal font-semibold'
                    : 'border-brand-border text-brand-muted hover:text-brand-heading'
                }`}
              >
                Delivery available
              </button>
            </div>
          </Card>

          {/* Results Header */}
          <div className="flex items-center justify-between text-xs font-mono text-brand-muted px-1">
            <span>
              SHOWING {results.length} STORES FOR "{activeQuery}"
            </span>
            <span>RADIUS: {filters.radius / 1000} KM</span>
          </div>

          {/* Loading Skeletons */}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-44 w-full rounded-3xl" />
              <Skeleton className="h-44 w-full rounded-3xl" />
            </div>
          )}

          {/* Error State */}
          {isError && (
            <Card className="text-center py-10 space-y-3">
              <p className="text-sm text-rose-400">Failed to fetch nearby stock</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry
              </Button>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && results.length === 0 && (
            <Card className="text-center py-12 px-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-brand-surface-hover flex items-center justify-center mx-auto text-brand-teal">
                <Store className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-brand-heading">
                  No shops found with stock within {filters.radius / 1000} km
                </h3>
                <p className="text-xs text-brand-muted max-w-sm mx-auto">
                  Try searching a different item or expand your search distance to discover retailers further out.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    radius: f.radius >= 10000 ? 15000 : f.radius + 3000,
                  }))
                }
              >
                Expand search radius to {(filters.radius + 3000) / 1000} km
              </Button>
            </Card>
          )}

          {/* Result Cards List */}
          {!isLoading &&
            results.map((item) => (
              <ResultCard
                key={item.shop.id}
                item={item}
                isSelected={selectedShopId === item.shop.id}
                onSelect={() => setSelectedShopId(item.shop.id)}
                onToggleFavourite={() => toast.success(`Saved ${item.shop.name} to favourites`)}
              />
            ))}
        </div>

        {/* Right Column: Sticky Map (5 cols on lg) */}
        <div
          className={`lg:col-span-5 sticky top-24 ${
            mobileView === 'list' ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="space-y-2">
            <MapWrapper
              center={[lat, lng]}
              zoom={13}
              results={results}
              selectedShopId={selectedShopId}
              onSelectShop={(id) => setSelectedShopId(id)}
              className="h-[520px] w-full"
            />
            <div className="flex items-center justify-between text-[11px] text-brand-muted px-2 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-teal" />
                  Cheapest
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border border-brand-teal bg-[#0c1b18]" />
                  Nearest
                </span>
              </div>
              <span>Click a pin to highlight</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

