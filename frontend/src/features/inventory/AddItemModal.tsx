import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { Product } from '../../types/product';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/format';
import { Search, Plus, Sparkles, Check, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';

export interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  shopId,
}) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'catalog' | 'custom'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states for adding inventory item
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [threshold, setThreshold] = useState('5');

  // Custom product suggestion form
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customUnit, setCustomUnit] = useState('1 pc');
  const [customBarcode, setCustomBarcode] = useState('');

  // 1. Search global master catalog
  const { data: catalogProducts = [], isLoading: isCatalogLoading } = useQuery<Product[]>({
    queryKey: ['catalog-search', searchTerm],
    queryFn: async () => {
      const { data } = await apiClient.get('/products', {
        params: { q: searchTerm || undefined, limit: 10 },
      });
      return data.products || [];
    },
    enabled: isOpen,
  });

  // 2. Add inventory mutation
  const addInventoryMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post(`/shops/${shopId}/inventory`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-inventory'] });
      toast.success('Item added to your shop inventory!');
      onClose();
      // reset form
      setSelectedProduct(null);
      setPrice('');
      setMrp('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add item to inventory');
    },
  });

  // 3. Propose custom product mutation
  const proposeProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/products', payload);
      return data.product;
    },
    onSuccess: (newProduct) => {
      toast.success('Custom product suggested!');
      setSelectedProduct(newProduct);
      setTab('catalog');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to suggest product');
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please pick a product from the catalog');
      return;
    }

    const priceNum = parseFloat(price);
    const mrpNum = mrp ? parseFloat(mrp) : undefined;

    if (mrpNum && priceNum > mrpNum) {
      toast.error('Shop price cannot exceed MRP');
      return;
    }

    addInventoryMutation.mutate({
      product_id: selectedProduct.id,
      price: priceNum,
      mrp: mrpNum,
      quantity: parseInt(quantity, 10),
      low_stock_threshold: parseInt(threshold, 10),
    });
  };

  const handleProposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customUnit) {
      toast.error('Product name and unit are required');
      return;
    }

    proposeProductMutation.mutate({
      name: customName,
      brand: customBrand || undefined,
      unit: customUnit,
      barcode: customBarcode || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Item to Store Inventory" maxWidth="xl">
      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-brand-bg p-1 rounded-2xl border border-brand-border text-xs font-semibold mb-6">
        <button
          onClick={() => setTab('catalog')}
          className={`py-2 rounded-xl transition-all ${
            tab === 'catalog'
              ? 'bg-brand-teal text-[#07110f] shadow-sm'
              : 'text-brand-muted hover:text-brand-heading'
          }`}
        >
          Select from Master Catalog
        </button>
        <button
          onClick={() => setTab('custom')}
          className={`py-2 rounded-xl transition-all ${
            tab === 'custom'
              ? 'bg-brand-teal text-[#07110f] shadow-sm'
              : 'text-brand-muted hover:text-brand-heading'
          }`}
        >
          Suggest Custom Product
        </button>
      </div>

      {tab === 'catalog' ? (
        <div className="space-y-4">
          {!selectedProduct ? (
            <div className="space-y-3">
              <Input
                placeholder="Search catalog (e.g. Amul butter, Maggi, Atta)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {isCatalogLoading && (
                  <p className="text-xs text-brand-muted text-center py-4">Searching master catalog...</p>
                )}

                {!isCatalogLoading && catalogProducts.length === 0 && (
                  <div className="text-center py-6 text-xs text-brand-muted">
                    No matching master product found.{' '}
                    <button
                      onClick={() => setTab('custom')}
                      className="text-brand-teal underline font-semibold ml-1"
                    >
                      Suggest a new product
                    </button>
                  </div>
                )}

                {catalogProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setMrp('290');
                      setPrice('280');
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl border border-brand-border bg-brand-surface-hover/50 hover:border-brand-teal/50 hover:bg-brand-surface-hover cursor-pointer transition-all"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-brand-heading">{p.name}</h4>
                      <p className="text-[11px] text-brand-muted">
                        {p.brand ? `${p.brand} • ` : ''}
                        {p.unit}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm">
                      <Plus className="w-3.5 h-3.5" />
                      Pick
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="p-3 bg-brand-teal/10 border border-brand-teal/30 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-brand-heading">{selectedProduct.name}</h4>
                  <p className="text-xs text-brand-teal">{selectedProduct.unit}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-brand-muted hover:text-brand-heading underline"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Selling Price (₹)"
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="280.00"
                />

                <Input
                  label="MRP (₹)"
                  type="number"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="290.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantity in Stock"
                  type="number"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="10"
                />

                <Input
                  label="Low Stock Alert Threshold"
                  type="number"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="5"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button variant="secondary" onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={addInventoryMutation.isPending}
                >
                  Confirm & Add Item
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={handleProposeSubmit} className="space-y-4">
          <Input
            label="Product Name"
            required
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Britannia 100% Whole Wheat Bread"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Brand"
              value={customBrand}
              onChange={(e) => setCustomBrand(e.target.value)}
              placeholder="e.g. Britannia"
            />

            <Input
              label="Pack / Unit"
              required
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="e.g. 400 g, 1 L"
            />
          </div>

          <Input
            label="Barcode (EAN-13 / UPC)"
            value={customBarcode}
            onChange={(e) => setCustomBarcode(e.target.value)}
            placeholder="e.g. 8901234567890"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" onClick={() => setTab('catalog')} type="button">
              Back to Catalog
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={proposeProductMutation.isPending}
            >
              Submit Product
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

