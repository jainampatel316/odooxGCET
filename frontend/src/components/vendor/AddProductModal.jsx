import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from '@/hooks/use-toast';
import { vendorProductAPI } from '../../utils/api';

const emptyForm = {
  name: '',
  description: '',
  sku: '',
  costPrice: '',
  salesPrice: '',
  hourlyPrice: '',
  dailyPrice: '',
  isRentable: true,
  quantityOnHand: 0,
  status: 'DRAFT',
  imageUrl: '',
  tags: '',
};

export default function AddProductModal({ open, onOpenChange, onSuccess, product: editingProduct }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const isEdit = Boolean(editingProduct?.id);

  useEffect(() => {
    if (open && editingProduct) {
      const rentalPricing = editingProduct.rentalPricing || [];
      const hourly = rentalPricing.find((p) => p.periodType === 'HOURLY');
      const daily = rentalPricing.find((p) => p.periodType === 'DAILY');
      setForm({
        name: editingProduct.name ?? '',
        description: editingProduct.description ?? '',
        sku: editingProduct.sku ?? '',
        costPrice: editingProduct.costPrice != null ? String(editingProduct.costPrice) : '',
        salesPrice: editingProduct.salesPrice != null ? String(editingProduct.salesPrice) : '',
        hourlyPrice: hourly?.price != null ? String(hourly.price) : '',
        dailyPrice: daily?.price != null ? String(daily.price) : '',
        isRentable: editingProduct.isRentable !== false,
        quantityOnHand: editingProduct.quantityOnHand ?? 0,
        status: editingProduct.status ?? 'DRAFT',
        imageUrl: editingProduct.imageUrl ?? '',
        tags: Array.isArray(editingProduct.tags) ? editingProduct.tags.join(', ') : (editingProduct.tags ?? ''),
      });
    } else if (open && !editingProduct) {
      setForm(emptyForm);
    }
  }, [open, editingProduct]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.sku?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and SKU are required',
        variant: 'destructive',
      });
      return;
    }
    if (form.costPrice === '' || form.salesPrice === '' || Number(form.costPrice) < 0 || Number(form.salesPrice) < 0) {
      toast({
        title: 'Validation Error',
        description: 'Cost and sales price must be 0 or greater',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        sku: form.sku.trim(),
        costPrice: Number(form.costPrice) || 0,
        salesPrice: Number(form.salesPrice) || 0,
        hourlyPrice: form.hourlyPrice !== '' ? Number(form.hourlyPrice) : null,
        dailyPrice: form.dailyPrice !== '' ? Number(form.dailyPrice) : null,
        isRentable: form.isRentable,
        quantityOnHand: Number(form.quantityOnHand) || 0,
        status: form.status,
        imageUrl: form.imageUrl?.trim() || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      if (isEdit) {
        await vendorProductAPI.updateProduct(editingProduct.id, payload);
        toast({
          title: 'Product Updated',
          description: `${form.name} has been updated.`,
        });
      } else {
        await vendorProductAPI.createProduct(payload);
        toast({
          title: 'Product Created',
          description: `${form.name} has been added.`,
        });
      }
      setForm(emptyForm);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || (isEdit ? 'Failed to update product' : 'Failed to create product'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Product name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SKU *</label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. PROD-001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Brief description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cost Price</label>
              <input
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sales Price</label>
              <input
                name="salesPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.salesPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Hourly rental price (₹)</label>
              <input
                name="hourlyPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Per day rental price (₹)</label>
              <input
                name="dailyPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.dailyPrice}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity on hand</label>
            <input
              name="quantityOnHand"
              type="number"
              min="0"
              value={form.quantityOnHand}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image URL</label>
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="rental, equipment, event"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              name="isRentable"
              type="checkbox"
              checked={form.isRentable}
              onChange={handleChange}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label className="text-sm">Rentable</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Product')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
