import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/format';
import { BarChart3, Store, Package, Layers, Search } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery<{
    shops: any;
    products: any;
    inventory: any;
    topSearches: any[];
  }>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/analytics');
      return data;
    },
  });

  const shops = data?.shops || {};
  const products = data?.products || {};
  const inventory = data?.inventory || {};
  const topSearches = data?.topSearches || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-heading">Platform Intelligence & Analytics</h1>
        <p className="text-xs text-brand-muted mt-1">
          High-level metrics across all registered retailers, shelf catalog items, and customer search volume
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Total Retailers</span>
          <div className="text-2xl sm:text-3xl font-black text-brand-heading mt-1">
            {shops.total_shops || '—'}
          </div>
          <div className="text-xs text-brand-muted mt-1">
            {shops.approved_shops || 0} approved • {shops.pending_shops || 0} pending
          </div>
        </Card>

        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Master Catalog</span>
          <div className="text-2xl sm:text-3xl font-black text-brand-teal mt-1">
            {products.total_products || '—'}
          </div>
          <div className="text-xs text-brand-muted mt-1">
            {products.verified_products || 0} verified items
          </div>
        </Card>

        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Platform Stock Value</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {inventory.total_market_value ? formatCurrency(parseFloat(inventory.total_market_value)) : '—'}
          </div>
          <div className="text-xs text-brand-muted mt-1">
            {inventory.total_quantity_in_stock || 0} items on shelves
          </div>
        </Card>

        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Active Searches</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
            {topSearches.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0)}
          </div>
          <div className="text-xs text-brand-muted mt-1">Logged customer queries</div>
        </Card>
      </div>

      {/* Top Search Terms Leaderboard */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-border-subtle pb-3">
          <Search className="w-4 h-4 text-brand-teal" />
          <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-brand-heading">
            Most Searched Products Across All Cities
          </h3>
        </div>

        {topSearches.length === 0 ? (
          <p className="text-xs text-brand-muted py-6 text-center">No searches logged yet.</p>
        ) : (
          <div className="divide-y divide-brand-border-subtle">
            {topSearches.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-xs font-mono font-bold text-brand-teal">
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-brand-heading">{item.query}</span>
                </div>
                <span className="text-xs font-mono text-brand-muted font-bold">
                  {item.count} searches
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

