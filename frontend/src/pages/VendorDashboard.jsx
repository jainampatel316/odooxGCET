import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, DollarSign, Settings, LogOut, Menu, X, ChevronRight, Plus, Edit, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { getProducts, getOrders, updateOrder, updateProduct } from '../utils/storage';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/helpers';
import { vendorAnalytics } from '../data/mockData';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      navigate('/login');
      return;
    }
    setProducts(getProducts().filter(p => p.vendorId === user.id || p.vendorId === 'vendor-1'));
    setOrders(getOrders().filter(o => o.vendorId === user.id || o.vendorId === 'vendor-1'));
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handlePickup = (orderId) => {
    updateOrder(orderId, { pickupStatus: 'completed' });
    setOrders(orders.map(o => o.id === orderId ? { ...o, pickupStatus: 'completed' } : o));
    toast({ title: "Pickup completed", description: "Equipment has been picked up." });
  };

  const handleReturn = (orderId) => {
    updateOrder(orderId, { returnStatus: 'completed', status: 'completed' });
    setOrders(orders.map(o => o.id === orderId ? { ...o, returnStatus: 'completed', status: 'completed' } : o));
    toast({ title: "Return completed", description: "Equipment has been returned." });
  };

  const togglePublish = (productId, currentStatus) => {
    updateProduct(productId, { isPublished: !currentStatus });
    setProducts(products.map(p => p.id === productId ? { ...p, isPublished: !currentStatus } : p));
    toast({ title: currentStatus ? "Product unpublished" : "Product published" });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'pickups', label: 'Pickups & Returns', icon: Truck },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
  ];

  const stats = [
    { label: 'Total Earnings', value: formatCurrency(vendorAnalytics.totalEarnings), change: '+15.2%' },
    { label: 'Active Rentals', value: vendorAnalytics.activeRentals, change: '+3' },
    { label: 'Products', value: products.length, change: '' },
    { label: 'Pending Orders', value: orders.filter(o => o.status === 'pending').length, change: '' },
  ];

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
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
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
      <div className="flex-1 lg:ml-0">
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b bg-card">
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-6 w-6" /></button>
          <h1 className="text-xl font-semibold capitalize">{activeTab}</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.companyName || 'ProGear Rentals'}</span>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-card rounded-xl border p-4">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.change && <div className="text-sm text-green-600">{stat.change}</div>}
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Weekly Earnings</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={vendorAnalytics.weeklyEarnings}>
                    <XAxis dataKey="week" /><YAxis /><Tooltip />
                    <Bar dataKey="earnings" fill="hsl(222, 80%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">My Products ({products.length})</h2>
                <Button className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
              </div>
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50"><tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Price/Day</th>
                      <th className="text-left p-4 font-medium">Stock</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-t">
                          <td className="p-4"><div className="flex items-center gap-3">
                            <img src={product.images?.[0] || '/placeholder.svg'} className="w-12 h-12 rounded-lg object-cover bg-muted" />
                            <span className="font-medium">{product.name}</span>
                          </div></td>
                          <td className="p-4">{formatCurrency(product.pricePerDay)}</td>
                          <td className="p-4">{product.availableQuantity}/{product.quantity}</td>
                          <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${product.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{product.isPublished ? 'Published' : 'Draft'}</span></td>
                          <td className="p-4"><div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => togglePublish(product.id, product.isPublished)}>{product.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-card rounded-xl border p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm">#{order.orderNumber}</span>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{order.customerName} • {formatDate(order.rentalStart)} - {formatDate(order.rentalEnd)}</div>
                    </div>
                    <div className="text-right font-bold">{formatCurrency(order.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'pickups' && (
            <div className="space-y-4">
              {orders.filter(o => o.pickupStatus === 'pending' || o.returnStatus === 'pending').map((order) => (
                <div key={order.id} className="bg-card rounded-xl border p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(order.rentalStart)} - {formatDate(order.rentalEnd)}</div>
                    </div>
                    <div className="flex gap-2">
                      {order.pickupStatus === 'pending' && <Button size="sm" onClick={() => handlePickup(order.id)}>Mark Pickup</Button>}
                      {order.pickupStatus === 'completed' && order.returnStatus === 'pending' && <Button size="sm" variant="outline" onClick={() => handleReturn(order.id)}>Mark Return</Button>}
                    </div>
                  </div>
                </div>
              ))}
              {orders.filter(o => o.pickupStatus === 'pending' || o.returnStatus === 'pending').length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No pending pickups or returns</div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border p-6">
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                  <div className="text-3xl font-bold text-primary">{formatCurrency(vendorAnalytics.totalEarnings)}</div>
                </div>
                <div className="bg-card rounded-xl border p-6">
                  <div className="text-sm text-muted-foreground">Pending Payouts</div>
                  <div className="text-3xl font-bold">{formatCurrency(vendorAnalytics.pendingPayouts)}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default VendorDashboard;
