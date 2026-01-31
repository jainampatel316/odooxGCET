import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Minus, Plus, Calendar, Clock, ShoppingBag, AlertCircle } from 'lucide-react';
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
  const { cart, updateCartItem, removeFromCart, updateCartDates, clearCart } = useApp();
  
  const [startDate, setStartDate] = useState(cart.rentalStart ? new Date(cart.rentalStart) : null);
  const [endDate, setEndDate] = useState(cart.rentalEnd ? new Date(cart.rentalEnd) : null);

  const handleDateChange = (type, date) => {
    if (type === 'start') {
      setStartDate(date);
      if (date && endDate) {
        updateCartDates(date.toISOString(), endDate.toISOString());
      }
    } else {
      setEndDate(date);
      if (startDate && date) {
        updateCartDates(startDate.toISOString(), date.toISOString());
      }
    }
  };

  const handleQuantityChange = (productId, delta, currentQty) => {
    const newQty = Math.max(1, currentQty + delta);
    updateCartItem(productId, newQty);
  };

  const handleRemoveItem = (productId, productName) => {
    removeFromCart(productId);
    toast({
      title: "Removed from cart",
      description: `${productName} has been removed.`,
    });
  };

  const handleProceedToCheckout = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Select dates",
        description: "Please select rental start and end dates.",
        variant: "destructive",
      });
      return;
    }
    navigate('/checkout');
  };

  const rentalDays = startDate && endDate ? calculateRentalDays(startDate, endDate) : 0;
  const { subtotal, tax, total } = startDate && endDate && cart.items.length > 0
    ? calculateCartTotal(cart.items, startDate, endDate)
    : { subtotal: 0, tax: 0, total: 0 };

  if (cart.items.length === 0) {
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
            <p className="text-muted-foreground">{cart.items.length} item{cart.items.length > 1 ? 's' : ''} in your cart</p>
          </div>
          <Button variant="outline" onClick={() => { clearCart(); toast({ title: "Cart cleared" }); }}>
            Clear Cart
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Date Selection Banner */}
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold">Rental Period</h3>
                  <p className="text-sm text-muted-foreground">Select your rental dates for all items</p>
                </div>
              </div>
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
                        disabled={(date) => date < new Date()}
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
              {rentalDays > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                  <Clock className="h-4 w-4" />
                  {rentalDays} day{rentalDays > 1 ? 's' : ''} rental period
                </div>
              )}
            </div>

            {/* Cart Items List */}
            {cart.items.map((item) => {
              const itemTotal = rentalDays > 0 
                ? (rentalDays >= 7 && item.pricePerWeek 
                    ? (Math.floor(rentalDays / 7) * item.pricePerWeek + (rentalDays % 7) * item.pricePerDay) * item.quantity
                    : item.pricePerDay * rentalDays * item.quantity)
                : 0;
              
              return (
                <div key={item.productId} className="bg-card rounded-xl border p-4 sm:p-6">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link to={`/products/${item.productId}`}>
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.productName}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg bg-muted"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/products/${item.productId}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">{item.productName}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(item.pricePerDay)}/day
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(item.productId, -1, item.quantity)}
                            disabled={item.quantity <= 1}
                            className="p-2 hover:bg-muted disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-3 min-w-[2.5rem] text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, 1, item.quantity)}
                            className="p-2 hover:bg-muted"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.productId, item.productName)}
                          className="text-destructive hover:text-destructive/80 flex items-center gap-1 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(itemTotal)}</div>
                      {rentalDays > 0 && (
                        <div className="text-sm text-muted-foreground">for {rentalDays} day{rentalDays > 1 ? 's' : ''}</div>
                      )}
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

              {(!startDate || !endDate) && (
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
                {rentalDays > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{rentalDays} day{rentalDays > 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (18% GST)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
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
                disabled={!startDate || !endDate}
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
