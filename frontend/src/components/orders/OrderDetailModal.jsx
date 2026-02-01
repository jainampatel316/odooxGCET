import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrency } from '../../utils/helpers';
import { statusColors, statusDisplayNames, orderStatuses } from '../../data/mockData';

const OrderDetailModal = ({ order, onClose, onStatusChange }) => {
    if (!order) return null;

    const statusColor = statusColors[order.status];

    // Determine allowed next actions based on current status
    const getNextActions = () => {
        switch (order.status) {
            case orderStatuses.QUOTATION:
                return [
                    { label: 'Confirm as Sale Order', nextStatus: orderStatuses.SALE_ORDER },
                    { label: 'Cancel', nextStatus: orderStatuses.CANCELLED, variant: 'destructive' },
                ];
            case orderStatuses.SALE_ORDER:
                return [
                    { label: 'Confirm Order', nextStatus: orderStatuses.CONFIRMED },
                    { label: 'Cancel', nextStatus: orderStatuses.CANCELLED, variant: 'destructive' },
                ];
            case orderStatuses.CONFIRMED:
                return [
                    { label: 'Generate Invoice', nextStatus: orderStatuses.INVOICED },
                    { label: 'Cancel', nextStatus: orderStatuses.CANCELLED, variant: 'destructive' },
                ];
            case orderStatuses.INVOICED:
                return [
                    { label: 'Mark as Completed', nextStatus: 'completed' },
                ];
            case orderStatuses.CANCELLED:
                return [];
            default:
                return [];
        }
    };

    const nextActions = getNextActions();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Order Details</h2>
                        <p className="text-sm text-gray-500 mt-1">{order.orderReference}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status */}
                    <div>
                        <div className="text-sm text-gray-500 mb-2">Current Status</div>
                        <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${statusColor.bg} ${statusColor.text}`}>
                            {statusDisplayNames[order.status]}
                        </span>
                    </div>

                    {/* Customer Information */}
                    <div>
                        <h3 className="font-semibold mb-3">Customer Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Name:</span>
                                <span className="text-sm font-medium">{order.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Customer ID:</span>
                                <span className="text-sm font-medium">{order.customerId}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Information */}
                    <div>
                        <h3 className="font-semibold mb-3">Order Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Product:</span>
                                <span className="text-sm font-medium">{order.product}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Order Date:</span>
                                <span className="text-sm font-medium">
                                    {new Date(order.orderDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Amount:</span>
                                <span className="text-lg font-bold">{formatCurrency(order.total)}</span>
                            </div>
                            {order.lateReturnFees > 0 && (
                                <div className="flex justify-between border-t pt-2 mt-2">
                                    <span className="text-sm font-medium text-red-600">Late Return Fees:</span>
                                    <span className="text-lg font-bold text-red-600">{formatCurrency(order.lateReturnFees)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lifecycle Timeline */}
                    <div>
                        <h3 className="font-semibold mb-3">Order Timeline</h3>
                        <div className="space-y-3">
                            {order.quotationDate && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Quotation Created</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.quotationDate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {order.confirmedDate && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Order Confirmed</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.confirmedDate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {order.invoicedDate && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Invoice Generated</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.invoicedDate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {order.cancelledDate && (
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Order Cancelled</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.cancelledDate).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {nextActions.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3">Available Actions</h3>
                            <div className="flex gap-3">
                                {nextActions.map((action, index) => (
                                    <Button
                                        key={index}
                                        variant={action.variant || 'default'}
                                        onClick={() => {
                                            onStatusChange(order.id, action.nextStatus);
                                            onClose();
                                        }}
                                    >
                                        {action.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-6 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
