import { useState } from 'react';
import { statusColors } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

const OrdersListView = ({ orders, onOrderClick }) => {
    const [selectedOrders, setSelectedOrders] = useState([]);

    const toggleSelectAll = () => {
        if (selectedOrders.length === orders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(orders.map(o => o.id));
        }
    };

    const toggleSelectOrder = (orderId) => {
        if (selectedOrders.includes(orderId)) {
            setSelectedOrders(selectedOrders.filter(id => id !== orderId));
        } else {
            setSelectedOrders([...selectedOrders, orderId]);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="w-12 p-4">
                                <input
                                    type="checkbox"
                                    checked={selectedOrders.length === orders.length && orders.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                            </th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Order Reference</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Order Date</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Customer Name</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Product</th>
                            <th className="text-right p-4 text-sm font-medium text-gray-700">Total</th>
                            <th className="text-left p-4 text-sm font-medium text-gray-700">Rental Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => {
                            const statusColor = statusColors[order.status];
                            return (
                                <tr
                                    key={order.id}
                                    onClick={() => onOrderClick(order)}
                                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.includes(order.id)}
                                            onChange={() => toggleSelectOrder(order.id)}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                    </td>
                                    <td className="p-4 text-sm">{order.orderReference}</td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className="p-4 text-sm">{order.customerName}</td>
                                    <td className="p-4 text-sm">{order.product}</td>
                                    <td className="p-4 text-sm text-right font-medium">{formatCurrency(order.total)}</td>
                                    <td className="p-4">
                                        <span
                                            className={`inline-block px-3 py-1 rounded text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                                        >
                                            {order.rentalDuration}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {orders.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No orders found
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersListView;
