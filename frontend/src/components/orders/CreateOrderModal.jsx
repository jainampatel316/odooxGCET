import { useState } from 'react';
import { X, Calendar, User, Package, DollarSign, Clock, CalendarClock, CalendarDays, CalendarRange } from 'lucide-react';
import { sampleProducts, generateId } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

const CreateOrderModal = ({ isOpen, onClose, onCreateOrder }) => {
    const [formData, setFormData] = useState({
        customerName: '',
        productId: '',
        rentalPeriod: 'daily', // hourly, daily, weekly
        rentalStartDate: '',
        rentalStartTime: '09:00',
        rentalEndDate: '',
        rentalEndTime: '17:00',
        duration: 1, // number of hours/days/weeks
        quantity: 1,
        notes: '',
    });

    const [errors, setErrors] = useState({});

    if (!isOpen) return null;

    const selectedProduct = sampleProducts.find(p => p.id === formData.productId);

    const rentalPeriods = [
        { value: 'hourly', label: 'Hourly', Icon: CalendarClock },
        { value: 'daily', label: 'Daily', Icon: CalendarDays },
        { value: 'weekly', label: 'Weekly', Icon: CalendarRange },
    ];

    const getPriceForPeriod = (product) => {
        if (!product) return 0;
        switch (formData.rentalPeriod) {
            case 'hourly':
                return product.pricePerHour || product.pricePerDay / 8;
            case 'daily':
                return product.pricePerDay;
            case 'weekly':
                return product.pricePerWeek || product.pricePerDay * 7;
            default:
                return product.pricePerDay;
        }
    };

    const calculateDuration = () => {
        if (formData.rentalPeriod === 'hourly') {
            if (!formData.rentalStartDate || !formData.rentalStartTime || !formData.rentalEndDate || !formData.rentalEndTime) {
                return 0;
            }
            const start = new Date(`${formData.rentalStartDate}T${formData.rentalStartTime}`);
            const end = new Date(`${formData.rentalEndDate}T${formData.rentalEndTime}`);
            const hours = (end - start) / (1000 * 60 * 60);
            return Math.max(0, Math.ceil(hours));
        } else if (formData.rentalPeriod === 'daily') {
            if (!formData.rentalStartDate || !formData.rentalEndDate) {
                return 0;
            }
            const start = new Date(formData.rentalStartDate);
            const end = new Date(formData.rentalEndDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            return Math.max(0, days);
        } else if (formData.rentalPeriod === 'weekly') {
            if (!formData.rentalStartDate || !formData.rentalEndDate) {
                return 0;
            }
            const start = new Date(formData.rentalStartDate);
            const end = new Date(formData.rentalEndDate);
            const weeks = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 7));
            return Math.max(0, weeks);
        }
        return 0;
    };

    const calculateTotal = () => {
        if (!selectedProduct) return 0;
        const duration = calculateDuration();
        const pricePerUnit = getPriceForPeriod(selectedProduct);
        return duration * pricePerUnit * formData.quantity;
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.customerName.trim()) {
            newErrors.customerName = 'Customer name is required';
        }

        if (!formData.productId) {
            newErrors.productId = 'Please select a product';
        }

        if (!formData.rentalStartDate) {
            newErrors.rentalStartDate = 'Start date is required';
        } else {
            // Check if start date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(formData.rentalStartDate);
            startDate.setHours(0, 0, 0, 0);

            if (startDate < today) {
                newErrors.rentalStartDate = 'Start date cannot be in the past';
            }
        }

        if (formData.rentalPeriod === 'hourly' && !formData.rentalStartTime) {
            newErrors.rentalStartTime = 'Start time is required';
        }

        if (!formData.rentalEndDate) {
            newErrors.rentalEndDate = 'End date is required';
        }

        if (formData.rentalPeriod === 'hourly' && !formData.rentalEndTime) {
            newErrors.rentalEndTime = 'End time is required';
        }

        // Validate date/time ranges based on rental period
        if (formData.rentalPeriod === 'hourly') {
            if (formData.rentalStartDate && formData.rentalStartTime && formData.rentalEndDate && formData.rentalEndTime) {
                const start = new Date(`${formData.rentalStartDate}T${formData.rentalStartTime}`);
                const end = new Date(`${formData.rentalEndDate}T${formData.rentalEndTime}`);
                const now = new Date();

                // Check if start time is in the past
                if (start < now) {
                    newErrors.rentalStartTime = 'Start time cannot be in the past';
                }

                if (end <= start) {
                    newErrors.rentalEndTime = 'End time must be after start time';
                } else {
                    // Check minimum duration (at least 1 hour)
                    const hours = (end - start) / (1000 * 60 * 60);
                    if (hours < 1) {
                        newErrors.rentalEndTime = 'Minimum rental duration is 1 hour';
                    }
                }
            }
        } else {
            if (formData.rentalStartDate && formData.rentalEndDate) {
                const start = new Date(formData.rentalStartDate);
                const end = new Date(formData.rentalEndDate);

                if (end <= start) {
                    newErrors.rentalEndDate = 'End date must be after start date';
                } else {
                    // Check exact duration based on rental period
                    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));

                    if (formData.rentalPeriod === 'daily' && days !== 1) {
                        newErrors.rentalEndDate = 'Daily rental must be exactly 1 day';
                    } else if (formData.rentalPeriod === 'weekly' && days !== 7) {
                        newErrors.rentalEndDate = 'Weekly rental must be exactly 7 days (1 week)';
                    }
                }
            }
        }

        if (formData.quantity < 1) {
            newErrors.quantity = 'Quantity must be at least 1';
        }

        if (selectedProduct && formData.quantity > selectedProduct.availableQuantity) {
            newErrors.quantity = `Only ${selectedProduct.availableQuantity} available`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const total = calculateTotal();
        const duration = calculateDuration();

        const newOrder = {
            id: generateId(),
            orderReference: `SO${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            orderDate: new Date().toISOString().split('T')[0],
            customerId: generateId(),
            customerName: formData.customerName,
            product: selectedProduct.name,
            productId: formData.productId,
            rentalDuration: 'quotation',
            rentalDurationColor: 'purple',
            rentalPeriodType: formData.rentalPeriod,
            rentalPeriodDuration: duration,
            total: total,
            status: 'quotation',
            quotationDate: new Date().toISOString(),
            confirmedDate: null,
            invoicedDate: null,
            returnedDate: null,
            cancelledDate: null,
            createdAt: new Date().toISOString(),
            rentalStartDate: formData.rentalStartDate,
            rentalStartTime: formData.rentalPeriod === 'hourly' ? formData.rentalStartTime : null,
            rentalEndDate: formData.rentalEndDate,
            rentalEndTime: formData.rentalPeriod === 'hourly' ? formData.rentalEndTime : null,
            quantity: formData.quantity,
            notes: formData.notes,
        };

        onCreateOrder(newOrder);

        // Reset form
        setFormData({
            customerName: '',
            productId: '',
            rentalPeriod: 'daily',
            rentalStartDate: '',
            rentalStartTime: '09:00',
            rentalEndDate: '',
            rentalEndTime: '17:00',
            duration: 1,
            quantity: 1,
            notes: '',
        });
        setErrors({});
        onClose();
    };

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Auto-calculate end date based on rental period when start date or period changes
            if (field === 'rentalStartDate' || field === 'rentalPeriod') {
                const startDate = field === 'rentalStartDate' ? value : prev.rentalStartDate;
                const period = field === 'rentalPeriod' ? value : prev.rentalPeriod;

                if (startDate && period) {
                    const start = new Date(startDate);
                    let endDate;

                    if (period === 'daily') {
                        // Daily: End date is exactly 1 day after start
                        endDate = new Date(start);
                        endDate.setDate(endDate.getDate() + 1);
                        updated.rentalEndDate = endDate.toISOString().split('T')[0];
                    } else if (period === 'weekly') {
                        // Weekly: End date is exactly 7 days after start
                        endDate = new Date(start);
                        endDate.setDate(endDate.getDate() + 7);
                        updated.rentalEndDate = endDate.toISOString().split('T')[0];
                    }
                    // For hourly, keep manual end date selection
                }
            }

            return updated;
        });

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const getDurationLabel = () => {
        const duration = calculateDuration();
        if (duration === 0) return '';

        switch (formData.rentalPeriod) {
            case 'hourly':
                return `${duration} hour${duration !== 1 ? 's' : ''}`;
            case 'daily':
                return `${duration} day${duration !== 1 ? 's' : ''}`;
            case 'weekly':
                return `${duration} week${duration !== 1 ? 's' : ''}`;
            default:
                return '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Create New Order</h2>
                        <p className="text-purple-100 text-sm mt-1">Fill in the details to create a new rental order</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Customer Information */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <User className="w-4 h-4 text-purple-600" />
                            Customer Name
                        </label>
                        <input
                            type="text"
                            value={formData.customerName}
                            onChange={(e) => handleChange('customerName', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.customerName ? 'border-red-500' : 'border-gray-300'
                                }`}
                            placeholder="Enter customer name"
                        />
                        {errors.customerName && (
                            <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
                        )}
                    </div>

                    {/* Product Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Package className="w-4 h-4 text-purple-600" />
                            Select Product
                        </label>
                        <select
                            value={formData.productId}
                            onChange={(e) => handleChange('productId', e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.productId ? 'border-red-500' : 'border-gray-300'
                                }`}
                        >
                            <option value="">Choose a product...</option>
                            {sampleProducts.filter(p => p.isPublished && p.availableQuantity > 0).map(product => (
                                <option key={product.id} value={product.id}>
                                    {product.name} (Available: {product.availableQuantity})
                                </option>
                            ))}
                        </select>
                        {errors.productId && (
                            <p className="text-red-500 text-xs mt-1">{errors.productId}</p>
                        )}
                    </div>

                    {/* Product Preview */}
                    {selectedProduct && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-4">
                            <img
                                src={selectedProduct.images?.[0] || '/placeholder.svg'}
                                alt={selectedProduct.name}
                                className="w-24 h-24 rounded-lg object-cover bg-white"
                            />
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedProduct.description}</p>
                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                    <span className="text-xs text-gray-500">
                                        Hourly: <span className="font-semibold text-purple-600">{formatCurrency(selectedProduct.pricePerHour || selectedProduct.pricePerDay / 8)}</span>
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Daily: <span className="font-semibold text-purple-600">{formatCurrency(selectedProduct.pricePerDay)}</span>
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        Weekly: <span className="font-semibold text-purple-600">{formatCurrency(selectedProduct.pricePerWeek || selectedProduct.pricePerDay * 7)}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rental Period Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                            <Clock className="w-4 h-4 text-purple-600" />
                            Rental Period
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {rentalPeriods.map((period) => {
                                const IconComponent = period.Icon;
                                return (
                                    <button
                                        key={period.value}
                                        type="button"
                                        onClick={() => handleChange('rentalPeriod', period.value)}
                                        className={`p-3 rounded-lg border-2 transition-all ${formData.rentalPeriod === period.value
                                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 hover:border-purple-300 text-gray-600'
                                            }`}
                                    >
                                        <IconComponent className="w-6 h-6 mx-auto mb-1" />
                                        <div className="text-sm font-medium">{period.label}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rental Duration - Hourly */}
                    {formData.rentalPeriod === 'hourly' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    Start Date & Time
                                </label>
                                <input
                                    type="date"
                                    value={formData.rentalStartDate}
                                    onChange={(e) => handleChange('rentalStartDate', e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    max={formData.rentalEndDate || undefined}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 ${errors.rentalStartDate ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                <input
                                    type="time"
                                    value={formData.rentalStartTime}
                                    onChange={(e) => handleChange('rentalStartTime', e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.rentalStartTime ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {(errors.rentalStartDate || errors.rentalStartTime) && (
                                    <p className="text-red-500 text-xs mt-1">{errors.rentalStartDate || errors.rentalStartTime}</p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    End Date & Time
                                </label>
                                <input
                                    type="date"
                                    value={formData.rentalEndDate}
                                    onChange={(e) => handleChange('rentalEndDate', e.target.value)}
                                    min={formData.rentalStartDate || new Date().toISOString().split('T')[0]}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 ${errors.rentalEndDate ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                <input
                                    type="time"
                                    value={formData.rentalEndTime}
                                    onChange={(e) => handleChange('rentalEndTime', e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.rentalEndTime ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {(errors.rentalEndDate || errors.rentalEndTime) && (
                                    <p className="text-red-500 text-xs mt-1">{errors.rentalEndDate || errors.rentalEndTime}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Rental Duration - Daily or Weekly */}
                    {(formData.rentalPeriod === 'daily' || formData.rentalPeriod === 'weekly') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.rentalStartDate}
                                    onChange={(e) => handleChange('rentalStartDate', e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    max={formData.rentalEndDate || undefined}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.rentalStartDate ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                />
                                {errors.rentalStartDate && (
                                    <p className="text-red-500 text-xs mt-1">{errors.rentalStartDate}</p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 text-purple-600" />
                                    End Date {(formData.rentalPeriod === 'daily' || formData.rentalPeriod === 'weekly') && <span className="text-xs text-gray-500">(Auto-calculated)</span>}
                                </label>
                                <input
                                    type="date"
                                    value={formData.rentalEndDate}
                                    onChange={(e) => handleChange('rentalEndDate', e.target.value)}
                                    min={formData.rentalStartDate || new Date().toISOString().split('T')[0]}
                                    readOnly={formData.rentalPeriod === 'daily' || formData.rentalPeriod === 'weekly'}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${(formData.rentalPeriod === 'daily' || formData.rentalPeriod === 'weekly') ? 'bg-gray-100 cursor-not-allowed' : ''
                                        } ${errors.rentalEndDate ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.rentalEndDate && (
                                    <p className="text-red-500 text-xs mt-1">{errors.rentalEndDate}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Package className="w-4 h-4 text-purple-600" />
                            Quantity
                        </label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                            min="1"
                            max={selectedProduct?.availableQuantity || 999}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.quantity ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.quantity && (
                            <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="Add any special requirements or notes..."
                        />
                    </div>

                    {/* Total Preview */}
                    {selectedProduct && calculateDuration() > 0 && (
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm font-medium text-gray-700">Estimated Total</span>
                                </div>
                                <span className="text-2xl font-bold text-purple-600">
                                    {formatCurrency(calculateTotal())}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {getDurationLabel()} × {formData.quantity} item(s) × {formatCurrency(getPriceForPeriod(selectedProduct))}/{formData.rentalPeriod === 'hourly' ? 'hr' : formData.rentalPeriod === 'daily' ? 'day' : 'week'}
                            </p>
                        </div>
                    )}
                </form>

                {/* Footer Actions */}
                <div className="border-t bg-gray-50 p-6 flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-500/30"
                    >
                        Create Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateOrderModal;
