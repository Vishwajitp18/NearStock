import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, TrendingUp, Search, Eye, AlertCircle } from 'lucide-react';

const mockChartData = [
  { day: 'Mon', searches: 42, views: 28 },
  { day: 'Tue', searches: 55, views: 36 },
  { day: 'Wed', searches: 78, views: 52 },
  { day: 'Thu', searches: 64, views: 40 },
  { day: 'Fri', searches: 92, views: 65 },
  { day: 'Sat', searches: 130, views: 88 },
  { day: 'Sun', searches: 110, views: 76 },
];

export const AnalyticsPage: React.FC = () => {
  const { shop } = useAuthStore();
  const shopId = shop?.id || '';

  const { data, isLoading } = useQuery<{ stats: any; nearbyDemand: any[] }>({
    queryKey: ['shop-analytics', shopId],
    queryFn: async () => {
      if (!shopId) return { stats: {}, nearbyDemand: [] };
      const { data } = await apiClient.get(`/shops/${shopId}/analytics`);
      return data;
    },
    enabled: !!shopId,
  });

  const nearbyDemand = data?.nearbyDemand || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-heading">Store Demand Analytics</h1>
        <p className="text-xs text-brand-muted mt-1">
          Discover what customers within 3 km are searching for and identify unmet inventory demand
        </p>
      </div>

      {/* Chart: Searches & Views Over Time */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-teal" />
            <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-brand-heading">
              Weekly Customer Discovery Traffic
            </h3>
          </div>
          <span className="text-xs text-brand-teal font-semibold">Last 7 Days</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2de2c6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2de2c6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#526e67" fontSize={11} />
              <YAxis stroke="#526e67" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c1b18',
                  borderColor: '#173530',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="searches"
                stroke="#2de2c6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tealGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Unmet Demand List */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-border-subtle pb-3">
          <Search className="w-4 h-4 text-brand-teal" />
          <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-brand-heading">
            Nearby Search Demand (Within 3 KM)
          </h3>
        </div>

        {nearbyDemand.length === 0 ? (
          <p className="text-xs text-brand-muted py-4 text-center">
            No nearby search logs recorded yet. As customers search near your store, queries will populate here.
          </p>
        ) : (
          <div className="divide-y divide-brand-border-subtle">
            {nearbyDemand.map((d, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-brand-heading">{d.query}</div>
                  <div className="text-[11px] text-brand-muted">
                    Searched {d.search_count} times recently
                  </div>
                </div>

                <div>
                  {d.in_stock_in_shop ? (
                    <Chip label="In Your Stock" variant="success" size="sm" />
                  ) : (
                    <Chip label="High Opportunity - Unstocked" variant="warning" size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

