import { useState } from 'react';
import { X, Calendar, FileText, AlertCircle, DollarSign } from 'lucide-react';
import { Button } from '../ui/button';
import { vendorOrderAPI } from '../../utils/api';
import { toast } from '@/hooks/use-toast';

const CONDITION_OPTIONS = [
    { value: 'EXCELLENT', label: 'Excellent', color: 'text-green-600', description: 'Perfect condition, no issues' },
    { value: 'GOOD', label: 'Good', color: 'text-blue-600', description: 'Minor wear, fully functional' },
    { value: 'FAIR', label: 'Fair', color: 'text-yellow-600', description: 'Noticeable wear, still functional' },
    { value: 'DAMAGED', label: 'Damaged', color: 'text-orange-600', description: 'Requires repair or replacement' },
    { value: 'LOST', label: 'Lost', color: 'text-red-600', description: 'Item not returned' },
];

const ReturnModal = ({ order, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        condition: 'GOOD',
        conditionNotes: '',
        damageAmount: 0,
        lateFee: 0,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        setIsSubmitting(true);

        try {
            await vendorOrderAPI.processReturn(order.id, {
                condition: formData.condition,
                conditionNotes: formData.conditionNotes,
                damageAmount: parseFloat(formData.damageAmount) || 0,
                lateFee: parseFloat(formData.lateFee) || 0,
            });

            toast({
                title: 'Return Processed',
                description: `Return completed successfully for order ${order.orderReference}`,
            });

            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error) {
            console.error('Error processing return:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to process return',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const selectedCondition = CONDITION_OPTIONS.find(opt => opt.value === formData.condition);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Process Return</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Order: {order.orderReference} - {order.customerName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Product:</span>
                                <span className="ml-2 font-medium">{order.product}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Customer:</span>
                                <span className="ml-2 font-medium">{order.customerName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Total:</span>
                                <span className="ml-2 font-medium">${order.total.toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                <span className="ml-2 font-medium capitalize">{order.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Condition Assessment */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                            <AlertCircle className="h-4 w-4" />
                            Item Condition *
                        </label>
                        <div className="space-y-2">
                            {CONDITION_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${formData.condition === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="condition"
                                        value={option.value}
                                        checked={formData.condition === option.value}
                                        onChange={(e) => handleChange('condition', e.target.value)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className={`font-medium ${option.color}`}>{option.label}</div>
                                        <div className="text-xs text-muted-foreground">{option.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Condition Notes */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <FileText className="h-4 w-4" />
                            Condition Notes
                        </label>
                        <textarea
                            value={formData.conditionNotes}
                            onChange={(e) => handleChange('conditionNotes', e.target.value)}
                            placeholder="Describe any damage, wear, or issues found during inspection..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Document any issues, missing parts, or observations
                        </p>
                    </div>

                    {/* Financial Adjustments */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Damage Amount */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <DollarSign className="h-4 w-4" />
                                Damage Charges
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.damageAmount}
                                    onChange={(e) => handleChange('damageAmount', e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Charges for damage or missing items
                            </p>
                        </div>

                        {/* Late Fee */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="h-4 w-4" />
                                Late Return Fee
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.lateFee}
                                    onChange={(e) => handleChange('lateFee', e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Additional charges for late return
                            </p>
                        </div>
                    </div>

                    {/* Total Additional Charges */}
                    {(parseFloat(formData.damageAmount) > 0 || parseFloat(formData.lateFee) > 0) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">Total Additional Charges:</span>
                                <span className="text-lg font-bold text-yellow-700">
                                    ${(parseFloat(formData.damageAmount) + parseFloat(formData.lateFee)).toFixed(2)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                This amount will be added to the final invoice
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Processing...' : 'Complete Return'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReturnModal;
