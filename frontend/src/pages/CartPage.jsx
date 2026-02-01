import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Minus, Plus, Calendar, Clock, ShoppingBag, AlertCircle, CalendarClock, CalendarDays, CalendarRange } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { useApp } from '../context/AppContext';
import { formatCurrency, calculateCartTotal, calculateRentalDays } from '../utils/helpers';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, clearCart, isCartLoading } = useApp();

  // Backend cart uses 'lines' instead of 'items'
  const cartLines = cart?.lines || [];

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [rentalPeriod, setRentalPeriod] = useState('daily'); // hourly, daily, weekly
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const handleDateChange = (type, date) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    // Note: Dates are stored locally and sent during checkout
    // Backend cart doesn't store rental dates in the quotation
  };

  const handleQuantityChange = async (lineId, delta, currentQty) => {
    const newQty = Math.max(1, currentQty + delta);
    await updateCartItem(lineId, newQty);
  };

  const handleRemoveItem = async (lineId, productName) => {
    await removeFromCart(lineId);
    toast({
      title: "Removed from cart",
      description: `${productName} has been removed.`,
    });
  };

  const handleProceedToCheckout = () => {
    // Backend cart: each line has its own dates; no need to select here
    if (cart?.lines?.length > 0) {
      navigate('/checkout');
      return;
    }

    // Legacy cart: require dates
    if (!startDate || !endDate) {
      toast({
        title: "Select dates",
        description: "Please select rental start and end dates.",
        variant: "destructive",
      });
      return;
    }

    // Validate based on rental period
    if (rentalPeriod === 'hourly') {
      if (!startTime || !endTime) {
        toast({
          title: "Select times",
          description: "Please select start and end times for hourly rental.",
          variant: "destructive",
        });
        return;
      }

      const start = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
      const end = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);
      const now = new Date();

      // Check if start time is in the past
      if (start < now) {
        toast({
          title: "Invalid start time",
          description: "Start time cannot be in the past.",
          variant: "destructive",
        });
        return;
      }

      // Check if end is after start
      if (end <= start) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        return;
      }

      // Check minimum duration (1 hour)
      const hours = (end - start) / (1000 * 60 * 60);
      if (hours < 1) {
        toast({
          title: "Duration too short",
          description: "Minimum rental duration is 1 hour.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Daily or Weekly validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Check if start date is in the past
      if (start < today) {
        toast({
          title: "Invalid start date",
          description: "Start date cannot be in the past.",
          variant: "destructive",
        });
        return;
      }

      // Check if end is after start
      if (endDate <= startDate) {
        toast({
          title: "Invalid date range",
          description: "End date must be after start date.",
          variant: "destructive",
        });
        return;
      }

      // Check minimum duration
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      if (rentalPeriod === 'daily' && days < 1) {
        toast({
          title: "Duration too short",
          description: "Minimum rental duration is 1 day.",
          variant: "destructive",
        });
        return;
      }

      if (rentalPeriod === 'weekly' && days < 7) {
        toast({
          title: "Duration too short",
          description: "Minimum rental duration is 1 week (7 days).",
          variant: "destructive",
        });
        return;
      }
    }

    navigate('/checkout');
  };

  const rentalDays = startDate && endDate ? calculateRentalDays(startDate, endDate) : 0;

  // Compute totals from cart lines (no GST)
  const fromLines = cartLines.length > 0 && cartLines.every((l) => l.lineTotal != null);
  const subtotal = fromLines
    ? cartLines.reduce((sum, l) => sum + Number(l.lineTotal ?? 0), 0)
    : Number(cart?.subtotal ?? cart?.subtotalAmount ?? 0);
  const total = subtotal;

  if (cartLines.length === 0) {
    return (
      <CustomerLayout>
        <div className="container py-16 text-center">
          <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground/50 mb-6" />
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link to="/products">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/products" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
            <h1 className="text-3xl font-bold">Your Cart</h1>
            <p className="text-muted-foreground">{cartLines.length} item{cartLines.length > 1 ? 's' : ''} in your cart</p>
          </div>
          <Button variant="outline" onClick={async () => { await clearCart(); toast({ title: "Cart cleared" }); }}>
            Clear Cart
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Rental period is chosen when adding to cart on the product page; only show date picker for legacy cart */}
            {cartLines.length > 0 && !(cart?.lines?.length > 0) && (
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                <div className="flex items-start gap-3 mb-4">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Rental Period</h3>
                    <p className="text-sm text-muted-foreground">Select your rental period and dates</p>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Rental Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'hourly', label: 'Hourly', Icon: CalendarClock },
                      { value: 'daily', label: 'Daily', Icon: CalendarDays },
                      { value: 'weekly', label: 'Weekly', Icon: CalendarRange },
                    ].map((period) => {
                      const IconComponent = period.Icon;
                      return (
                        <button
                          key={period.value}
                          type="button"
                          onClick={() => setRentalPeriod(period.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${rentalPeriod === period.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-primary/50 text-gray-600'
                            }`}
                        >
                          <IconComponent className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-xs font-medium">{period.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {rentalPeriod === 'hourly' ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Start Date & Time</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal mb-2">
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => handleDateChange('start', date)}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              if (date < today) return true;
                              if (endDate && date > endDate) return true;
                              return false;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">End Date & Time</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal mb-2">
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => handleDateChange('end', date)}
                            disabled={(date) => (startDate && date <= startDate)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => handleDateChange('start', date)}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              if (date < today) return true;
                              if (endDate && date > endDate) return true;
                              return false;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => handleDateChange('end', date)}
                            disabled={(date) => startDate && date <= startDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
                {rentalDays > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                    <Clock className="h-4 w-4" />
                    {rentalPeriod === 'hourly' && startDate && endDate && startTime && endTime && (() => {
                      const start = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
                      const end = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);
                      const hours = Math.ceil((end - start) / (1000 * 60 * 60));
                      return `${hours} hour${hours !== 1 ? 's' : ''} rental period`;
                    })()}
                    {rentalPeriod === 'daily' && `${rentalDays} day${rentalDays > 1 ? 's' : ''} rental period`}
                    {rentalPeriod === 'weekly' && `${Math.ceil(rentalDays / 7)} week${Math.ceil(rentalDays / 7) > 1 ? 's' : ''} rental period`}
                  </div>
                )}
              </div>
            )}

            {/* Cart Items List */}
            {cartLines.map((line) => {
              // Backend cart line structure:
              // { id, quotationId, productId, variantId, quantity, unitPrice, totalPrice, product: { name, images, ... } }

              const product = line.product || {};
              const productName = product.name || 'Unknown Product';
              const productImage = product.imageUrl || product.images?.[0] || '/placeholder.svg';
              const unitPrice = parseFloat(line.unitPrice) || 0;
              const lineTotal = parseFloat(line.lineTotal ?? line.totalPrice) || 0;

              return (
                <div key={line.id} className="bg-card rounded-xl border p-4 sm:p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link to={`/products/${line.productId}`}>
                      <img
                        src={productImage}
                        alt={productName}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg bg-muted"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${line.productId}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">{productName}</h3>
                      </Link>

                      {/* Rental Dates */}
                      {(line.rentalStartDate || line.rentalEndDate) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {line.rentalStartDate && format(new Date(line.rentalStartDate), 'MMM dd, yyyy')}
                            {line.rentalStartDate && line.rentalEndDate && ' - '}
                            {line.rentalEndDate && format(new Date(line.rentalEndDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(unitPrice)} per unit
                        {line.rentalPeriodType && line.rentalDuration != null && (
                          <span className="block mt-0.5 text-muted-foreground">
                            {line.rentalPeriodType === 'HOURLY'
                              ? `${line.rentalDuration} hour${line.rentalDuration !== 1 ? 's' : ''} rental`
                              : `${line.rentalDuration} day${line.rentalDuration !== 1 ? 's' : ''} rental`}
                          </span>
                        )}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(line.id, -1, line.quantity)}
                            disabled={line.quantity <= 1 || isCartLoading}
                            className="p-2 hover:bg-muted disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-3 min-w-[2.5rem] text-center font-medium">{line.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(line.id, 1, line.quantity)}
                            disabled={isCartLoading}
                            className="p-2 hover:bg-muted"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(line.id, productName)}
                          disabled={isCartLoading}
                          className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-sm disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(lineTotal)}</div>
                      <div className="text-sm text-muted-foreground">
                        {line.quantity} × {formatCurrency(unitPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>

              {cart?.lines?.length === 0 && (!startDate || !endDate) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg mb-6 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Select rental dates to see pricing</span>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {cart?.lines?.length > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{cartLines.length} line{cartLines.length !== 1 ? 's' : ''}</span>
                  </div>
                ) : (rentalDays > 0 || (rentalPeriod === 'hourly' && startDate && endDate && startTime && endTime)) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>
                      {rentalPeriod === 'hourly' && startDate && endDate && startTime && endTime && (() => {
                        const start = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
                        const end = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);
                        const hours = Math.ceil((end - start) / (1000 * 60 * 60));
                        return `${hours} hour${hours !== 1 ? 's' : ''}`;
                      })()}
                      {rentalPeriod === 'daily' && `${rentalDays} day${rentalDays > 1 ? 's' : ''}`}
                      {rentalPeriod === 'weekly' && `${Math.ceil(rentalDays / 7)} week${Math.ceil(rentalDays / 7) > 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full mb-3"
                onClick={handleProceedToCheckout}
                disabled={
                  cartLines.length === 0 ||
                  (cart?.lines?.length ? false : !startDate || !endDate)
                }
              >
                Proceed to Checkout
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By proceeding, you agree to our Terms of Service and Rental Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CartPage;
