import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, DollarSign, FileText, LogOut, Menu, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { vendorProductAPI, vendorOrderAPI, vendorInvoiceAPI } from '../utils/api';
import { transformBackendOrders } from '../utils/orderTransform';
import AddProductModal from '../components/vendor/AddProductModal';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/helpers';
import { vendorAnalytics } from '../data/mockData';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import OrderDetailModal from '../components/vendor/OrderDetailModal';
import InvoiceViewModal from '../components/vendor/InvoiceViewModal';

// New Orders Components
import OrdersKanbanView from '../components/orders/OrdersKanbanView';
import OrdersListView from '../components/orders/OrdersListView';
import NewOrderDetailModal from '../components/orders/OrderDetailModal';
import CreateOrderModal from '../components/orders/CreateOrderModal';
import { sampleRentalOrders, statusDisplayNames as newStatusNames, statusColors as newStatusColors } from '../data/mockData';
import { LayoutGrid, List } from 'lucide-react';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [invoiceFilter, setInvoiceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Orders State
  const [viewMode, setViewMode] = useState('kanban');
  const [newOrderData, setNewOrderData] = useState([]);
  const [newSelectedOrder, setNewSelectedOrder] = useState(null);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== 'vendor') {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    if (!user) return;
    setProductsLoading(true);
    try {
      const [productsRes, ordersRes, invoicesRes] = await Promise.all([
        vendorProductAPI.getVendorProducts(),
        vendorOrderAPI.getVendorOrders(),
        vendorInvoiceAPI.getVendorInvoices(),
      ]);
      const items = Array.isArray(productsRes) ? productsRes : productsRes?.data ?? [];
      setProducts(items);
      const ordersList = Array.isArray(ordersRes) ? ordersRes : ordersRes?.data ?? ordersRes ?? [];
      const transformed = transformBackendOrders(Array.isArray(ordersList) ? ordersList : []);
      setOrders(transformed);
      setNewOrderData(transformed);
      const rawInvoices = invoicesRes?.data ?? invoicesRes;
      const invoicesList = Array.isArray(rawInvoices) ? rawInvoices : [];
      setInvoices(invoicesList.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || '—',
        customerCompany: inv.customer?.companyName || '',
        customerEmail: inv.customer?.email || '',
        customerAddress: null,
        customerPhone: null,
        customerGstin: null,
        invoiceDate: inv.invoiceDate || inv.createdAt,
        dueDate: inv.dueDate,
        total: Number(inv.totalAmount) ?? 0,
        totalAmount: Number(inv.totalAmount) ?? 0,
        subtotal: Number(inv.subtotal) ?? 0,
        taxAmount: Number(inv.taxAmount) ?? 0,
        tax: Number(inv.taxAmount) ?? 0,
        cgst: Number(inv.cgstAmount) ?? 0,
        sgst: Number(inv.sgstAmount) ?? 0,
        securityDeposit: 0,
        status: (inv.status || '').toLowerCase(),
        orderId: inv.orderId,
        order: inv.order,
        items: (inv.order?.lines || []).map((line) => ({
          productName: line.product?.name || 'Product',
          quantity: line.quantity,
          pricePerDay: Number(line.unitPrice) ?? 0,
          days: line.rentalDuration ?? 1,
          total: Number(line.lineTotal) ?? 0,
        })),
      })));
    } catch (err) {
      console.error('Failed to load data:', err);
      toast({ title: 'Error', description: err.message || 'Failed to load data', variant: 'destructive' });
      setProducts([]);
      setOrders([]);
      setNewOrderData([]);
      setInvoices([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleConfirmOrder = async (orderId) => {
    try {
      await vendorOrderAPI.confirmOrder(orderId);
      await loadData();
      toast({ title: "Order confirmed", description: "Order has been confirmed." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to confirm order", variant: "destructive" });
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await vendorOrderAPI.cancelOrder(orderId);
      await loadData();
      toast({ title: "Order cancelled", description: "Order has been cancelled." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to cancel order", variant: "destructive" });
    }
  };

  const handlePickup = async (orderId) => {
    try {
      await vendorOrderAPI.processPickup(orderId, { actualPickupDate: new Date().toISOString() });
      await loadData();
      toast({ title: "Pickup completed", description: "Equipment has been picked up successfully." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to process pickup", variant: "destructive" });
    }
  };

  const handleReturn = async (orderId) => {
    try {
      await vendorOrderAPI.processReturn(orderId, {});
      await loadData();
      toast({ title: "Return completed", description: "Equipment has been returned successfully." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to process return", variant: "destructive" });
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await vendorOrderAPI.completeOrder(orderId);
      await loadData();
      toast({ title: "Order completed", description: "Order and payments are complete." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to complete order", variant: "destructive" });
    }
  };

  const handleCreateInvoice = async (orderId) => {
    try {
      await vendorInvoiceAPI.createInvoice(orderId);
      await loadData();
      toast({ title: "Invoice created", description: "Invoice has been created for this order." });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to create invoice", variant: "destructive" });
    }
  };

  const togglePublish = async (productId, currentStatus) => {
    try {
      await vendorProductAPI.updateProduct(productId, {
        status: currentStatus ? 'DRAFT' : 'PUBLISHED',
      });
      await loadData();
      toast({ title: currentStatus ? 'Product unpublished' : 'Product published' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to update product', variant: 'destructive' });
    }
  };

  const handleNewStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'cancelled') {
      try {
        await vendorOrderAPI.cancelOrder(orderId);
        await loadData();
        toast({ title: "Order cancelled", description: "Order has been cancelled." });
      } catch (err) {
        toast({ title: "Error", description: err.message || "Failed to cancel order", variant: "destructive" });
      }
      return;
    }
    if (newStatus === 'confirmed') {
      try {
        await vendorOrderAPI.confirmOrder(orderId);
        await loadData();
        toast({ title: "Order confirmed", description: "Order has been confirmed." });
      } catch (err) {
        toast({ title: "Error", description: err.message || "Failed to confirm order", variant: "destructive" });
      }
      return;
    }
    const updatedOrders = newOrderData.map(order => (order.id === orderId ? { ...order, status: newStatus } : order));
    setNewOrderData(updatedOrders);
    toast({ title: "Order Updated", description: `Order status updated to ${newStatusNames[newStatus] || newStatus}` });
  };

  const handleCreateOrder = (newOrder) => {
    setNewOrderData(prev => [newOrder, ...prev]);
    toast({
      title: "Order Created",
      description: `New order ${newOrder.orderReference} has been created successfully.`,
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'pickups', label: 'Pickups & Returns', icon: Truck },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
  ];

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesFilter = orderFilter === 'all' || order.status === orderFilter;
    const matchesSearch = !searchQuery ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filter new orders (Kanban)
  const filteredNewOrders = newOrderData.filter(order => {
    const matchesSearch = !searchQuery ||
      order.orderReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.toLowerCase().includes(searchQuery.toLowerCase());

    // Map internal filters if needed, but for now strict match or 'all'
    const matchesFilter = orderFilter === 'all' || order.status === orderFilter;

    return matchesSearch && matchesFilter;
  });

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesFilter = invoiceFilter === 'all' || invoice.status === invoiceFilter;
    const matchesSearch = !searchQuery ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate stats
  const stats = [
    { label: 'Total Earnings', value: formatCurrency(vendorAnalytics.totalEarnings), change: '+15.2%', color: 'text-green-600' },
    { label: 'Active Rentals', value: orders.filter(o => o.status === 'active' || o.status === 'picked_up').length, change: '', color: 'text-blue-600' },
    { label: 'Pending Pickups', value: orders.filter(o => o.status === 'confirmed').length, change: '', color: 'text-yellow-600' },
    { label: 'Pending Returns', value: orders.filter(o => o.status === 'active' || o.status === 'picked_up').length, change: '', color: 'text-orange-600' },
  ];

  // Order status distribution for pie chart
  const orderStatusData = [
    { name: 'Confirmed', value: orders.filter(o => o.status === 'confirmed').length, color: '#3B82F6' },
    { name: 'Active', value: orders.filter(o => o.status === 'active').length, color: '#10B981' },
    { name: 'Completed', value: orders.filter(o => o.status === 'completed').length, color: '#6B7280' },
  ].filter(item => item.value > 0);

  // Check if return is overdue
  const isOverdue = (order) => {
    if (order.returnStatus === 'pending' && order.rentalEnd) {
      const endDate = new Date(order.rentalEnd);
      const today = new Date();
      return today > endDate;
    }
    return false;
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">R</div>
          <span className="font-semibold">Vendor Portal</span>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === item.id ? 'bg-sidebar-accent text-sidebar-primary' : 'hover:bg-sidebar-accent/50'}`}>
              <item.icon className="h-5 w-5" />{item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 text-red-400">
            <LogOut className="h-5 w-5" />Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b bg-card">
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-6 w-6" /></button>
          <h1 className="text-xl font-semibold capitalize">{activeTab}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.companyName || 'ProGear Rentals'}</span>
          </div>
        </header>

        <main className="p-4 lg:p-6 overflow-hidden">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-card rounded-xl border p-4">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-2xl font-bold mt-1">{stat.value}</div>
                    {stat.change && <div className={`text-sm mt-1 ${stat.color}`}>{stat.change}</div>}
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Weekly Earnings */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Weekly Earnings</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={vendorAnalytics.weeklyEarnings}>
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="hsl(222, 80%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Order Distribution */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Order Status Distribution</h3>
                  {orderStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={orderStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {orderStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">No orders yet</div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Pickups */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Upcoming Pickups</h3>
                  <div className="space-y-3">
                    {orders.filter(o => o.status === 'confirmed').slice(0, 3).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-muted-foreground">{formatDate(order.rentalStart || order.quotationDate)}</div>
                        </div>
                        <Button size="sm" onClick={() => setSelectedOrder(order)}>View</Button>
                      </div>
                    ))}
                    {orders.filter(o => o.status === 'confirmed').length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">No pending pickups</div>
                    )}
                  </div>
                </div>

                {/* Overdue Returns */}
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="font-semibold mb-4 text-red-600">Overdue Returns</h3>
                  <div className="space-y-3">
                    {orders.filter(o => isOverdue(o)).slice(0, 3).map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <div className="font-medium text-red-900">{order.customerName}</div>
                          <div className="text-sm text-red-700">Due: {formatDate(order.rentalEnd)}</div>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => setSelectedOrder(order)}>View</Button>
                      </div>
                    ))}
                    {orders.filter(o => isOverdue(o)).length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">No overdue returns</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">My Products ({products.length})</h2>
                <Button className="gap-2" onClick={() => { setSelectedProduct(null); setIsAddProductModalOpen(true); }}>Add Product</Button>
              </div>
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50"><tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Price</th>
                      <th className="text-left p-4 font-medium">Stock</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {productsLoading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading products...</td></tr>
                      ) : products.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No products yet. Click Add Product to create one.</td></tr>
                      ) : (
                        products.map((product) => {
                          const isPublished = product.status === 'PUBLISHED';
                          const qty = Number(product.quantityOnHand) ?? 0;
                          return (
                            <tr
                              key={product.id}
                              className="border-t cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => { setSelectedProduct(product); setIsAddProductModalOpen(true); }}
                            >
                              <td className="p-4"><div className="flex items-center gap-3">
                                <img src={product.imageUrl || product.images?.[0] || '/placeholder.svg'} className="w-12 h-12 rounded-lg object-cover bg-muted" alt={product.name} />
                                <span className="font-medium">{product.name}</span>
                              </div></td>
                              <td className="p-4">{formatCurrency(product.salesPrice)}</td>
                              <td className="p-4">{qty}</td>
                              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isPublished ? 'Published' : 'Draft'}</span></td>
                              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" onClick={() => togglePublish(product.id, isPublished)}>
                                  {isPublished ? 'Unpublish' : 'Publish'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-3 rounded-xl border">
                <div className="flex gap-2 items-center flex-1 w-full sm:w-auto">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm hidden sm:block"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="active">Active</option>
                    <option value="returned">Returned</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  {/* View Switcher */}
                  <div className="flex bg-muted p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`p-2 rounded transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Kanban View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* New Order Button */}
                  <Button
                    onClick={() => setIsCreateOrderModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    New Order
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="h-full min-h-[500px]">
                {viewMode === 'kanban' ? (
                  <OrdersKanbanView
                    orders={filteredNewOrders}
                    onOrderClick={setSelectedOrder}
                    onOrderDrop={handleNewStatusChange}
                  />
                ) : (
                  <OrdersListView orders={filteredNewOrders} onOrderClick={setSelectedOrder} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'pickups' && (
            <div className="space-y-6">
              {/* Pending Pickups */}
              <div>
                <h3 className="font-semibold mb-3">Pending Pickups</h3>
                <div className="space-y-3">
                  {orders.filter(o => o.pickupStatus === 'pending').map((order) => (
                    <div key={order.id} className="bg-card rounded-xl border p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-muted-foreground">{order.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">{formatDate(order.rentalStart)} - {formatDate(order.rentalEnd)}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>View Details</Button>
                          <Button size="sm" onClick={() => handlePickup(order.id)}>Mark Pickup</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.filter(o => o.pickupStatus === 'pending').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border">No pending pickups</div>
                  )}
                </div>
              </div>

              {/* Pending Returns */}
              <div>
                <h3 className="font-semibold mb-3">Pending Returns</h3>
                <div className="space-y-3">
                  {orders.filter(o => o.pickupStatus === 'completed' && o.returnStatus === 'pending').map((order) => (
                    <div key={order.id} className={`bg-card rounded-xl border p-4 ${isOverdue(order) ? 'border-red-300 bg-red-50' : ''}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-muted-foreground">{order.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            Due: {formatDate(order.rentalEnd)}
                            {isOverdue(order) && <span className="ml-2 text-red-600 font-medium">OVERDUE</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>View Details</Button>
                          <Button size="sm" variant={isOverdue(order) ? "destructive" : "default"} onClick={() => handleReturn(order.id)}>Mark Return</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {orders.filter(o => o.status === 'active' || o.status === 'picked_up').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border">No pending returns</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by invoice number or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <select
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Invoices</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Invoices List */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50"><tr>
                      <th className="text-left p-4 font-medium">Invoice #</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t hover:bg-muted/20">
                          <td className="p-4"><span className="font-mono text-sm">{invoice.invoiceNumber}</span></td>
                          <td className="p-4">
                            <div className="font-medium">{invoice.customerName}</div>
                            <div className="text-xs text-muted-foreground">{invoice.customerCompany}</div>
                          </td>
                          <td className="p-4 text-sm">{formatDate(invoice.invoiceDate)}</td>
                          <td className="p-4 text-right font-medium">{formatCurrency(invoice.total)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                              invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                              {invoice.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">
                            <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(invoice)}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">No invoices found</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border p-6">
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                  <div className="text-3xl font-bold text-primary mt-2">{formatCurrency(vendorAnalytics.totalEarnings)}</div>
                  <div className="text-sm text-green-600 mt-1">+{vendorAnalytics.earningsGrowth}% from last month</div>
                </div>
                <div className="bg-card rounded-xl border p-6">
                  <div className="text-sm text-muted-foreground">Pending Payouts</div>
                  <div className="text-3xl font-bold mt-2">{formatCurrency(vendorAnalytics.pendingPayouts)}</div>
                  <div className="text-sm text-muted-foreground mt-1">To be processed</div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {invoices.filter(i => i.status === 'paid').slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-muted-foreground">{invoice.customerName} • {formatDate(invoice.paidAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{formatCurrency(invoice.amountPaid)}</div>
                        <div className="text-xs text-muted-foreground">{invoice.paymentMethod}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPickup={handlePickup}
          onReturn={handleReturn}
          onConfirm={handleConfirmOrder}
          onCancel={handleCancelOrder}
          onComplete={handleCompleteOrder}
          onCreateInvoice={handleCreateInvoice}
        />
      )}

      {newSelectedOrder && (
        <NewOrderDetailModal
          order={newSelectedOrder}
          onClose={() => setNewSelectedOrder(null)}
          onStatusChange={handleNewStatusChange}
        />
      )}

      {selectedInvoice && (
        <InvoiceViewModal
          invoice={{
            ...selectedInvoice,
            vendorName: user?.name || 'Vendor',
            vendorEmail: user?.email || '',
            vendorAddress: user?.companyName || '',
            vendorPhone: '',
            vendorGstin: user?.gstin || '—',
          }}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        onCreateOrder={handleCreateOrder}
      />

      {/* Add / Edit Product Modal */}
      <AddProductModal
        open={isAddProductModalOpen}
        onOpenChange={(open) => {
          setIsAddProductModalOpen(open);
          if (!open) setSelectedProduct(null);
        }}
        onSuccess={loadData}
        product={selectedProduct}
      />

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default VendorDashboard;
