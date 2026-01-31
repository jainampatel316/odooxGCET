import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, FileText, Download, Clock, ArrowRight, User, Settings, LogOut, ChevronRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { getOrders, getInvoices, getQuotations } from '../utils/storage';
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusDisplayText } from '../utils/helpers';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const allOrders = getOrders().filter(o => o.customerId === user.id);
    const allInvoices = getInvoices().filter(i => i.customerId === user.id);
    const allQuotations = getQuotations().filter(q => q.customerId === user.id);
    
    setOrders(allOrders);
    setInvoices(allInvoices);
    setQuotations(allQuotations);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDownloadInvoice = (invoice) => {
    // Simulate invoice download
    const invoiceContent = `
INVOICE: ${invoice.invoiceNumber}
Date: ${formatDate(invoice.createdAt)}
Customer: ${invoice.customerName}
GSTIN: ${invoice.customerGstin}

Items:
${invoice.items.map(item => `- ${item.productName} x${item.quantity} @ ${formatCurrency(item.pricePerDay)}/day for ${item.days} days = ${formatCurrency(item.total)}`).join('\n')}

Subtotal: ${formatCurrency(invoice.subtotal)}
Tax (18% GST): ${formatCurrency(invoice.tax)}
Security Deposit: ${formatCurrency(invoice.securityDeposit)}
Total: ${formatCurrency(invoice.total)}
Amount Paid: ${formatCurrency(invoice.amountPaid)}
    `;
    
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return null;
  }

  const stats = [
    { label: 'Active Rentals', value: orders.filter(o => o.status === 'confirmed' && o.pickupStatus === 'completed' && o.returnStatus === 'pending').length, icon: Package },
    { label: 'Total Orders', value: orders.length, icon: FileText },
    { label: 'Total Spent', value: formatCurrency(orders.reduce((sum, o) => sum + o.total, 0)), icon: Clock },
  ];

  const tabs = [
    { id: 'orders', label: 'My Orders', count: orders.length },
    { id: 'quotations', label: 'Quotations', count: quotations.length },
    { id: 'invoices', label: 'Invoices', count: invoices.length },
    { id: 'profile', label: 'Profile', count: null },
  ];

  return (
    <CustomerLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome back, {user.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Manage your rentals and account settings</p>
          </div>
          <Link to="/products">
            <Button className="gap-2">
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex gap-6 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-1 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs">{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">Start renting equipment to see your orders here</p>
                  <Link to="/products">
                    <Button>Browse Products</Button>
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-card rounded-xl border p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-muted-foreground">#{order.orderNumber}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                            {getStatusDisplayText(order.status)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              {item.productName} × {item.quantity}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span>
                            <Clock className="inline h-4 w-4 mr-1" />
                            {formatDate(order.rentalStart)} - {formatDate(order.rentalEnd)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(order.total)}</div>
                          <div className={`text-sm ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Partial Payment'}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quotations Tab */}
          {activeTab === 'quotations' && (
            <div className="space-y-4">
              {quotations.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No quotations</h3>
                  <p className="text-muted-foreground">Your quotations will appear here</p>
                </div>
              ) : (
                quotations.map((quote) => (
                  <div key={quote.id} className="bg-card rounded-xl border p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm text-muted-foreground">#{quote.quotationNumber}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(quote.status)}`}>
                            {getStatusDisplayText(quote.status)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created on {formatDate(quote.createdAt)}
                        </div>
                      </div>
                      <div className="font-bold text-lg">{formatCurrency(quote.total)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No invoices</h3>
                  <p className="text-muted-foreground">Your invoices will appear here after orders</p>
                </div>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="bg-card rounded-xl border p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                            {getStatusDisplayText(invoice.status)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(invoice.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(invoice.total)}</div>
                          <div className="text-sm text-muted-foreground">
                            Paid: {formatCurrency(invoice.amountPaid)}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <div className="bg-card rounded-xl border p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-bold">{user.name}</div>
                    <div className="text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{user.phone || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">Company</span>
                    <span>{user.companyName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b">
                    <span className="text-muted-foreground">GSTIN</span>
                    <span className="font-mono">{user.gstin || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-muted-foreground">Member Since</span>
                    <span>{formatDate(user.createdAt || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerDashboard;
