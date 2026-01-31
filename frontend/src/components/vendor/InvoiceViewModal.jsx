import { X, Printer, Download, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrency, formatDate } from '../../utils/helpers';

const InvoiceViewModal = ({ invoice, onClose }) => {
    if (!invoice) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        // UI-only download action
        alert('Invoice download functionality - UI only demo');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header with Actions */}
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between print:hidden">
                    <h2 className="text-xl font-bold">Invoice Preview</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8 print:p-12">
                    {/* Vendor Header */}
                    <div className="border-b pb-6 mb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                                        {invoice.vendorName.charAt(0)}
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold">{invoice.vendorName}</h1>
                                        <p className="text-sm text-muted-foreground">Rental Equipment Provider</p>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1 mt-3">
                                    <p>{invoice.vendorAddress}</p>
                                    <p>Phone: {invoice.vendorPhone}</p>
                                    <p>Email: {invoice.vendorEmail}</p>
                                    <p className="font-medium">GSTIN: {invoice.vendorGstin}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-primary mb-2">INVOICE</div>
                                <div className="text-sm space-y-1">
                                    <p className="font-mono font-bold">{invoice.invoiceNumber}</p>
                                    <p className="text-muted-foreground">Date: {formatDate(invoice.invoiceDate)}</p>
                                    <p className="text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To Section */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">BILL TO:</h3>
                            <div className="bg-muted/30 rounded-lg p-4">
                                <p className="font-bold">{invoice.customerName}</p>
                                {invoice.customerCompany && (
                                    <p className="text-sm">{invoice.customerCompany}</p>
                                )}
                                {invoice.customerAddress && (
                                    <p className="text-sm text-muted-foreground mt-2">{invoice.customerAddress}</p>
                                )}
                                <p className="text-sm mt-2">Email: {invoice.customerEmail}</p>
                                {invoice.customerPhone && (
                                    <p className="text-sm">Phone: {invoice.customerPhone}</p>
                                )}
                                <p className="text-sm font-medium mt-2">GSTIN: {invoice.customerGstin}</p>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">INVOICE DETAILS:</h3>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Order Reference:</span>
                                    <span className="font-mono">{invoice.orderId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Payment Status:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            invoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {invoice.status.toUpperCase()}
                                    </span>
                                </div>
                                {invoice.paymentMethod && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Payment Method:</span>
                                        <span>{invoice.paymentMethod}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="mb-6">
                        <h3 className="font-semibold mb-3">RENTAL ITEMS</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3 text-sm font-semibold">Description</th>
                                        <th className="text-center p-3 text-sm font-semibold">Qty</th>
                                        <th className="text-right p-3 text-sm font-semibold">Rate/Day</th>
                                        <th className="text-center p-3 text-sm font-semibold">Days</th>
                                        <th className="text-right p-3 text-sm font-semibold">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item, index) => (
                                        <tr key={index} className="border-t">
                                            <td className="p-3">
                                                <div className="font-medium">{item.productName}</div>
                                                {item.description && (
                                                    <div className="text-sm text-muted-foreground">{item.description}</div>
                                                )}
                                                {item.rentalPeriod && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Rental Period: {item.rentalPeriod}
                                                    </div>
                                                )}
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
                    <div className="flex justify-end mb-6">
                        <div className="w-full md:w-96 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">CGST (9%)</span>
                                <span>{formatCurrency(invoice.cgst)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">SGST (9%)</span>
                                <span>{formatCurrency(invoice.sgst)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium border-t pt-2">
                                <span>Tax Total (18% GST)</span>
                                <span>{formatCurrency(invoice.tax)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Security Deposit</span>
                                <span>{formatCurrency(invoice.securityDeposit)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                                <span>Total Amount</span>
                                <span className="text-primary">{formatCurrency(invoice.total)}</span>
                            </div>
                            <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                                <span className="text-green-700">Amount Paid</span>
                                <span className="text-green-700 font-medium">{formatCurrency(invoice.amountPaid)}</span>
                            </div>
                            {invoice.balanceDue > 0 && (
                                <div className="flex justify-between text-sm bg-red-50 p-2 rounded">
                                    <span className="text-red-700 font-medium">Balance Due</span>
                                    <span className="text-red-700 font-bold">{formatCurrency(invoice.balanceDue)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Terms & Notes */}
                    <div className="border-t pt-6 space-y-4">
                        {invoice.paymentTerms && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">PAYMENT TERMS</h4>
                                <p className="text-sm text-muted-foreground">{invoice.paymentTerms}</p>
                            </div>
                        )}
                        {invoice.notes && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">NOTES</h4>
                                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
                        <p>Thank you for your business!</p>
                        <p className="mt-2">This is a computer-generated invoice and does not require a signature.</p>
                    </div>
                </div>

                {/* Close Button for Print */}
                <div className="border-t p-4 flex justify-end print:hidden">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .fixed {
            position: relative;
          }
          .bg-black\\/50 {
            background: white;
          }
        }
      `}</style>
        </div>
    );
};

export default InvoiceViewModal;
