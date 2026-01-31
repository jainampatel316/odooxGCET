import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Store, BarChart3, Settings, LogOut, Menu } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { getVendors, getUsers, getOrders } from '../utils/storage';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/helpers';
import { dashboardAnalytics } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    setVendors(getVendors());
    setUsers(getUsers());
    setOrders(getOrders());
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/'); };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendors', label: 'Vendors', icon: Store },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(dashboardAnalytics.totalRevenue), change: `+${dashboardAnalytics.revenueGrowth}%` },
    { label: 'Total Orders', value: dashboardAnalytics.totalOrders, change: `+${dashboardAnalytics.orderGrowth}%` },
    { label: 'Active Rentals', value: dashboardAnalytics.activeRentals },
    { label: 'Total Products', value: dashboardAnalytics.totalProducts },
  ];

  const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">R</div>
          <span className="font-semibold">Admin Panel</span>
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

      <div className="flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b bg-card">
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-6 w-6" /></button>
          <h1 className="text-xl font-semibold capitalize">{activeTab}</h1>
          <span className="text-sm text-muted-foreground">Admin</span>
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
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Monthly Revenue</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboardAnalytics.monthlyRevenue}>
                      <XAxis dataKey="month" /><YAxis /><Tooltip />
                      <Bar dataKey="revenue" fill="hsl(222, 80%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-card rounded-xl border p-6">
                  <h3 className="font-semibold mb-4">Orders by Status</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={dashboardAnalytics.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                        {dashboardAnalytics.ordersByStatus.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-4 font-medium">Company</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Products</th>
                  <th className="text-left p-4 font-medium">Revenue</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-t">
                      <td className="p-4 font-medium">{vendor.companyName}</td>
                      <td className="p-4">{vendor.email}</td>
                      <td className="p-4">{vendor.totalProducts}</td>
                      <td className="p-4">{formatCurrency(vendor.totalRevenue)}</td>
                      <td className="p-4"><span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">{vendor.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-card rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Orders</th>
                  <th className="text-left p-4 font-medium">Total Spent</th>
                </tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4">{u.totalOrders}</td>
                      <td className="p-4">{formatCurrency(u.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Top Products</h3>
                {dashboardAnalytics.topProducts.map((p, i) => (
                  <div key={i} className="flex justify-between py-2 border-b last:border-0">
                    <span>{p.name}</span><span className="font-medium">{p.rentals} rentals</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <Button variant="outline">Export PDF</Button>
                <Button variant="outline">Export CSV</Button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Rental Periods</h3>
                <div className="space-y-3">
                  {['Hourly', 'Daily', 'Weekly', 'Monthly'].map(period => (
                    <label key={period} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />{period} Rentals
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold mb-4">Tax Configuration</h3>
                <div className="flex items-center gap-4">
                  <label>GST Rate (%)</label>
                  <input type="number" defaultValue="18" className="w-24 px-3 py-2 border rounded-lg" />
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

export default AdminDashboard;
