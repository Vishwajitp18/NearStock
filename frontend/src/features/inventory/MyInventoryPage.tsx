import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import { InventoryItem } from '../../types/shop';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { AddItemModal } from './AddItemModal';
import { formatCurrency, formatRelativeTime } from '../../lib/format';
import {
  Package,
  Plus,
  Search,
  Upload,
  Barcode,
  Power,
  TrendingDown,
  AlertTriangle,
  Minus,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';

export const MyInventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, shop, setShop } = useAuthStore();
  const shopId = shop?.id || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Inline editing state: { [itemId]: { price, quantity } }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQty, setEditQty] = useState<number>(0);

  // 1. Fetch Inventory
  const { data, isLoading } = useQuery<{ total: number; items: InventoryItem[] }>({
    queryKey: ['shop-inventory', shopId, searchTerm],
    queryFn: async () => {
      if (!shopId) return { total: 0, items: [] };
      const { data } = await apiClient.get(`/shops/${shopId}/inventory`, {
        params: { q: searchTerm || undefined, limit: 100 },
      });
      return data;
    },
    enabled: !!shopId,
  });

  // 2. Adjust Stock Stepper Mutation (+ / - 1)
  const adjustStockMutation = useMutation({
    mutationFn: async ({ itemId, change_qty }: { itemId: string; change_qty: number }) => {
      return apiClient.post(`/shops/${shopId}/inventory/${itemId}/adjust`, {
        change_qty,
        reason: change_qty > 0 ? 'restock' : 'sale',
      });
    },
    onMutate: async ({ itemId, change_qty }) => {
      await queryClient.cancelQueries({ queryKey: ['shop-inventory', shopId, searchTerm] });
      const previousData = queryClient.getQueryData(['shop-inventory', shopId, searchTerm]);

      // Optimistic update
      queryClient.setQueryData(['shop-inventory', shopId, searchTerm], (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((it: InventoryItem) =>
            it.inventory_id === itemId
              ? { ...it, quantity: Math.max(0, it.quantity + change_qty) }
              : it
          ),
        };
      });

      return { previousData };
    },
    onError: (err: any, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['shop-inventory', shopId, searchTerm], context.previousData);
      }
      toast.error(err.message || 'Stock adjustment failed');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-inventory', shopId] });
    },
  });

  // 3. Save Inline Edit
  const saveInlineEditMutation = useMutation({
    mutationFn: async ({ itemId, price, quantity }: { itemId: string; price: number; quantity: number }) => {
      return apiClient.patch(`/shops/${shopId}/inventory/${itemId}`, { price, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-inventory', shopId] });
      toast.success('Inventory updated');
      setEditingId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update item');
    },
  });

  // 4. Shop Open / Closed Toggle
  const toggleShopOpenMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      const { data } = await apiClient.patch(`/shops/${shopId}`, { is_open_now: isOpen });
      return data.shop;
    },
    onSuccess: (updatedShop) => {
      setShop(updatedShop);
      toast.success(updatedShop.is_open_now ? 'Store marked as OPEN' : 'Store marked as CLOSED');
    },
  });

  const allItems = data?.items || [];
  const items = filterLowStockOnly
    ? allItems.filter((i) => i.quantity <= i.low_stock_threshold)
    : allItems;

  const totalCount = allItems.length;
  const lowStockCount = allItems.filter((i) => i.quantity > 0 && i.quantity <= i.low_stock_threshold).length;
  const outOfStockCount = allItems.filter((i) => i.quantity === 0).length;
  const totalValue = allItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.inventory_id);
    setEditPrice(item.price);
    setEditQty(item.quantity);
  };

  const handleBarcodeScan = () => {
    // Simulated fast barcode camera scan
    const sampleBarcode = '8901262010053';
    setSearchTerm(sampleBarcode);
    toast.success(`Scanned EAN barcode: ${sampleBarcode} (Amul Butter)`);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,product_id,barcode,price,mrp,quantity,low_stock_threshold\n,8901262010053,285.00,290.00,20,5\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'nearstock_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Top Banner & Master Open Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-surface border border-brand-border rounded-3xl p-6 shadow-surface">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-brand-heading">
              {shop?.name || 'My Store Inventory'}
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                shop?.status === 'approved'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-400/10 text-amber-300 border border-amber-400/20'
              }`}
            >
              {shop?.status === 'approved' ? 'Verified Store' : 'Pending Approval'}
            </span>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Manage your store shelves, live stock levels, and customer selling prices
          </p>
        </div>

        {/* Master Open/Closed Toggle Button */}
        <div className="flex items-center gap-3">
          <Button
            variant={shop?.is_open_now ? 'primary' : 'secondary'}
            size="md"
            onClick={() => toggleShopOpenMutation.mutate(!shop?.is_open_now)}
            isLoading={toggleShopOpenMutation.isPending}
          >
            <Power className="w-4 h-4 mr-1" />
            {shop?.is_open_now ? 'Store: OPEN NOW' : 'Store: CLOSED'}
          </Button>
        </div>
      </div>

      {/* 1. Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Total Items</span>
          <div className="text-2xl sm:text-3xl font-black text-brand-heading mt-1">{totalCount}</div>
          <div className="text-xs text-brand-muted mt-1">Catalog entries</div>
        </Card>

        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Low Stock Items</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">{lowStockCount}</div>
          <div className="text-xs text-brand-muted mt-1">Below threshold</div>
        </Card>

        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Out of Stock</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">{outOfStockCount}</div>
          <div className="text-xs text-brand-muted mt-1">Zero inventory</div>
        </Card>

        <Card>
          <span className="text-xs uppercase font-mono text-brand-muted tracking-wider">Total Inventory Value</span>
          <div className="text-2xl sm:text-3xl font-black text-brand-teal mt-1">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs text-brand-muted mt-1">Stocked shelf value</div>
        </Card>
      </div>

      {/* 2. Search & Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search store items or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-brand-heading placeholder-brand-muted focus:outline-none focus:border-brand-teal"
            />
          </div>

          <Button variant="secondary" size="sm" onClick={handleBarcodeScan} title="Simulate Barcode Scanner">
            <Barcode className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filterLowStockOnly
                ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                : 'border-brand-border text-brand-muted hover:text-brand-heading'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Low Stock Alerts ({lowStockCount})
          </button>

          <Button variant="secondary" size="sm" onClick={handleDownloadCsvTemplate}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-brand-teal" />
            CSV Template
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      {/* 3. Inventory Table (Desktop) / Cards (Mobile) */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-surface-hover/70 border-b border-brand-border text-brand-muted font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item & Details</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">MRP</th>
                <th className="py-3 px-4">Stock Stepper</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-brand-muted">
                    Loading store inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-brand-muted">
                    No items in inventory. Click <strong>Add Item</strong> above to populate your store!
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isEditing = editingId === item.inventory_id;
                  const isLow = item.quantity <= item.low_stock_threshold;
                  const isOut = item.quantity === 0;

                  return (
                    <tr
                      key={item.inventory_id}
                      className="hover:bg-brand-surface-hover/30 transition-colors"
                    >
                      {/* Product Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-brand-heading text-sm">{item.name}</div>
                        <div className="text-[11px] text-brand-muted">
                          {item.brand ? `${item.brand} • ` : ''}
                          {item.unit}
                          {item.barcode ? ` • EAN: ${item.barcode}` : ''}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                            className="w-20 bg-brand-bg border border-brand-teal rounded px-2 py-1 text-brand-heading font-bold"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(item)}
                            className="font-bold text-brand-heading cursor-pointer hover:text-brand-teal underline decoration-dotted"
                          >
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-4 text-brand-muted">
                        {item.mrp ? formatCurrency(item.mrp) : '—'}
                      </td>

                      {/* Stock Quantity + Atomic Stepper Buttons */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(parseInt(e.target.value, 10) || 0)}
                            className="w-16 bg-brand-bg border border-brand-teal rounded px-2 py-1 text-brand-heading font-bold"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                adjustStockMutation.mutate({
                                  itemId: item.inventory_id,
                                  change_qty: -1,
                                })
                              }
                              disabled={item.quantity <= 0}
                              className="w-7 h-7 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-body hover:text-rose-400 hover:border-rose-400/40 disabled:opacity-30 transition-all"
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            <span className="font-bold text-sm text-brand-heading w-8 text-center">
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                adjustStockMutation.mutate({
                                  itemId: item.inventory_id,
                                  change_qty: 1,
                                })
                              }
                              className="w-7 h-7 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-body hover:text-brand-teal hover:border-brand-teal/40 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isOut ? (
                          <Chip label="Out of Stock" variant="danger" size="sm" />
                        ) : isLow ? (
                          <Chip label="Low Stock" variant="warning" size="sm" />
                        ) : (
                          <Chip label="In Stock" variant="success" size="sm" />
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                saveInlineEditMutation.mutate({
                                  itemId: item.inventory_id,
                                  price: editPrice,
                                  quantity: editQty,
                                })
                              }
                              className="p-1.5 rounded-lg bg-brand-teal text-[#07110f] hover:bg-brand-teal/90"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-heading"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-teal hover:bg-brand-surface-hover"
                            title="Edit Price/Stock"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Item Modal */}
      {shopId && (
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          shopId={shopId}
        />
      )}
    </div>
  );
};

