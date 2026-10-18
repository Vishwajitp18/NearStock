import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { Shop } from '../../types/shop';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Modal } from '../../components/ui/Modal';
import { MapWrapper } from '../../components/map/MapWrapper';
import { CheckCircle, XCircle, AlertOctagon, Eye, MapPin, Store } from 'lucide-react';
import { toast } from 'sonner';

export const AdminShopsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'suspended'>('pending');
  const [reviewShop, setReviewShop] = useState<Shop | null>(null);

  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ['admin-shops', activeTab],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/shops', {
        params: { status: activeTab },
      });
      return data.shops || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ shopId, status }: { shopId: string; status: string }) => {
      return apiClient.patch(`/admin/shops/${shopId}/status`, { status });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
      toast.success(`Shop status updated to ${vars.status}`);
      setReviewShop(null);
    },
    onError: (err: any) => toast.error(err.message || 'Status update failed'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-heading">Store Moderation & Approval</h1>
        <p className="text-xs text-brand-muted mt-1">
          Review onboarding shopkeeper registrations, verify physical storefronts, and manage suspensions
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-border pb-3">
        {(['pending', 'approved', 'suspended'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-brand-teal text-[#07110f] shadow-sm'
                : 'text-brand-muted hover:text-brand-heading hover:bg-brand-surface'
            }`}
          >
            {tab} Stores
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card className="text-center py-10 text-brand-muted">Loading shops queue...</Card>
      ) : shops.length === 0 ? (
        <Card className="text-center py-12 space-y-2">
          <Store className="w-8 h-8 mx-auto text-brand-teal opacity-50" />
          <h4 className="text-base font-bold text-brand-heading">No {activeTab} stores</h4>
          <p className="text-xs text-brand-muted">Queue is completely caught up.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((s) => (
            <Card key={s.id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-bold text-brand-heading line-clamp-1">{s.name}</h4>
                  <Chip
                    label={s.status}
                    variant={
                      s.status === 'approved'
                        ? 'success'
                        : s.status === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  />
                </div>
                <p className="text-xs text-brand-muted line-clamp-2">{s.address}</p>
                <div className="text-[11px] text-brand-body">
                  Owner: <strong>{s.owner_name}</strong> • Phone: {s.phone}
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border-subtle flex items-center justify-between">
                <Button variant="secondary" size="sm" onClick={() => setReviewShop(s)}>
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Review Details
                </Button>

                {activeTab === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      updateStatusMutation.mutate({ shopId: s.id, status: 'approved' })
                    }
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Drawer Modal */}
      {reviewShop && (
        <Modal
          isOpen={!!reviewShop}
          onClose={() => setReviewShop(null)}
          title={`Review Store: ${reviewShop.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="font-mono uppercase text-brand-muted">Address & Contact</span>
              <p className="text-sm font-semibold text-brand-heading">{reviewShop.address}</p>
              <p className="text-brand-body">Phone: {reviewShop.phone}</p>
              <p className="text-brand-body">Owner: {reviewShop.owner_name}</p>
            </div>

            <div className="h-44 rounded-2xl overflow-hidden border border-brand-border">
              <MapWrapper
                center={[reviewShop.lat, reviewShop.lng]}
                zoom={15}
                className="h-full"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-border-subtle">
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({ shopId: reviewShop.id, status: 'suspended' })
                }
              >
                <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                Suspend Store
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({ shopId: reviewShop.id, status: 'approved' })
                }
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Approve Store
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

