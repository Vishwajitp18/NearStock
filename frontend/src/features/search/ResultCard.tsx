import React from 'react';
import { SearchResultItem } from '../../types/search';
import { formatCurrency, formatDistance, formatDuration, formatRelativeTime } from '../../lib/format';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import {
  Navigation,
  Phone,
  Store,
  Star,
  Clock,
  Heart,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ResultCardProps {
  item: SearchResultItem;
  isSelected?: boolean;
  onSelect?: () => void;
  onToggleFavourite?: () => void;
  isFavourite?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  item,
  isSelected = false,
  onSelect,
  onToggleFavourite,
  isFavourite = false,
}) => {
  const navigate = useNavigate();

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${item.shop.lat},${item.shop.lng}`,
      '_blank'
    );
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${item.shop.phone}`;
  };

  const handleViewShop = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/shops/${item.shop.id}`);
  };

  const savings = item.mrp && item.mrp > item.price ? item.mrp - item.price : 0;

  return (
    <div
      onClick={onSelect}
      className={`group relative bg-brand-surface border rounded-2xl md:rounded-3xl p-5 transition-all duration-200 cursor-pointer shadow-surface ${
        isSelected
          ? 'border-brand-teal ring-1 ring-brand-teal/40 bg-brand-surface-hover/80 shadow-teal-glow'
          : 'border-brand-border hover:border-brand-teal/40 hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header: Shop Name, Badges & Favourite */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-base font-bold text-brand-heading group-hover:text-brand-teal transition-colors">
              {item.shop.name}
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Open now
            </span>
          </div>
          {item.shop.address && (
            <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">{item.shop.address}</p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavourite?.();
          }}
          className={`p-2 rounded-xl border border-brand-border hover:border-brand-teal/40 transition-colors ${
            isFavourite ? 'text-rose-500 bg-rose-500/10 border-rose-500/30' : 'text-brand-muted hover:text-brand-heading'
          }`}
          title="Save shop"
        >
          <Heart className={`w-4 h-4 ${isFavourite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Middle: Big Price, MRP Savings & Travel ETA */}
      <div className="grid grid-cols-2 gap-3 py-3 border-y border-brand-border-subtle my-3">
        {/* Price & Savings */}
        <div>
          <div className="text-[11px] uppercase font-mono text-brand-muted tracking-wider">
            Shop Price
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-brand-heading tracking-tight">
              {formatCurrency(item.price)}
            </span>
            {item.mrp && item.mrp > item.price && (
              <span className="text-xs text-brand-muted line-through">
                {formatCurrency(item.mrp)}
              </span>
            )}
          </div>
          {savings > 0 && (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
              <TrendingDown className="w-3.5 h-3.5" />
              Save {formatCurrency(savings)}
            </div>
          )}
        </div>

        {/* Distance & ETA */}
        <div className="text-right">
          <div className="text-[11px] uppercase font-mono text-brand-muted tracking-wider">
            Travel Time
          </div>
          <div className="text-xl font-bold text-brand-heading mt-0.5">
            {formatDuration(item.eta_seconds)}
          </div>
          <div className="text-xs text-brand-body flex items-center justify-end gap-1 mt-1">
            <Navigation className="w-3 h-3 text-brand-teal" />
            {formatDistance(item.distance_m)} away
          </div>
        </div>
      </div>

      {/* Tags row: Nearest, Fastest, Cheapest & Stock Hint */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.tags.includes('cheapest') && (
            <Chip label="Cheapest" variant="teal" size="sm" />
          )}
          {item.tags.includes('fastest') && (
            <Chip label="Fastest ETA" variant="teal" size="sm" />
          )}
          {item.tags.includes('nearest') && (
            <Chip label="Nearest" variant="muted" size="sm" />
          )}
          <span className="text-xs text-brand-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(item.stock_updated_at)}
          </span>
        </div>

        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            item.quantity_hint === 'Few left'
              ? 'text-amber-400 bg-amber-400/10'
              : 'text-emerald-400 bg-emerald-400/10'
          }`}
        >
          {item.quantity_hint}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleDirections}
        >
          <Navigation className="w-3.5 h-3.5 text-brand-teal" />
          Directions
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCall}
          className="px-3"
          title="Call shop"
        >
          <Phone className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleViewShop}
        >
          View Store
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

