import { useState } from 'react';
import { X, Calendar, MapPin, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { vendorOrderAPI } from '../../utils/api';
import { toast } from '@/hooks/use-toast';

const PickupModal = ({ order, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        actualPickupDate: new Date().toISOString().slice(0, 16), // datetime-local format
        pickupLocation: '',
        verificationNotes: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.pickupLocation.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please enter pickup location',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await vendorOrderAPI.processPickup(order.id, {
                actualPickupDate: formData.actualPickupDate,
                pickupLocation: formData.pickupLocation,
                verificationNotes: formData.verificationNotes,
            });

            toast({
                title: 'Pickup Confirmed',
                description: `Pickup processed successfully for order ${order.orderReference}`,
            });

            if (onSuccess) {
                onSuccess();
            }

            onClose();
        } catch (error) {
            console.error('Error processing pickup:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to process pickup',
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Process Pickup</h2>
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

                    {/* Pickup Date */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="h-4 w-4" />
                            Actual Pickup Date & Time
                        </label>
                        <input
                            type="datetime-local"
                            value={formData.actualPickupDate}
                            onChange={(e) => handleChange('actualPickupDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required
                        />
                    </div>

                    {/* Pickup Location */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <MapPin className="h-4 w-4" />
                            Pickup Location *
                        </label>
                        <input
                            type="text"
                            value={formData.pickupLocation}
                            onChange={(e) => handleChange('pickupLocation', e.target.value)}
                            placeholder="Enter pickup location (e.g., Warehouse A, Customer Site)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            required
                        />
                    </div>

                    {/* Verification Notes */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <FileText className="h-4 w-4" />
                            Verification Notes
                        </label>
                        <textarea
                            value={formData.verificationNotes}
                            onChange={(e) => handleChange('verificationNotes', e.target.value)}
                            placeholder="Add any verification notes, condition checks, or special instructions..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Optional: Document item condition, serial numbers, or any observations
                        </p>
                    </div>

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
                            {isSubmitting ? 'Processing...' : 'Confirm Pickup'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PickupModal;
