import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Shop, ShopHours } from '../../types/shop';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MapWrapper } from '../../components/map/MapWrapper';
import { Store, Clock, Save, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ShopProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { shop, setShop } = useAuthStore();
  const shopId = shop?.id || '';

  const [name, setName] = useState(shop?.name || '');
  const [description, setDescription] = useState(shop?.description || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: shop?.lat || 12.9716,
    lng: shop?.lng || 77.5946,
  });

  const [hours, setHours] = useState<ShopHours[]>([
    { weekday: 0, opens_at: '08:00', closes_at: '22:00', is_closed: false },
    { weekday: 1, opens_at: '08:00', closes_at: '22:00', is_closed: false },
    { weekday: 2, opens_at: '08:00', closes_at: '22:00', is_closed: false },
    { weekday: 3, opens_at: '08:00', closes_at: '22:00', is_closed: false },
    { weekday: 4, opens_at: '08:00', closes_at: '22:00', is_closed: false },
    { weekday: 5, opens_at: '08:00', closes_at: '22:00', is_closed: false },
    { weekday: 6, opens_at: '08:00', closes_at: '22:00', is_closed: false },
  ]);

  // Fetch live shop profile & hours
  const { data: shopData } = useQuery<{ shop: Shop }>({
    queryKey: ['shop-profile', shopId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/shops/${shopId}`);
      return data;
    },
    enabled: !!shopId,
  });

  useEffect(() => {
    if (shopData?.shop) {
      const s = shopData.shop;
      setName(s.name);
      setDescription(s.description || '');
      setPhone(s.phone);
      setAddress(s.address);
      setCoords({ lat: s.lat, lng: s.lng });
      if (s.hours && s.hours.length > 0) {
        setHours(s.hours);
      }
    }
  }, [shopData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.patch(`/shops/${shopId}`, payload);
      return data.shop;
    },
    onSuccess: (updated) => {
      setShop(updated);
      toast.success('Store details saved');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update store details'),
  });

  // Update hours mutation
  const updateHoursMutation = useMutation({
    mutationFn: async (hoursPayload: ShopHours[]) => {
      return apiClient.put(`/shops/${shopId}/hours`, { hours: hoursPayload });
    },
    onSuccess: () => {
      toast.success('Operating hours saved');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update hours'),
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name,
      description,
      phone,
      address,
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  const handleHourChange = (weekday: number, field: keyof ShopHours, value: any) => {
    setHours((prev) =>
      prev.map((h) => (h.weekday === weekday ? { ...h, [field]: value } : h))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-heading">Store Profile & Operating Hours</h1>
        <p className="text-xs text-brand-muted mt-1">
          Keep your storefront information accurate for nearby customers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Details Form */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-brand-border-subtle pb-3">
            <Store className="w-4 h-4 text-brand-teal" />
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-brand-heading">
              Store Information
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Store Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <Input
              label="Physical Street Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-brand-muted tracking-wider">
                Store Location Coordinates (Click map to adjust)
              </label>
              <div className="h-44 rounded-2xl overflow-hidden border border-brand-border">
                <MapWrapper
                  center={[coords.lat, coords.lng]}
                  zoom={15}
                  isPicker
                  onPickLocation={(lat, lng) => setCoords({ lat, lng })}
                  className="h-full"
                />
              </div>
              <p className="text-[10px] text-brand-muted font-mono">
                Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={updateProfileMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              Save Store Details
            </Button>
          </form>
        </Card>

        {/* Operating Hours Editor */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-teal" />
              <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-brand-heading">
                Weekly Operating Schedule
              </h3>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateHoursMutation.mutate(hours)}
              isLoading={updateHoursMutation.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Schedule
            </Button>
          </div>

          <div className="space-y-3">
            {hours.map((h) => (
              <div
                key={h.weekday}
                className="flex items-center justify-between gap-3 p-2.5 bg-brand-bg rounded-xl border border-brand-border-subtle text-xs"
              >
                <span className="font-semibold text-brand-heading w-24">
                  {weekdayNames[h.weekday]}
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    disabled={h.is_closed}
                    value={h.opens_at ? h.opens_at.slice(0, 5) : '08:00'}
                    onChange={(e) => handleHourChange(h.weekday, 'opens_at', e.target.value)}
                    className="bg-brand-surface border border-brand-border rounded px-2 py-1 text-brand-heading disabled:opacity-40"
                  />
                  <span>-</span>
                  <input
                    type="time"
                    disabled={h.is_closed}
                    value={h.closes_at ? h.closes_at.slice(0, 5) : '22:00'}
                    onChange={(e) => handleHourChange(h.weekday, 'closes_at', e.target.value)}
                    className="bg-brand-surface border border-brand-border rounded px-2 py-1 text-brand-heading disabled:opacity-40"
                  />
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-brand-muted hover:text-brand-heading">
                  <input
                    type="checkbox"
                    checked={h.is_closed}
                    onChange={(e) => handleHourChange(h.weekday, 'is_closed', e.target.checked)}
                    className="rounded text-brand-teal"
                  />
                  <span>Closed</span>
                </label>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

