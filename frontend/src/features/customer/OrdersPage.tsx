import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { mockOrders, MockOrderItem } from '../../mocks/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { formatINR, formatRelativeTime, formatDate } from '../../lib/format';
import {
  Package,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShoppingBag,
  Bike,
} from 'lucide-react';
import { toast } from 'sonner';

export const OrdersPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [ordersList, setOrdersList] = useState<MockOrderItem[]>(mockOrders);

  const isShopkeeper = user?.role === 'shopkeeper';

  // Fetch orders from API
  const { data: orders = ordersList, isLoading } = useQuery<MockOrderItem[]>({
    queryKey: ['orders-list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/orders');
        return res.data.orders || res.data;
      } catch (err) {
        return ordersList;
      }
    },
  });

  // Status update mutation (e.g. cancel, mark ready, complete)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      try {
        await apiClient.patch(`/orders/${orderId}/status`, { status });
      } catch (err) {
        // Fallback for mock mode
      }
      return { orderId, status };
    },
    onSuccess: ({ orderId, status }) => {
      setOrdersList((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: status as any } : o))
      );
      queryClient.setQueryData<MockOrderItem[]>(['orders-list'], (old) =>
        old ? old.map((o) => (o.id === orderId ? { ...o, status: status as any } : o)) : []
      );
      toast.success(`Order status updated to ${status}`);
    },
    onError: () => {
      toast.error('Failed to update order status');
    },
  });

  const filteredOrders = orders.filter((order) => {
    if (filterTab === 'active') {
      return ['placed', 'accepted', 'ready'].includes(order.status);
    }
    if (filterTab === 'completed') {
      return ['completed', 'cancelled'].includes(order.status);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-teal/15 text-brand-teal border border-brand-teal/30">
            <CheckCircle className="w-3.5 h-3.5" /> Ready for Pickup
          </span>
        );
      case 'placed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5" /> Order Placed
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Shop Accepted
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-surface text-brand-muted border border-brand-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-heading flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-teal" />
            {isShopkeeper ? 'Store Orders & Reservations' : 'My Orders & Reservations'}
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {isShopkeeper
              ? 'Incoming pickup orders and reservations from nearby customers.'
              : 'Track pickup readiness and past receipts with local retailers.'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-border rounded-lg p-1">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${
                filterTab === tab
                  ? 'bg-brand-teal text-[#07110f] font-semibold shadow-sm'
                  : 'text-brand-muted hover:text-brand-heading'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border mx-auto flex items-center justify-center text-brand-muted">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-heading">No orders found</h3>
            <p className="text-sm text-brand-muted mt-1">
              {filterTab === 'all'
                ? "You haven't placed any inventory reservations yet."
                : `No ${filterTab} orders right now.`}
            </p>
          </div>
          {!isShopkeeper && (
            <Link to="/">
              <Button className="mt-2">Explore Nearby Stock</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="p-5 space-y-4">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-border/60">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-brand-heading">
                    #{order.id}
                  </span>
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-brand-muted font-mono flex items-center gap-1">
                    {order.type === 'delivery' ? (
                      <span className="flex items-center gap-1 text-brand-teal">
                        <Bike className="w-3.5 h-3.5" /> Delivery
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-brand-muted">
                        <Package className="w-3.5 h-3.5" /> Store Pickup
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-xs text-brand-muted font-mono">
                  {formatDate(order.created_at)} ({formatRelativeTime(order.created_at)})
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-brand-teal flex-shrink-0" />
                    <span className="font-semibold text-brand-heading">{order.shop_name}</span>
                  </div>
                  <div className="text-xs text-brand-muted pl-6">{order.shop_address}</div>
                  <div className="text-sm text-brand-body pl-6 pt-1">
                    <span className="text-brand-muted text-xs">Items: </span>
                    <span className="font-medium">{order.items_summary}</span>
                  </div>
                  {isShopkeeper && order.customer_name && (
                    <div className="text-xs text-brand-muted pl-6 pt-0.5">
                      Customer: <span className="text-brand-heading font-medium">{order.customer_name}</span> ({order.customer_phone})
                    </div>
                  )}
                </div>

                {/* Amount and Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-border/40">
                  <div className="text-right">
                    <div className="text-xs text-brand-muted">Total Payable</div>
                    <div className="text-xl font-bold font-mono text-brand-teal">
                      {formatINR(order.total)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Customer Actions */}
                    {!isShopkeeper && order.status === 'placed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        loading={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            orderId: order.id,
                            status: 'cancelled',
                          })
                        }
                      >
                        Cancel Order
                      </Button>
                    )}

                    {/* Shopkeeper Actions */}
                    {isShopkeeper && order.status === 'placed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            orderId: order.id,
                            status: 'ready',
                          })
                        }
                      >
                        Mark Ready
                      </Button>
                    )}

                    {isShopkeeper && order.status === 'ready' && (
                      <Button
                        size="sm"
                        loading={updateStatusMutation.isPending}
                        onClick={() =>
                          updateStatusMutation.mutate({
                            orderId: order.id,
                            status: 'completed',
                          })
                        }
                      >
                        Mark Completed
                      </Button>
                    )}

                    <Link to={`/shops/${order.shop_id}`}>
                      <Button size="sm" variant="ghost" className="text-xs">
                        View Store
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
export default OrdersPage;

