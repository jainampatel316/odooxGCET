import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Shield, Check, Clock, MapPin } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { formatCurrency, calculateCartTotal, calculateRentalDays, formatDate, generateOrderNumber, generateQuotationNumber, generateInvoiceNumber, delay } from '../utils/helpers';
import { addQuotation, addOrder, addInvoice, addReservation, getProducts, setProducts } from '../utils/storage';
import { generateId } from '../data/mockData';
import { toast } from '@/hooks/use-toast';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, user, clearCart, login } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Confirmation
  
  // Form states
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    companyName: user?.companyName || '',
    gstin: user?.gstin || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    deliveryType: 'pickup', // pickup or delivery
    paymentType: 'full', // full or partial
    securityDeposit: true,
  });

  const [errors, setErrors] = useState({});

  const startDate = cart.rentalStart ? new Date(cart.rentalStart) : null;
  const endDate = cart.rentalEnd ? new Date(cart.rentalEnd) : null;
  const rentalDays = startDate && endDate ? calculateRentalDays(startDate, endDate) : 0;
  const { subtotal, tax, total } = calculateCartTotal(cart.items, startDate, endDate);
  const securityDeposit = Math.round(subtotal * 0.5); // 50% security deposit
  const grandTotal = total + securityDeposit;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.gstin.trim()) newErrors.gstin = 'GSTIN is required for invoicing';
    if (formData.deliveryType === 'delivery') {
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await delay(1500);

      // Create user if not logged in
      const customerId = user?.id || generateId();
      const customerData = {
        id: customerId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        companyName: formData.companyName,
        gstin: formData.gstin,
        role: 'customer',
      };

      if (!user) {
        login(customerData);
      }

      // Create quotation
      const quotationId = generateId();
      const quotation = {
        id: quotationId,
        quotationNumber: generateQuotationNumber(),
        customerId,
        customerName: formData.name,
        items: cart.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          pricePerDay: item.pricePerDay,
          days: rentalDays,
          total: item.pricePerDay * rentalDays * item.quantity,
        })),
        rentalStart: cart.rentalStart,
        rentalEnd: cart.rentalEnd,
        status: 'confirmed',
        subtotal,
        tax,
        total,
        notes: '',
        createdAt: new Date().toISOString(),
      };
      addQuotation(quotation);

      // Create order
      const orderId = generateId();
      const order = {
        id: orderId,
        orderNumber: generateOrderNumber(),
        quotationId,
        customerId,
        customerName: formData.name,
        vendorId: 'vendor-1', // Simplified - assign to first vendor
        items: quotation.items,
        rentalStart: cart.rentalStart,
        rentalEnd: cart.rentalEnd,
        status: 'confirmed',
        subtotal,
        tax,
        total,
        securityDeposit,
        paymentStatus: formData.paymentType === 'full' ? 'paid' : 'partial',
        pickupStatus: 'pending',
        returnStatus: 'pending',
        deliveryType: formData.deliveryType,
        deliveryAddress: formData.deliveryType === 'delivery' ? {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        } : null,
        createdAt: new Date().toISOString(),
      };
      addOrder(order);

      // Create invoice
      const invoice = {
        id: generateId(),
        invoiceNumber: generateInvoiceNumber(),
        orderId,
        customerId,
        customerName: formData.name,
        customerEmail: formData.email,
        customerGstin: formData.gstin,
        items: quotation.items,
        subtotal,
        tax,
        securityDeposit,
        total: grandTotal,
        amountPaid: formData.paymentType === 'full' ? grandTotal : securityDeposit,
        status: formData.paymentType === 'full' ? 'paid' : 'partial',
        dueDate: cart.rentalStart,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      addInvoice(invoice);

      // Create reservations for each product
      cart.items.forEach(item => {
        addReservation({
          id: generateId(),
          productId: item.productId,
          orderId,
          startDate: cart.rentalStart,
          endDate: cart.rentalEnd,
          quantity: item.quantity,
        });

        // Update product availability
        const products = getProducts();
        const product = products.find(p => p.id === item.productId);
        if (product) {
          product.availableQuantity = Math.max(0, product.availableQuantity - item.quantity);
          setProducts(products);
        }
      });

      // Clear cart and move to confirmation
      clearCart();
      setStep(3);
      
      toast({
        title: "Order Confirmed!",
        description: "Your rental order has been placed successfully.",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.items.length === 0 && step !== 3) {
    navigate('/cart');
    return null;
  }

  // Confirmation Step
  if (step === 3) {
    return (
      <CustomerLayout>
        <div className="container py-16 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for your order. We've sent a confirmation email to {formData.email}.
          </p>
          
          <div className="bg-card rounded-xl border p-6 mb-8 text-left">
            <h3 className="font-semibold mb-4">What's Next?</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">1</div>
                <div>
                  <div className="font-medium">Confirmation Email</div>
                  <div className="text-sm text-muted-foreground">Check your email for order details and invoice</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">2</div>
                <div>
                  <div className="font-medium">{formData.deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}</div>
                  <div className="text-sm text-muted-foreground">
                    {formData.deliveryType === 'pickup' 
                      ? 'Visit our location to collect your equipment'
                      : 'Your equipment will be delivered to your address'}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">3</div>
                <div>
                  <div className="font-medium">Return</div>
                  <div className="text-sm text-muted-foreground">
                    Return equipment by {endDate ? formatDate(endDate) : 'end date'} to avoid late fees
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Link to="/dashboard">
              <Button>View My Orders</Button>
            </Link>
            <Link to="/products">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Link>

        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-8">Complete your rental order</p>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { num: 1, label: 'Information' },
            { num: 2, label: 'Payment' },
            { num: 3, label: 'Confirmation' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s.num 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step > s.num ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span className={`hidden sm:inline ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < 2 && <div className="w-8 sm:w-16 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-card rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.name ? 'border-destructive' : ''}`}
                        placeholder="John Smith"
                      />
                      {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.email ? 'border-destructive' : ''}`}
                        placeholder="john@example.com"
                      />
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.phone ? 'border-destructive' : ''}`}
                        placeholder="+1 555-0123"
                      />
                      {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Company Name</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="Your Company Ltd."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1">GSTIN *</label>
                      <input
                        type="text"
                        name="gstin"
                        value={formData.gstin}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.gstin ? 'border-destructive' : ''}`}
                        placeholder="22AAAAA0000A1Z5"
                      />
                      {errors.gstin && <p className="text-destructive text-sm mt-1">{errors.gstin}</p>}
                    </div>
                  </div>
                </div>

                {/* Delivery Options */}
                <div className="bg-card rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">Delivery Options</h2>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.deliveryType === 'pickup' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <input
                        type="radio"
                        name="deliveryType"
                        value="pickup"
                        checked={formData.deliveryType === 'pickup'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="font-medium">Pickup</div>
                        <div className="text-sm text-muted-foreground">Collect from our location</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.deliveryType === 'delivery' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <input
                        type="radio"
                        name="deliveryType"
                        value="delivery"
                        checked={formData.deliveryType === 'delivery'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="font-medium">Delivery</div>
                        <div className="text-sm text-muted-foreground">We'll deliver to you (+$25)</div>
                      </div>
                    </label>
                  </div>

                  {formData.deliveryType === 'delivery' && (
                    <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address *</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.address ? 'border-destructive' : ''}`}
                          placeholder="123 Main Street"
                        />
                        {errors.address && <p className="text-destructive text-sm mt-1">{errors.address}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">City *</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.city ? 'border-destructive' : ''}`}
                          placeholder="New York"
                        />
                        {errors.city && <p className="text-destructive text-sm mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State</label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="NY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pincode *</label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.pincode ? 'border-destructive' : ''}`}
                          placeholder="10001"
                        />
                        {errors.pincode && <p className="text-destructive text-sm mt-1">{errors.pincode}</p>}
                      </div>
                    </div>
                  )}
                </div>

                <Button size="lg" className="w-full" onClick={handleNextStep}>
                  Continue to Payment
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Payment Options */}
                <div className="bg-card rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">Payment Options</h2>
                  <div className="space-y-4">
                    <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentType === 'full' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="full"
                        checked={formData.paymentType === 'full'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Full Payment</div>
                          <div className="font-bold text-primary">{formatCurrency(grandTotal)}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">Pay the full amount now including security deposit</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${formData.paymentType === 'partial' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="partial"
                        checked={formData.paymentType === 'partial'}
                        onChange={handleInputChange}
                        className="text-primary focus:ring-primary mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Security Deposit Only</div>
                          <div className="font-bold text-primary">{formatCurrency(securityDeposit)}</div>
                        </div>
                        <div className="text-sm text-muted-foreground">Pay security deposit now, remaining at pickup</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Card Details (Simulated) */}
                <div className="bg-card rounded-xl border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Card Details</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Expiry</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Your payment is secure and encrypted
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button size="lg" className="flex-1" onClick={handleSubmitOrder} disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : `Pay ${formatCurrency(formData.paymentType === 'full' ? grandTotal : securityDeposit)}`}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              {/* Items */}
              <div className="space-y-3 mb-6">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <img
                      src={item.image || '/placeholder.svg'}
                      alt={item.productName}
                      className="w-16 h-16 object-cover rounded-lg bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-6 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {startDate && endDate 
                    ? `${formatDate(startDate)} - ${formatDate(endDate)} (${rentalDays} days)`
                    : 'No dates selected'}
                </span>
              </div>

              {/* Pricing */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18% GST)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span>{formatCurrency(securityDeposit)}</span>
                </div>
                {formData.deliveryType === 'delivery' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>$25.00</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Security deposit is refundable upon return
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CheckoutPage;
