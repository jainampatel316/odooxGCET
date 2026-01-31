// LocalStorage utilities for persisting rental system data

const STORAGE_KEYS = {
  PRODUCTS: 'rental_products',
  CART: 'rental_cart',
  QUOTATIONS: 'rental_quotations',
  ORDERS: 'rental_orders',
  INVOICES: 'rental_invoices',
  USERS: 'rental_users',
  VENDORS: 'rental_vendors',
  CURRENT_USER: 'rental_current_user',
  RESERVATIONS: 'rental_reservations',
};

// Generic storage functions
export const getItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return null;
  }
};

export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage: ${key}`, error);
    return false;
  }
};

export const removeItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
    return false;
  }
};

// Product functions
export const getProducts = () => getItem(STORAGE_KEYS.PRODUCTS) || [];
export const setProducts = (products) => setItem(STORAGE_KEYS.PRODUCTS, products);
export const addProduct = (product) => {
  const products = getProducts();
  products.push(product);
  setProducts(products);
  return product;
};
export const updateProduct = (productId, updates) => {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === productId);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates };
    setProducts(products);
    return products[index];
  }
  return null;
};
export const deleteProduct = (productId) => {
  const products = getProducts().filter((p) => p.id !== productId);
  setProducts(products);
};

// Cart functions
export const getCart = () => getItem(STORAGE_KEYS.CART) || { items: [], rentalStart: null, rentalEnd: null };
export const setCart = (cart) => setItem(STORAGE_KEYS.CART, cart);
export const clearCart = () => removeItem(STORAGE_KEYS.CART);
export const addToCart = (product, quantity = 1) => {
  const cart = getCart();
  const existingItem = cart.items.find((item) => item.productId === product.id);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId: product.id,
      productName: product.name,
      quantity,
      pricePerHour: product.pricePerHour,
      pricePerDay: product.pricePerDay,
      pricePerWeek: product.pricePerWeek,
      image: product.images?.[0] || '/placeholder.svg',
    });
  }
  setCart(cart);
  return cart;
};
export const removeFromCart = (productId) => {
  const cart = getCart();
  cart.items = cart.items.filter((item) => item.productId !== productId);
  setCart(cart);
  return cart;
};
export const updateCartItem = (productId, quantity) => {
  const cart = getCart();
  const item = cart.items.find((i) => i.productId === productId);
  if (item) {
    item.quantity = quantity;
    setCart(cart);
  }
  return cart;
};
export const updateCartDates = (startDate, endDate) => {
  const cart = getCart();
  cart.rentalStart = startDate;
  cart.rentalEnd = endDate;
  setCart(cart);
  return cart;
};

// Quotation functions
export const getQuotations = () => getItem(STORAGE_KEYS.QUOTATIONS) || [];
export const setQuotations = (quotations) => setItem(STORAGE_KEYS.QUOTATIONS, quotations);
export const addQuotation = (quotation) => {
  const quotations = getQuotations();
  quotations.push(quotation);
  setQuotations(quotations);
  return quotation;
};
export const updateQuotation = (quotationId, updates) => {
  const quotations = getQuotations();
  const index = quotations.findIndex((q) => q.id === quotationId);
  if (index !== -1) {
    quotations[index] = { ...quotations[index], ...updates };
    setQuotations(quotations);
    return quotations[index];
  }
  return null;
};

// Order functions
export const getOrders = () => getItem(STORAGE_KEYS.ORDERS) || [];
export const setOrders = (orders) => setItem(STORAGE_KEYS.ORDERS, orders);
export const addOrder = (order) => {
  const orders = getOrders();
  orders.push(order);
  setOrders(orders);
  return order;
};
export const updateOrder = (orderId, updates) => {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates };
    setOrders(orders);
    return orders[index];
  }
  return null;
};

// Invoice functions
export const getInvoices = () => getItem(STORAGE_KEYS.INVOICES) || [];
export const setInvoices = (invoices) => setItem(STORAGE_KEYS.INVOICES, invoices);
export const addInvoice = (invoice) => {
  const invoices = getInvoices();
  invoices.push(invoice);
  setInvoices(invoices);
  return invoice;
};
export const updateInvoice = (invoiceId, updates) => {
  const invoices = getInvoices();
  const index = invoices.findIndex((i) => i.id === invoiceId);
  if (index !== -1) {
    invoices[index] = { ...invoices[index], ...updates };
    setInvoices(invoices);
    return invoices[index];
  }
  return null;
};

// User functions
export const getUsers = () => getItem(STORAGE_KEYS.USERS) || [];
export const setUsers = (users) => setItem(STORAGE_KEYS.USERS, users);
export const getCurrentUser = () => getItem(STORAGE_KEYS.CURRENT_USER);
export const setCurrentUser = (user) => setItem(STORAGE_KEYS.CURRENT_USER, user);
export const clearCurrentUser = () => removeItem(STORAGE_KEYS.CURRENT_USER);

// Vendor functions
export const getVendors = () => getItem(STORAGE_KEYS.VENDORS) || [];
export const setVendors = (vendors) => setItem(STORAGE_KEYS.VENDORS, vendors);
export const addVendor = (vendor) => {
  const vendors = getVendors();
  vendors.push(vendor);
  setVendors(vendors);
  return vendor;
};
export const updateVendor = (vendorId, updates) => {
  const vendors = getVendors();
  const index = vendors.findIndex((v) => v.id === vendorId);
  if (index !== -1) {
    vendors[index] = { ...vendors[index], ...updates };
    setVendors(vendors);
    return vendors[index];
  }
  return null;
};

// Reservation functions (to prevent double booking)
export const getReservations = () => getItem(STORAGE_KEYS.RESERVATIONS) || [];
export const setReservations = (reservations) => setItem(STORAGE_KEYS.RESERVATIONS, reservations);
export const addReservation = (reservation) => {
  const reservations = getReservations();
  reservations.push(reservation);
  setReservations(reservations);
  return reservation;
};
export const removeReservation = (reservationId) => {
  const reservations = getReservations().filter((r) => r.id !== reservationId);
  setReservations(reservations);
};
export const isProductAvailable = (productId, startDate, endDate, quantity = 1) => {
  const reservations = getReservations();
  const products = getProducts();
  const product = products.find((p) => p.id === productId);
  
  if (!product) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Count reserved quantity for overlapping dates
  let reservedQuantity = 0;
  reservations.forEach((res) => {
    if (res.productId === productId) {
      const resStart = new Date(res.startDate);
      const resEnd = new Date(res.endDate);
      // Check for date overlap
      if (start <= resEnd && end >= resStart) {
        reservedQuantity += res.quantity;
      }
    }
  });
  
  return (product.quantity - reservedQuantity) >= quantity;
};

// Initialize with sample data if empty
export const initializeStorage = (sampleData) => {
  if (getProducts().length === 0 && sampleData.sampleProducts) {
    setProducts(sampleData.sampleProducts);
  }
  if (getVendors().length === 0 && sampleData.sampleVendors) {
    setVendors(sampleData.sampleVendors);
  }
  if (getUsers().length === 0 && sampleData.sampleUsers) {
    setUsers(sampleData.sampleUsers);
  }
  if (getOrders().length === 0 && sampleData.sampleOrders) {
    setOrders(sampleData.sampleOrders);
  }
  if (getQuotations().length === 0 && sampleData.sampleQuotations) {
    setQuotations(sampleData.sampleQuotations);
  }
  if (getInvoices().length === 0 && sampleData.sampleInvoices) {
    setInvoices(sampleData.sampleInvoices);
  }
};

export default {
  STORAGE_KEYS,
  getItem,
  setItem,
  removeItem,
  getProducts,
  setProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getCart,
  setCart,
  clearCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  updateCartDates,
  getQuotations,
  setQuotations,
  addQuotation,
  updateQuotation,
  getOrders,
  setOrders,
  addOrder,
  updateOrder,
  getInvoices,
  setInvoices,
  addInvoice,
  updateInvoice,
  getUsers,
  setUsers,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  getVendors,
  setVendors,
  addVendor,
  updateVendor,
  getReservations,
  setReservations,
  addReservation,
  removeReservation,
  isProductAvailable,
  initializeStorage,
};
