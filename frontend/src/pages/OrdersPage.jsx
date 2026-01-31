import { useState, useEffect } from 'react';
import { Search, LayoutGrid, List, Download, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import OrdersKanbanView from '../components/orders/OrdersKanbanView';
import OrdersListView from '../components/orders/OrdersListView';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import { sampleRentalOrders, statusDisplayNames, statusColors } from '../data/mockData';
import { toast } from '@/hooks/use-toast';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        // Load orders from mock data
        setOrders(sampleRentalOrders);
    }, []);

    // Filter orders based on search and status filter
    const filteredOrders = orders.filter(order => {
        const matchesSearch = !searchQuery ||
            order.orderReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.product.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = filterStatus === 'all' || order.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    const handleStatusChange = (orderId, newStatus) => {
        const updatedOrders = orders.map(order => {
            if (order.id === orderId) {
                const now = new Date().toISOString();
                const updates = { status: newStatus };

                // Update lifecycle dates based on new status
                if (newStatus === 'sale_order' && !order.confirmedDate) {
                    updates.confirmedDate = now;
                } else if (newStatus === 'confirmed') {
                    updates.confirmedDate = now;
                } else if (newStatus === 'invoiced') {
                    updates.invoicedDate = now;
                } else if (newStatus === 'cancelled') {
                    updates.cancelledDate = now;
                }

                // Update rental duration display
                const statusToDuration = {
                    'quotation': 'quotation',
                    'sale_order': 'sold-order',
                    'confirmed': 'confirmed',
                    'invoiced': 'invoiced',
                    'cancelled': 'cancelled',
                };
                updates.rentalDuration = statusToDuration[newStatus] || newStatus;

                return { ...order, ...updates };
            }
            return order;
        });

        setOrders(updatedOrders);
        toast({
            title: "Order Updated",
            description: `Order ${orderId} status changed to ${statusDisplayNames[newStatus] || newStatus}`,
        });
    };

    const handleExport = () => {
        toast({
            title: "Export Orders",
            description: "CSV export functionality - UI demo only",
        });
    };

    const handleNewOrder = () => {
        toast({
            title: "New Order",
            description: "New order form - UI demo only",
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo and Navigation */}
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                    R
                                </div>
                                <span className="font-semibold text-gray-900">Your Logo</span>
                            </div>

                            <nav className="hidden md:flex items-center gap-6">
                                <a href="#" className="text-sm font-medium text-primary border-b-2 border-primary pb-1">
                                    orders
                                </a>
                                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                    Products
                                </a>
                                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                    Reports
                                </a>
                                <a href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                    Settings
                                </a>
                            </nav>
                        </div>

                        {/* Search and User */}
                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                                />
                            </div>

                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">U</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button onClick={handleNewOrder} className="gap-2">
                            <Plus className="h-4 w-4" />
                            New
                        </Button>

                        <Button variant="outline" onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export Records
                        </Button>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="quotation">Quotation</option>
                            <option value="sale_order">Sale Order</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="invoiced">Invoiced</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                            title="Kanban View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                            title="List View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="p-6">
                {viewMode === 'kanban' ? (
                    <OrdersKanbanView
                        orders={filteredOrders}
                        onOrderClick={setSelectedOrder}
                    />
                ) : (
                    <OrdersListView
                        orders={filteredOrders}
                        onOrderClick={setSelectedOrder}
                    />
                )}
            </main>

            {/* Status Legend (for List View) */}
            {viewMode === 'list' && (
                <div className="fixed bottom-6 left-6 bg-white rounded-lg border border-gray-200 p-4 shadow-lg">
                    <div className="text-sm font-semibold mb-3">Rental Status</div>
                    <div className="space-y-2">
                        {Object.entries(statusColors).map(([key, colors]) => (
                            <div key={key} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded ${colors.bg}`}></div>
                                <span className="text-xs">{statusDisplayNames[key]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
};

export default OrdersPage;
