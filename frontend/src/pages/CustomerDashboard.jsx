import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, FileText, Download, Clock, ArrowRight, ChevronRight, Receipt } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { orderAPI } from '../utils/api';
import { transformBackendOrders } from '../utils/orderTransform';
import { formatCurrency, formatDate, getStatusBadgeClass, getStatusDisplayText } from '../utils/helpers';
import { toast } from '@/hooks/use-toast';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const response = await orderAPI.getMyOrders();
        const data = Array.isArray(response) ? response : response?.data ?? response ?? [];
        const list = Array.isArray(data) ? data : [];
        setOrders(transformBackendOrders(list));
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load orders',
          variant: 'destructive',
        });
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchInvoices = async () => {
      setInvoicesLoading(true);
      try {
        const response = await orderAPI.getMyInvoices();
        const raw = response?.data ?? response;
        const list = Array.isArray(raw) ? raw : [];
        setInvoices(list);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast({ title: 'Error', description: error.message || 'Failed to load invoices', variant: 'destructive' });
        setInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    };

    fetchInvoices();
  }, [user]);

  const handleDownloadInvoice = (invoice) => {
    const items = invoice.items || invoice.lines || invoice.order?.lines || [];
    const invoiceContent = `
INVOICE: ${invoice.invoiceNumber}
Date: ${formatDate(invoice.invoiceDate || invoice.createdAt)}
Order: ${invoice.order?.orderNumber || invoice.orderId || '—'}

Items:
${items.map((item) => {
  const name = item.productName || item.product?.name || 'Product';
  const qty = item.quantity ?? 1;
  const tot = Number(item.lineTotal ?? item.total ?? 0);
  return `- ${name} x${qty} = ${formatCurrency(tot)}`;
}).join('\n')}

Subtotal: ${formatCurrency(Number(invoice.subtotal ?? invoice.totalAmount ?? 0))}
Tax: ${formatCurrency(Number(invoice.taxAmount ?? 0))}
Total: ${formatCurrency(Number(invoice.totalAmount ?? invoice.total ?? 0))}
Amount Paid: ${formatCurrency(Number(invoice.paidAmount ?? 0))}
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
    { 
      label: 'Active Rentals', 
      value: orders.filter(o => {
        // Support both frontend and backend status formats
        const status = (o.status || '').toLowerCase();
        const isConfirmed = status === 'confirmed' || status === 'active';
        const pickupStatus = (o.pickupStatus || o.pickupRecords?.[0]?.status || '').toLowerCase();
        const returnStatus = (o.returnStatus || o.returnRecords?.[0]?.status || '').toLowerCase();
        return isConfirmed && pickupStatus === 'completed' && (returnStatus === 'pending' || returnStatus === '');
      }).length, 
      icon: Package 
    },
    { label: 'Total Orders', value: orders.length, icon: FileText },
    { label: 'Total Spent', value: formatCurrency(orders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0)), icon: Clock },
  ];

  const completedOrders = orders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s === 'completed' || s === 'returned';
  });

  const tabs = [
    { id: 'orders', label: 'My Orders', count: orders.length },
    { id: 'completed', label: 'Completed Orders', count: completedOrders.length },
    { id: 'invoices', label: 'Invoices', count: invoices.length },
  ];

  const getInvoiceForOrder = (orderId) => invoices.find((inv) => inv.orderId === orderId);

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
              {ordersLoading ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
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
                          <span className="font-mono text-sm text-muted-foreground">#{order.orderNumber || order.orderReference}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                            {getStatusDisplayText(order.status)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {(order.items || order.lines || []).map((item, idx) => (
                            <div key={item.id || idx} className="text-sm">
                              {item.productName || item.product?.name || 'Product'} × {item.quantity ?? 1}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span>
                            <Clock className="inline h-4 w-4 mr-1" />
                            {order.rentalStart || order.startDate
                              ? `${formatDate(order.rentalStart || order.startDate)} - ${formatDate(order.rentalEnd || order.endDate)}`
                              : order.quotationDate && `Ordered ${formatDate(order.quotationDate)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(order.total ?? order.totalAmount ?? 0)}</div>
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

          {/* Completed Orders Tab — past/returned orders with invoice */}
          {activeTab === 'completed' && (
            <div className="space-y-4">
              {ordersLoading ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : completedOrders.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed orders yet</h3>
                  <p className="text-muted-foreground">Orders that are returned or completed will appear here with their invoices.</p>
                </div>
              ) : (
                completedOrders.map((order) => {
                  const invoice = getInvoiceForOrder(order.id);
                  return (
                    <div key={order.id} className="bg-card rounded-xl border p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-muted-foreground">#{order.orderNumber || order.orderReference}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                              {getStatusDisplayText(order.status)}
                            </span>
                            {invoice && (
                              <span className="text-xs text-muted-foreground">Invoice: {invoice.invoiceNumber}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {(order.items || order.lines || []).map((item, idx) => (
                              <div key={item.id || idx} className="text-sm">
                                {item.productName || item.product?.name || 'Product'} × {item.quantity ?? 1}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>
                              <Clock className="inline h-4 w-4 mr-1" />
                              {order.rentalStart || order.startDate
                                ? `${formatDate(order.rentalStart || order.startDate)} - ${formatDate(order.rentalEnd || order.endDate)}`
                                : order.quotationDate && `Ordered ${formatDate(order.quotationDate)}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatCurrency(order.total ?? order.totalAmount ?? 0)}</div>
                            <div className={`text-sm ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                              {order.paymentStatus === 'paid' ? 'Paid' : 'Partial Payment'}
                            </div>
                          </div>
                          {invoice ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Invoice
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Invoice pending</span>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {invoicesLoading ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground">Loading invoices...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No invoices</h3>
                  <p className="text-muted-foreground">Invoices are created when your rental is returned. They will appear here.</p>
                </div>
              ) : (
                invoices.map((invoice) => {
                  const total = Number(invoice.totalAmount) ?? Number(invoice.total) ?? 0;
                  const status = (invoice.status || '').toLowerCase();
                  const displayInvoice = {
                    ...invoice,
                    total,
                    totalAmount: total,
                    status,
                    createdAt: invoice.invoiceDate || invoice.createdAt,
                    amountPaid: Number(invoice.paidAmount) ?? 0,
                  };
                  return (
                    <div key={invoice.id} className="bg-card rounded-xl border p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(status)}`}>
                              {getStatusDisplayText(status)}
                            </span>
                            {invoice.order?.orderNumber && (
                              <span className="text-xs text-muted-foreground">Order #{invoice.order.orderNumber}</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(invoice.invoiceDate || invoice.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(total)}</div>
                            <div className="text-sm text-muted-foreground">
                              Paid: {formatCurrency(invoice.paidAmount ?? 0)}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(displayInvoice)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Invoice View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-lg">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Invoice {selectedInvoice.invoiceNumber}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(selectedInvoice)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(null)}>Close</Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {formatDate(selectedInvoice.invoiceDate || selectedInvoice.createdAt)}</div>
                <div><span className="text-muted-foreground">Order:</span> #{selectedInvoice.order?.orderNumber || selectedInvoice.orderId}</div>
                <div><span className="text-muted-foreground">Status:</span> <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass((selectedInvoice.status || '').toLowerCase())}`}>{getStatusDisplayText((selectedInvoice.status || '').toLowerCase())}</span></div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted"><tr><th className="text-left p-2">Product</th><th className="text-center p-2">Qty</th><th className="text-right p-2">Total</th></tr></thead>
                    <tbody>
                      {(selectedInvoice.items || selectedInvoice.order?.lines || []).map((item, idx) => (
                        <tr key={item.id || idx} className="border-t">
                          <td className="p-2">{item.productName || item.product?.name || 'Product'}</td>
                          <td className="p-2 text-center">{item.quantity ?? 1}</td>
                          <td className="p-2 text-right">{formatCurrency(Number(item.lineTotal ?? item.total ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="border-t pt-4 flex justify-end">
                <div className="text-right space-y-1">
                  <div className="flex justify-between gap-8"><span className="text-muted-foreground">Subtotal</span> {formatCurrency(Number(selectedInvoice.subtotal ?? selectedInvoice.totalAmount ?? 0))}</div>
                  <div className="flex justify-between gap-8"><span className="text-muted-foreground">Tax</span> {formatCurrency(Number(selectedInvoice.taxAmount ?? 0))}</div>
                  <div className="font-bold text-lg">Total: {formatCurrency(Number(selectedInvoice.totalAmount ?? selectedInvoice.total ?? 0))}</div>
                  <div className="text-sm text-muted-foreground">Paid: {formatCurrency(Number(selectedInvoice.paidAmount ?? 0))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default CustomerDashboard;
