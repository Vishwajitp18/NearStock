import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { Shop, InventoryItem, Review } from '../../types/shop';
import { MapWrapper } from '../../components/map/MapWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatRelativeTime } from '../../lib/format';
import {
  Navigation,
  Phone,
  Store,
  Star,
  Clock,
  Heart,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ShopDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch shop profile & hours
  const { data: shopData, isLoading: isShopLoading } = useQuery<{ shop: Shop }>({
    queryKey: ['shop', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/shops/${id}`);
      return data;
    },
  });

  // 2. Fetch inventory items in this shop
  const { data: invData, isLoading: isInvLoading } = useQuery<{ total: number; items: InventoryItem[] }>({
    queryKey: ['shop-inventory', id, searchTerm],
    queryFn: async () => {
      const { data } = await apiClient.get(`/shops/${id}/inventory`, {
        params: { q: searchTerm || undefined, limit: 50 },
      });
      return data;
    },
  });

  // 3. Fetch reviews
  const { data: reviewsData } = useQuery<{ reviews: Review[] }>({
    queryKey: ['shop-reviews', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/shops/${id}/reviews`);
      return data;
    },
  });

  const shop = shopData?.shop;
  const items = invData?.items || [];
  const reviews = reviewsData?.reviews || [];

  const todayWeekday = new Date().getDay();

  if (isShopLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-brand-surface border border-brand-border rounded-3xl" />
        <div className="h-64 bg-brand-surface border border-brand-border rounded-3xl" />
      </div>
    );
  }

  if (!shop) {
    return (
      <Card className="text-center py-12 space-y-4">
        <h3 className="text-lg font-bold text-brand-heading">Shop not found</h3>
        <Button variant="secondary" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-brand-heading transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search results
      </button>

      {/* Shop Profile Header Card */}
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {shop.is_open_now ? 'Open Now' : 'Closed'}
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{shop.avg_rating || '4.5'}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-brand-heading tracking-tight">
              {shop.name}
            </h1>

            <p className="text-sm text-brand-body max-w-xl leading-relaxed">
              {shop.description || 'Verified neighborhood retail partner.'}
            </p>

            <div className="text-xs text-brand-muted flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-brand-teal" />
              <span>{shop.address}, {shop.city} {shop.pincode}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 flex-wrap md:flex-col md:items-stretch">
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`,
                  '_blank'
                )
              }
            >
              <Navigation className="w-4 h-4 mr-1" />
              Get Road Directions
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => (window.location.href = `tel:${shop.phone}`)}
            >
              <Phone className="w-4 h-4 mr-1 text-brand-teal" />
              Call {shop.phone}
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid: Hours & Mini-map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Operating Hours Table */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-brand-border-subtle pb-3">
            <Clock className="w-4 h-4 text-brand-teal" />
            <h3 className="text-sm uppercase font-mono tracking-wider font-bold text-brand-heading">
              Operating Hours
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            {shop.hours && shop.hours.length > 0 ? (
              shop.hours.map((h) => {
                const isToday = h.weekday === todayWeekday;
                return (
                  <div
                    key={h.weekday}
                    className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors ${
                      isToday
                        ? 'bg-brand-teal/15 text-brand-teal font-bold border border-brand-teal/30'
                        : 'text-brand-body'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {weekdayNames[h.weekday]}
                      {isToday && <span className="text-[10px] uppercase font-mono">(Today)</span>}
                    </span>
                    <span>
                      {h.is_closed
                        ? 'Closed'
                        : `${h.opens_at ? h.opens_at.slice(0, 5) : '08:00'} - ${h.closes_at ? h.closes_at.slice(0, 5) : '22:00'}`}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-brand-muted">Monday - Sunday: 08:00 AM - 10:00 PM</p>
            )}
          </div>
        </Card>

        {/* Mini Map */}
        <div className="h-64 sm:h-auto">
          <MapWrapper
            center={[shop.lat, shop.lng]}
            zoom={15}
            className="h-full min-h-[250px]"
          />
        </div>
      </div>

      {/* In-Store Live Inventory Catalog */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-brand-heading">Live Store Inventory</h3>
            <p className="text-xs text-brand-muted">
              Explore products available on the shelf at this location
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-brand-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search items in this shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl pl-9 pr-4 py-2 text-xs text-brand-heading placeholder-brand-muted focus:outline-none focus:border-brand-teal"
            />
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="text-center py-10 text-sm text-brand-muted">
            No products found matching "{searchTerm}" in this shop.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.inventory_id} className="p-4 flex flex-col justify-between hover">
                <div className="flex items-start gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover bg-brand-surface-hover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-brand-surface-hover flex items-center justify-center text-brand-muted flex-shrink-0">
                      <Store className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-brand-heading line-clamp-2">
                      {item.name}
                    </h4>
                    <p className="text-xs text-brand-muted mt-0.5">{item.unit}</p>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      In Stock ({item.quantity} available)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-brand-border-subtle mt-3">
                  <div>
                    <span className="text-lg font-black text-brand-heading">
                      {formatCurrency(item.price)}
                    </span>
                    {item.mrp && item.mrp > item.price && (
                      <span className="text-xs text-brand-muted line-through ml-2">
                        {formatCurrency(item.mrp)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-brand-muted">
                    {formatRelativeTime(item.updated_at)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Reviews Section */}
      <div className="space-y-4 pt-4 border-t border-brand-border-subtle">
        <h3 className="text-lg font-bold text-brand-heading">Customer Reviews</h3>
        {reviews.length === 0 ? (
          <p className="text-xs text-brand-muted">No reviews yet for this shop.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <Card key={r.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-heading">{r.user_name}</span>
                  <div className="flex items-center gap-1 text-xs text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{r.rating}</span>
                  </div>
                </div>
                {r.comment && <p className="text-xs text-brand-body">{r.comment}</p>}
                <div className="text-[10px] text-brand-muted">{formatRelativeTime(r.created_at)}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

