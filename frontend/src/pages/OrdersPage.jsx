import { useState, useEffect } from 'react';
import { Search, LayoutGrid, List, Download, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import OrdersKanbanView from '../components/orders/OrdersKanbanView';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import { statusDisplayNames, statusColors } from '../data/mockData';
import { toast } from '@/hooks/use-toast';
import { vendorOrderAPI } from '../utils/api';
import { transformBackendOrders } from '../utils/orderTransform';
import { useApp } from '../context/AppContext';

const OrdersPage = () => {
    const { user } = useApp();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Fetch orders from backend
    useEffect(() => {
        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const response = await vendorOrderAPI.getVendorOrders();

                if (response && Array.isArray(response)) {
                    // Backend returns array directly
                    const transformedOrders = transformBackendOrders(response);
                    setOrders(transformedOrders);
                } else if (response && response.data) {
                    // Or response might have data property
                    const transformedOrders = transformBackendOrders(response.data);
                    setOrders(transformedOrders);
                } else {
                    setOrders([]);
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
                toast({
                    title: 'Error',
                    description: error.message || 'Failed to load orders',
                    variant: 'destructive',
                });
                setOrders([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            fetchOrders();
        }
    }, [user]);

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
        // Note: Direct status updates are not supported by backend
        // Status changes happen through pickup/return workflows
        toast({
            title: "Status Update",
            description: "Status updates must be done through pickup/return workflows",
            variant: "destructive",
        });
    };

    // Handle Kanban drag-and-drop with backend persistence
    const handleOrderDrop = async (orderId, newStatus) => {
        // Note: Backend doesn't support direct status updates
        // This is a limitation - status changes must happen through pickup/return workflows
        // For now, we'll show a message and prevent the drop

        toast({
            title: "Status Update Not Available",
            description: "Please use the Pickup or Return buttons to change order status",
            variant: "destructive",
        });

        // In a real implementation with backend support, this would be:
        /*
        // Store original orders for rollback
        const originalOrders = [...orders];
        
        // Optimistic update - update UI immediately
        const updatedOrders = orders.map(order => {
            if (order.id === orderId) {
                return { ...order, status: newStatus };
            }
            return order;
        });
        setOrders(updatedOrders);
        
        try {
            // Call backend API
            await vendorOrderAPI.updateOrderStatus(orderId, newStatus);
            
            // Refresh orders from backend to get latest state
            const response = await vendorOrderAPI.getVendorOrders();
            const transformedOrders = transformBackendOrders(
                Array.isArray(response) ? response : response.data
            );
            setOrders(transformedOrders);
            
            toast({
                title: "Order Updated",
                description: `Order status changed successfully`,
            });
        } catch (error) {
            // Rollback on error
            setOrders(originalOrders);
            
            console.error('Error updating order status:', error);
            toast({
                title: "Update Failed",
                description: error.message || "Failed to update order status",
                variant: "destructive",
            });
        }
        */
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

                </div>
            </div>

            {/* Main Content */}
            <main className="p-6 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading orders...</p>
                        </div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <p className="text-lg font-medium text-gray-900 mb-2">No orders found</p>
                            <p className="text-muted-foreground">
                                {searchQuery || filterStatus !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Orders will appear here once created'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <OrdersKanbanView
                        orders={filteredOrders}
                        onOrderClick={setSelectedOrder}
                        onOrderDrop={handleOrderDrop}
                    />
                )}
            </main>



            {/* Order Detail Modal */}
            {
                selectedOrder && (
                    <OrderDetailModal
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        onStatusChange={handleStatusChange}
                    />
                )
            }
        </div >
    );
};

export default OrdersPage;
