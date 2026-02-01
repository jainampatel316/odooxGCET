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
import { Plus, Trash2 } from 'lucide-react';
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
  attributes: [{ category: '', value: '' }],
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
        attributes: editingProduct.attributes?.map(attr => ({
          category: attr.category?.name || '',
          value: attr.value?.value || ''
        })) || [{ category: '', value: '' }],
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

  const handleAttributeChange = (index, field, value) => {
    setForm(prev => {
      const newAttrs = [...prev.attributes];
      newAttrs[index] = { ...newAttrs[index], [field]: value };
      return { ...prev, attributes: newAttrs };
    });
  };

  const addAttribute = () => {
    setForm(prev => ({
      ...prev,
      attributes: [...prev.attributes, { category: '', value: '' }]
    }));
  };

  const removeAttribute = (index) => {
    setForm(prev => ({
      ...prev,
      attributes: prev.attributes.length > 1
        ? prev.attributes.filter((_, i) => i !== index)
        : [{ category: '', value: '' }]
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
        attributes: form.attributes.filter(attr => attr.category.trim() && attr.value.trim()),
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

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">Custom Attributes</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttribute}
                className="h-8 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Attribute
              </Button>
            </div>

            <div className="space-y-2">
              {form.attributes.map((attr, index) => (
                <div key={index} className="flex gap-2 group animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex-1">
                    <input
                      placeholder="Name (e.g. Color)"
                      value={attr.category}
                      onChange={(e) => handleAttributeChange(index, 'category', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50/50"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      placeholder="Value (e.g. Red)"
                      value={attr.value}
                      onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50/50"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttribute(index)}
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove attribute"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {form.attributes.length === 0 && (
                <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-xs text-gray-500">No custom attributes added yet.</p>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              Tip: Add attributes like Material, Dimensions, Color, or Technical Specs.
            </p>
          </div>

          <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t mt-4">

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
