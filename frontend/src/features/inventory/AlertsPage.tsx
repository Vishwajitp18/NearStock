import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { formatCurrency } from '../../lib/format';
import { AlertTriangle, Plus, CheckCircle2, Store } from 'lucide-react';
import { toast } from 'sonner';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { shop } = useAuthStore();
  const shopId = shop?.id || '';

  const { data: alerts = [], isLoading } = useQuery<any[]>({
    queryKey: ['shop-alerts', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await apiClient.get(`/shops/${shopId}/alerts`);
      return data.alerts || [];
    },
    enabled: !!shopId,
  });

  const restockMutation = useMutation({
    mutationFn: async ({ itemId, qty }: { itemId: string; qty: number }) => {
      return apiClient.post(`/shops/${shopId}/inventory/${itemId}/adjust`, {
        change_qty: qty,
        reason: 'restock',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-alerts', shopId] });
      queryClient.invalidateQueries({ queryKey: ['shop-inventory', shopId] });
      toast.success('Stock replenished successfully (+10 units)');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-heading">Low Stock Alerts</h1>
        <p className="text-xs text-brand-muted mt-1">
          Items below their minimum threshold that need supplier reordering
        </p>
      </div>

      {isLoading ? (
        <Card className="text-center py-10 text-brand-muted">Loading alerts...</Card>
      ) : alerts.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-brand-heading">All Healthy!</h3>
          <p className="text-xs text-brand-muted">No items are currently below their low-stock thresholds.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((item) => (
            <Card key={item.inventory_id} className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-brand-heading line-clamp-2">
                    {item.name}
                  </h4>
                  <Chip label={`${item.quantity} left`} variant="warning" size="sm" />
                </div>
                <div className="text-xs text-brand-muted">
                  Threshold: <strong>{item.low_stock_threshold} units</strong> • Price:{' '}
                  <strong>{formatCurrency(item.price)}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border-subtle flex items-center justify-between">
                <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Urgent Restock
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    restockMutation.mutate({ itemId: item.inventory_id, qty: 10 })
                  }
                  isLoading={restockMutation.isPending}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  +10 Restock
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

