import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { Product } from '../../types/product';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Layers, CheckCircle2, GitMerge, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const AdminCatalogPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['admin-products', searchTerm],
    queryFn: async () => {
      const { data } = await apiClient.get('/products', {
        params: { q: searchTerm || undefined, limit: 100 },
      });
      return data.products || [];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/admin/products/${id}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product verified into master catalog');
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/admin/products/merge', {
        sourceProductId: sourceId,
        targetProductId: targetId,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(res.data.message || 'Products merged successfully');
      setMergeModalOpen(false);
      setSourceId('');
      setTargetId('');
    },
    onError: (err: any) => toast.error(err.message || 'Merge failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-heading">Global Master Product Catalog</h1>
          <p className="text-xs text-brand-muted mt-1">
            Maintain authoritative product names, barcodes, units, and merge shopkeeper duplicate suggestions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMergeModalOpen(true)}>
            <GitMerge className="w-3.5 h-3.5 mr-1 text-brand-teal" />
            Merge Duplicates
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Filter catalog by product name or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-brand-heading placeholder-brand-muted focus:outline-none focus:border-brand-teal"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-surface-hover/70 border-b border-brand-border text-brand-muted font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name & Unit</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border-subtle">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-brand-muted">
                    Loading master catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-brand-muted">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-surface-hover/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-brand-heading">{p.name}</div>
                      <div className="text-[11px] text-brand-muted">{p.unit}</div>
                    </td>
                    <td className="py-3 px-4 text-brand-body">{p.brand || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-brand-teal">
                      {p.barcode || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {p.is_verified ? (
                        <Chip label="Verified" variant="success" size="sm" />
                      ) : (
                        <Chip label="Unverified Suggestion" variant="warning" size="sm" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!p.is_verified && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => verifyMutation.mutate(p.id)}
                          isLoading={verifyMutation.isPending}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Verify
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Duplicate Merge Modal (Section 14) */}
      <Modal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        title="Merge Duplicate Catalog Products"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-brand-body leading-relaxed">
            Specify the duplicate product to remove (Source) and the primary product to retain (Target).
            All inventory records, stock movements, and search logs will be safely repointed to the target product.
          </p>

          <Input
            label="Duplicate Source Product ID (To be deleted)"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="UUID of duplicate"
            required
          />

          <Input
            label="Authoritative Target Product ID (To keep)"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="UUID of canonical product"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setMergeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => mergeMutation.mutate()}
              isLoading={mergeMutation.isPending}
              disabled={!sourceId || !targetId}
            >
              Confirm Merge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

