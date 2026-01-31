// Helper utilities for Rental Management System

// Simulate async delay for fake API calls
export const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
};

// Format date range
export const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  return `${start} - ${end}`;
};

// Calculate rental days between dates
export const calculateRentalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1); // Minimum 1 day
};

// Calculate rental hours between start and end (for hourly pricing)
export const calculateRentalHours = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  return Math.max(hours, 1); // Minimum 1 hour
};

// Calculate rental price based on duration and period type (HOURLY or DAILY)
// product should have pricePerHour, pricePerDay (and optionally pricePerWeek)
export const calculateRentalPrice = (product, startDate, endDate, rentalPeriodType = 'DAILY') => {
  const periodType = (rentalPeriodType || 'DAILY').toUpperCase();
  const isHourly = periodType === 'HOURLY';

  if (isHourly) {
    const hours = calculateRentalHours(startDate, endDate);
    const pricePerHour = Number(product?.pricePerHour) || 0;
    return hours * pricePerHour;
  }

  const days = calculateRentalDays(startDate, endDate);
  // Use weekly rate if 7+ days and available
  if (days >= 7 && product?.pricePerWeek) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    const pricePerDay = Number(product?.pricePerDay) || 0;
    const pricePerWeek = Number(product?.pricePerWeek) || 0;
    return weeks * pricePerWeek + remainingDays * pricePerDay;
  }

  const pricePerDay = Number(product?.pricePerDay) || 0;
  return days * pricePerDay;
};

// Calculate cart total
export const calculateCartTotal = (items, startDate, endDate) => {
  const days = calculateRentalDays(startDate, endDate);
  
  let subtotal = 0;
  items.forEach(item => {
    if (days >= 7 && item.pricePerWeek) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      subtotal += ((weeks * item.pricePerWeek) + (remainingDays * item.pricePerDay)) * item.quantity;
    } else {
      subtotal += item.pricePerDay * days * item.quantity;
    }
  });
  
  const taxRate = 0.18; // 18% GST
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  return { subtotal, tax, total, days };
};

// Generate order number
export const generateOrderNumber = () => {
  const prefix = 'RO';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Generate invoice number
export const generateInvoiceNumber = () => {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}-${random}`;
};

// Generate quotation number
export const generateQuotationNumber = () => {
  const prefix = 'QT';
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}`;
};

// Get status badge class
export const getStatusBadgeClass = (status) => {
  const statusMap = {
    draft: 'badge-draft',
    pending: 'badge-pending',
    sent: 'badge-pending',
    confirmed: 'badge-confirmed',
    completed: 'badge-completed',
    active: 'badge-confirmed',
    picked_up: 'badge-confirmed',
    returned: 'badge-pending',
    overdue: 'badge-overdue',
    cancelled: 'badge-cancelled',
    paid: 'badge-confirmed',
    partial: 'badge-pending',
    unpaid: 'badge-overdue',
  };
  return statusMap[status?.toLowerCase()] || 'badge-draft';
};

// Get status display text (order status: draft, confirmed, picked_up, active, returned, completed, cancelled)
export const getStatusDisplayText = (status) => {
  const orderStatusMap = {
    draft: 'Draft',
    confirmed: 'Confirmed',
    picked_up: 'Picked up',
    active: 'Active',
    returned: 'Returned',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const s = status?.toLowerCase?.();
  if (orderStatusMap[s]) return orderStatusMap[s];
  return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate GSTIN
export const isValidGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// Validate phone
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

// Get initials from name
export const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Check if date range overlaps
export const datesOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  return s1 <= e2 && e1 >= s2;
};

// Get disabled dates for date picker (already booked)
export const getDisabledDates = (reservations, productId) => {
  const disabledDates = [];
  const productReservations = reservations.filter(r => r.productId === productId);
  
  productReservations.forEach(reservation => {
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const current = new Date(start);
    
    while (current <= end) {
      disabledDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  });
  
  return disabledDates;
};

// Sort products
export const sortProducts = (products, sortBy) => {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => a.pricePerDay - b.pricePerDay);
    case 'price-high':
      return sorted.sort((a, b) => b.pricePerDay - a.pricePerDay);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
};

// Filter products
export const filterProducts = (products, filters) => {
  let filtered = [...products];
  
  if (filters.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  
  if (filters.priceMin !== undefined) {
    filtered = filtered.filter(p => p.pricePerDay >= filters.priceMin);
  }
  
  if (filters.priceMax !== undefined) {
    filtered = filtered.filter(p => p.pricePerDay <= filters.priceMax);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower)
    );
  }
  
  if (filters.inStock) {
    filtered = filtered.filter(p => p.availableQuantity > 0);
  }
  
  return filtered;
};

export default {
  delay,
  formatCurrency,
  formatDate,
  formatDateRange,
  calculateRentalDays,
  calculateRentalHours,
  calculateRentalPrice,
  calculateCartTotal,
  generateOrderNumber,
  generateInvoiceNumber,
  generateQuotationNumber,
  getStatusBadgeClass,
  getStatusDisplayText,
  isValidEmail,
  isValidGSTIN,
  isValidPhone,
  truncateText,
  getInitials,
  datesOverlap,
  getDisabledDates,
  sortProducts,
  filterProducts,
};
