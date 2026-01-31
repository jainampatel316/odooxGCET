import { X, Calendar, User, Phone, Mail, Building2, Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/helpers';

const OrderDetailModal = ({ order, onClose, onPickup, onReturn }) => {
    if (!order) return null;

    // Check if return is late
    const isLateReturn = () => {
        if (order.returnStatus === 'pending' && order.rentalEnd) {
            const endDate = new Date(order.rentalEnd);
            const today = new Date();
            return today > endDate;
        }
        return false;
    };

    const daysLate = () => {
        if (!isLateReturn()) return 0;
        const endDate = new Date(order.rentalEnd);
        const today = new Date();
        const diffTime = Math.abs(today - endDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Order Details</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {order.orderNumber} • {formatDate(order.createdAt)}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status and Payment */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="text-sm text-muted-foreground mb-1">Order Status</div>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                                {order.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="text-sm text-muted-foreground mb-1">Payment Status</div>
                            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                    order.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {order.paymentStatus.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Late Return Warning */}
                    {isLateReturn() && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                                <div className="font-semibold text-red-900">Late Return</div>
                                <div className="text-sm text-red-700">
                                    Equipment is {daysLate()} day{daysLate() > 1 ? 's' : ''} overdue.
                                    Late fees may apply.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Information */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Customer Information
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{order.customerName}</span>
                            </div>
                            {order.customerCompany && (
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{order.customerCompany}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{order.customerEmail}</span>
                            </div>
                            {order.customerPhone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{order.customerPhone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rental Period */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Rental Period
                        </h3>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-muted-foreground">Start Date</div>
                                    <div className="font-medium">{formatDate(order.rentalStart)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">End Date</div>
                                    <div className="font-medium">{formatDate(order.rentalEnd)}</div>
                                </div>
                            </div>
                            {order.pickupDate && (
                                <div className="mt-3 pt-3 border-t">
                                    <div className="text-sm text-muted-foreground">Pickup Completed</div>
                                    <div className="text-sm">{new Date(order.pickupDate).toLocaleString()}</div>
                                </div>
                            )}
                            {order.returnDate && (
                                <div className="mt-2">
                                    <div className="text-sm text-muted-foreground">Return Completed</div>
                                    <div className="text-sm">{new Date(order.returnDate).toLocaleString()}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Order Items */}
                    <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Order Items
                        </h3>
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3 text-sm font-medium">Product</th>
                                        <th className="text-center p-3 text-sm font-medium">Qty</th>
                                        <th className="text-right p-3 text-sm font-medium">Rate/Day</th>
                                        <th className="text-center p-3 text-sm font-medium">Days</th>
                                        <th className="text-right p-3 text-sm font-medium">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, index) => (
                                        <tr key={index} className="border-t border-muted">
                                            <td className="p-3">
                                                <div className="font-medium">{item.productName}</div>
                                            </td>
                                            <td className="p-3 text-center">{item.quantity}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.pricePerDay)}</td>
                                            <td className="p-3 text-center">{item.days}</td>
                                            <td className="p-3 text-right font-medium">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="bg-muted/30 rounded-lg p-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax (18% GST)</span>
                                <span>{formatCurrency(order.tax)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Security Deposit</span>
                                <span>{formatCurrency(order.securityDeposit)}</span>
                            </div>
                            {order.lateReturnFees > 0 && (
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Late Return Fees</span>
                                    <span>{formatCurrency(order.lateReturnFees)}</span>
                                </div>
                            )}
                            {order.damageCharges > 0 && (
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Damage Charges</span>
                                    <span>{formatCurrency(order.damageCharges)}</span>
                                </div>
                            )}
                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{formatCurrency(order.total + order.securityDeposit + (order.lateReturnFees || 0) + (order.damageCharges || 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pickup & Return Actions */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Pickup Status</span>
                                {order.pickupStatus === 'completed' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>
                                )}
                            </div>
                            {order.pickupStatus === 'pending' && (
                                <Button
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => onPickup(order.id)}
                                >
                                    Mark Pickup Complete
                                </Button>
                            )}
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Return Status</span>
                                {order.returnStatus === 'completed' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <span className={`px-2 py-1 rounded text-xs ${isLateReturn() ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {isLateReturn() ? 'Overdue' : 'Pending'}
                                    </span>
                                )}
                            </div>
                            {order.pickupStatus === 'completed' && order.returnStatus === 'pending' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() => onReturn(order.id)}
                                >
                                    Mark Return Complete
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
