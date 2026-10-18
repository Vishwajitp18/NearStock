import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { mockShops } from '../../mocks/mockData';
import { Shop } from '../../types/shop';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Heart,
  Store,
  MapPin,
  Phone,
  Star,
  ExternalLink,
  Trash2,
  Bike,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const FavouritesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [localFavourites, setLocalFavourites] = useState<Shop[]>(mockShops.slice(0, 2));

  // Query favourite shops
  const { data: favourites = localFavourites, isLoading } = useQuery<Shop[]>({
    queryKey: ['favourite-shops'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/favourites');
        return res.data.favourites || res.data;
      } catch (err) {
        return localFavourites;
      }
    },
  });

  // Remove favourite mutation
  const removeMutation = useMutation({
    mutationFn: async (shopId: string) => {
      try {
        await apiClient.delete(`/favourites/${shopId}`);
      } catch (err) {
        // Fallback for mock mode
      }
      return shopId;
    },
    onSuccess: (shopId) => {
      setLocalFavourites((prev) => prev.filter((s) => s.id !== shopId));
      queryClient.setQueryData<Shop[]>(['favourite-shops'], (old) =>
        old ? old.filter((s) => s.id !== shopId) : []
      );
      toast.success('Removed shop from favourites');
    },
    onError: () => {
      toast.error('Failed to remove favourite');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-heading flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-400 fill-red-400/20" />
            Saved Favourites
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Quickly check stock and re-order from your trusted neighbourhood retailers.
          </p>
        </div>

        <Link to="/">
          <Button variant="outline" size="sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-teal" />
            Explore More Shops
          </Button>
        </Link>
      </div>

      {/* Favourites Grid */}
      {favourites.length === 0 ? (
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border mx-auto flex items-center justify-center text-brand-muted">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-heading">No saved stores yet</h3>
            <p className="text-sm text-brand-muted mt-1">
              Tap the heart icon when browsing local shops to save them here for 1-click access.
            </p>
          </div>
          <Link to="/">
            <Button className="mt-2">Browse Nearby Stores</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favourites.map((shop) => (
            <Card
              key={shop.id}
              className="p-5 flex flex-col justify-between hover:border-brand-teal/40 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal group-hover:scale-105 transition-transform">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-brand-heading group-hover:text-brand-teal transition-colors line-clamp-1">
                        {shop.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-brand-muted mt-0.5">
                        <span className="flex items-center text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                          {shop.avg_rating || '4.5'}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-medium ${
                            shop.is_open_now ? 'text-brand-teal' : 'text-red-400'
                          }`}
                        >
                          {shop.is_open_now ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeMutation.mutate(shop.id)}
                    disabled={removeMutation.isPending}
                    className="p-1.5 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-brand-muted mt-3 line-clamp-2">
                  {shop.description || 'Reliable neighbourhood retail partner with daily fresh inventory.'}
                </p>

                <div className="mt-4 pt-3 border-t border-brand-border/60 space-y-1.5 text-xs text-brand-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-brand-teal flex-shrink-0" />
                    <span className="truncate">{shop.address}</span>
                  </div>
                  {shop.phone && (
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
                      <span>{shop.phone}</span>
                    </div>
                  )}
                  {shop.delivery_available && (
                    <div className="flex items-center gap-1.5 text-brand-teal font-medium">
                      <Bike className="w-3.5 h-3.5" />
                      <span>Local Delivery Available</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-brand-border">
                <Link to={`/shops/${shop.id}`} className="block w-full">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Visit Store & Catalog
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default FavouritesPage;

