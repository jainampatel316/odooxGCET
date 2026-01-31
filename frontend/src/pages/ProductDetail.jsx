import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Shield, Truck, Minus, Plus, ShoppingCart, Calendar, Check, AlertCircle } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { productAPI } from '../utils/api';
import { mapBackendProductToFrontend } from '../utils/productMapper';
import { useApp } from '../context/AppContext';
import { formatCurrency, calculateRentalDays, calculateRentalHours, calculateRentalPrice, formatDate } from '../utils/helpers';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Remaining quantity = product stock minus already in cart for this product
const getRemainingQuantity = (product, cart) => {
  if (!product) return 0;
  const available = Number(product.availableQuantity ?? product.quantity ?? product.quantityOnHand ?? 0);
  const totalInCart = cart?.lines
    ?.filter((l) => l.productId === product.id)
    .reduce((sum, l) => sum + (l.quantity ?? 0), 0) ?? 0;
  return Math.max(0, available - totalInCart);
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addToCart, updateCartDates, cart } = useApp();
  const fromAddToCart = location.state?.addToCart === true;
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [rentalPeriodType, setRentalPeriodType] = useState('DAILY'); // HOURLY | DAILY
  const [startDate, setStartDate] = useState(cart.rentalStart ? new Date(cart.rentalStart) : null);
  const [endDate, setEndDate] = useState(cart.rentalEnd ? new Date(cart.rentalEnd) : null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [disabledDates, setDisabledDates] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const isHourly = rentalPeriodType === 'HOURLY';
  const hasHourlyPricing = product && Number(product.pricePerHour) > 0;
  const hasDailyPricing = product && Number(product.pricePerDay) > 0;

  // API: Get single product by ID
  // GET /products/products/:id
  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        // Get single product by ID
        const response = await productAPI.getProductById(id);
        if (response.success && response.data) {
          const mappedProduct = mapBackendProductToFrontend(response.data);
          setProduct(mappedProduct);
        } else {
          setProduct(null);
          toast({
            title: "Error",
            description: "Product not found.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        setProduct(null);
        toast({
          title: "Error",
          description: error.message || "Failed to load product. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Build start/end datetimes for API (hourly: date+time, daily: date at midnight)
  const getStartEndForApi = () => {
    if (!startDate || !endDate) return { start: null, end: null };
    if (isHourly) {
      const start = new Date(`${startDate.toISOString().split('T')[0]}T${startTime}`);
      const end = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}`);
      return { start, end };
    }
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  // Check availability when dates change
  useEffect(() => {
    const checkAvailability = async () => {
      const { start, end } = getStartEndForApi();
      if (!product || !start || !end || end <= start || !id) return;

      setCheckingAvailability(true);
      try {
        const response = await productAPI.checkAvailability(
          id,
          null,
          start.toISOString(),
          end.toISOString(),
          quantity
        );

        if (response.success && response.data) {
          setAvailability(response.data);
          if (!response.data.isAvailable) {
            toast({
              title: "Not Available",
              description: `Only ${response.data.availableQuantity} available for selected period.`,
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Failed to check availability:', error);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [product, startDate, endDate, startTime, endTime, isHourly, quantity, id]);

  const remaining = product ? getRemainingQuantity(product, cart) : 0;

  // Keep quantity in sync with remaining (e.g. after adding to cart)
  useEffect(() => {
    if (remaining >= 1 && quantity > remaining) {
      setQuantity(remaining);
    }
  }, [remaining, quantity]);

  const handleQuantityChange = (delta) => {
    const stockMax = availability?.availableQuantity ?? product?.availableQuantity ?? 1;
    const maxQty = Math.min(Number(stockMax) || 1, remaining || 1);
    const effectiveMax = Math.max(1, maxQty);
    const newQty = Math.max(1, Math.min(quantity + delta, effectiveMax));
    setQuantity(newQty);
  };

  const handleAddToCart = async () => {
    const { start, end } = getStartEndForApi();
    if (!start || !end || end <= start) {
      toast({
        title: "Select period",
        description: isHourly
          ? "Please select start and end date & time (end must be after start)."
          : "Please select rental start and end dates.",
        variant: "destructive",
      });
      return;
    }
    if (isHourly && (!product?.pricePerHour || Number(product.pricePerHour) <= 0)) {
      toast({
        title: "Hourly pricing not available",
        description: "This product does not have hourly rental pricing.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    if (remaining <= 0) {
      toast({
        title: "Cannot add",
        description: "No more of this product available (out of stock or max already in cart).",
        variant: "destructive",
      });
      return;
    }
    const qtyToAdd = Math.min(quantity, remaining);
    await addToCart(product, qtyToAdd, start.toISOString(), end.toISOString(), rentalPeriodType);
    updateCartDates(start.toISOString(), end.toISOString());
  };

  const handleRentNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  const { start: quoteStart, end: quoteEnd } = getStartEndForApi();
  const rentalDays = quoteStart && quoteEnd ? calculateRentalDays(quoteStart, quoteEnd) : 0;
  const rentalHours = quoteStart && quoteEnd ? calculateRentalHours(quoteStart, quoteEnd) : 0;
  const rentalPrice = product && quoteStart && quoteEnd
    ? calculateRentalPrice(product, quoteStart, quoteEnd, rentalPeriodType) * quantity
    : 0;

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="container py-8">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-8" />
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-xl" />
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-12 bg-muted rounded w-1/3 mt-6" />
              </div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="container py-16 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <Link to="/products" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden">
              <img
                src={product.images?.[0] || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbnail placeholders */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 ${i === 0 ? 'border-primary' : 'border-transparent'}`}>
                  <img
                    src={product.images?.[0] || '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover opacity-70"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            {/* Brand & Category */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>{product.attributes?.brand || 'Brand'}</span>
              <span>•</span>
              <span className="capitalize">{product.attributes?.condition || 'Like New'}</span>
            </div>

            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>
            )}

            {/* Description */}
            <p className="text-muted-foreground mb-6">{product.description}</p>

            {/* Pricing */}
            <div className="bg-muted/50 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4">Rental Pricing</h3>
              <div className={`grid gap-4 ${product.pricePerHour > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {product.pricePerHour > 0 && (
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(product.pricePerHour)}</div>
                    <div className="text-sm text-muted-foreground">per hour</div>
                  </div>
                )}
                {product.pricePerDay > 0 && (
                  <div className="text-center p-3 bg-background rounded-lg border-2 border-primary">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(product.pricePerDay)}</div>
                    <div className="text-sm text-muted-foreground">per day</div>
                  </div>
                )}
                {product.pricePerWeek > 0 && (
                  <div className="text-center p-3 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(product.pricePerWeek)}</div>
                    <div className="text-sm text-muted-foreground">per week</div>
                  </div>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="mb-6">
              {fromAddToCart && (
                <p className="text-sm text-primary font-medium mb-3">Select rental period and dates below, then click Add to Cart.</p>
              )}
              <h3 className="font-semibold mb-3">Select Rental Period</h3>
              {(hasHourlyPricing || hasDailyPricing) && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Rent by</label>
                  <div className="flex gap-3">
                    {hasHourlyPricing && (
                      <button
                        type="button"
                        onClick={() => setRentalPeriodType('HOURLY')}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          isHourly ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        Hour (e.g. 3pm 4th Feb → 7pm 7th Feb)
                      </button>
                    )}
                    {hasDailyPricing && (
                      <button
                        type="button"
                        onClick={() => setRentalPeriodType('DAILY')}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          !isHourly ? 'border-primary bg-primary/10 text-primary' : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        Day (e.g. 4th Feb → 5th Feb)
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className={`grid gap-4 ${isHourly ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    {isHourly ? 'Start Date & Time' : 'Start Date'}
                  </label>
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
                        onSelect={setStartDate}
                        disabled={(date) =>
                          date < new Date() ||
                          disabledDates.some(d => d.toDateString() === date.toDateString())
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {isHourly && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    {isHourly ? 'End Date & Time' : 'End Date'}
                  </label>
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
                        onSelect={setEndDate}
                        disabled={(date) =>
                          (startDate && date <= startDate) ||
                          disabledDates.some(d => d.toDateString() === date.toDateString())
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {isHourly && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </div>
              </div>
              {quoteStart && quoteEnd && quoteEnd > quoteStart && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">
                      <Clock className="inline h-4 w-4 mr-1" />
                      {isHourly
                        ? `${rentalHours} hour${rentalHours > 1 ? 's' : ''} rental`
                        : `${rentalDays} day${rentalDays > 1 ? 's' : ''} rental`}
                    </span>
                    <span className="font-bold text-primary">{formatCurrency(rentalPrice)}</span>
                  </div>
                  {checkingAvailability && (
                    <div className="text-xs text-muted-foreground">Checking availability...</div>
                  )}
                  {availability && !checkingAvailability && (
                    <div className={`text-xs ${availability.isAvailable ? 'text-green-600' : 'text-destructive'}`}>
                      {availability.isAvailable
                        ? `✓ ${availability.availableQuantity} available`
                        : `Only ${availability.availableQuantity} available`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-3 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= remaining || remaining <= 0}
                    className="p-3 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {remaining <= 0
                    ? 'None available (out of stock or max in cart)'
                    : availability?.availableQuantity !== undefined
                      ? `${remaining} available to add${startDate && endDate ? ' for selected dates' : ''}`
                      : `${remaining} available to add`}
                </span>
              </div>
            </div>

            {/* Action Buttons - disabled when remaining is 0 or period invalid */}
            <div className="flex gap-3 mb-8">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleRentNow}
                disabled={
                  !product ||
                  remaining <= 0 ||
                  (availability && !availability.isAvailable) ||
                  !quoteStart ||
                  !quoteEnd ||
                  quoteEnd <= quoteStart
                }
              >
                Rent Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={
                  !product ||
                  remaining <= 0 ||
                  (availability && !availability.isAvailable) ||
                  !quoteStart ||
                  !quoteEnd ||
                  quoteEnd <= quoteStart
                }
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Verified</div>
                <div className="text-xs text-muted-foreground">Quality checked</div>
              </div>
              <div className="text-center">
                <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Delivery</div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
              <div className="text-center">
                <Check className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Insured</div>
                <div className="text-xs text-muted-foreground">Protected</div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-bold mb-6">Specifications</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(product.attributes || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between py-3 border-b">
                <span className="text-muted-foreground capitalize">{key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default ProductDetail;
