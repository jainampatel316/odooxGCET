// API utility for backend communication

const API_BASE_URL = 'http://localhost:4000';

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    ...options,
  };

  // Merge headers properly
  if (options.headers) {
    defaultOptions.headers = {
      ...defaultOptions.headers,
      ...options.headers,
    };
  }

  try {
    const response = await fetch(url, defaultOptions);
    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    }

    if (!response.ok) {
      throw new Error(data?.message || `Request failed (${response.status})`);
    }

    return data ?? {};
  } catch (error) {
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  // Register a new user
  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Logout user
  logout: async () => {
    return apiCall('/auth/logout', {
      method: 'POST',
    });
  },

  // Forgot Password
  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

// Product API functions
export const productAPI = {
  // Get products with filters
  // Query params: page, limit, search, vendorId, isRentable, status, minPrice, maxPrice, 
  // tags, rentalPeriodType, minRentalPrice, maxRentalPrice, attributes, sortBy, sortOrder
  getProducts: async (queryParams = {}) => {
    const queryString = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          queryString.append(key, value.join(','));
        } else if (typeof value === 'object') {
          queryString.append(key, JSON.stringify(value));
        } else {
          queryString.append(key, value);
        }
      }
    });
    
    const query = queryString.toString();
    // Backend route structure: app.use("/products", productRouter) + productRouter.get('/products', ...)
    // This creates the path: /products/products
    // NOTE: The backend controller is missing prisma import which causes 500 errors
    // This needs to be fixed in backend: add "import prisma from '../lib/prisma.js';" at top of product.controller.js
    const endpoint = `/products/products${query ? `?${query}` : ''}`;
    return apiCall(endpoint, {
      method: 'GET',
    });
  },

  // Get single product by ID
  getProductById: async (id) => {
    // Backend: /products/products/:id
    return apiCall(`/products/products/${id}`, {
      method: 'GET',
    });
  },

  // Get filter options
  getFilterOptions: async () => {
    // Backend: /products/products/filters
    return apiCall('/products/products/filters', {
      method: 'GET',
    });
  },

  // Check product availability (requires authentication)
  checkAvailability: async (productId, variantId, startDate, endDate, quantity = 1) => {
    // Backend: /products/products/check-availability
    return apiCall('/products/products/check-availability', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        variantId,
        startDate,
        endDate,
        quantity,
      }),
    });
  },
};

// Cart & Quotation API functions
export const cartAPI = {
  // Get or create cart (quotation) for current user
  getOrCreateCart: async () => {
    return apiCall('/cart', {
      method: 'GET',
    });
  },

  // Add item to cart
  addToCart: async (productId, variantId, quantity, rentalStartDate, rentalEndDate, rentalPeriodType) => {
    return apiCall('/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        variantId,
        quantity,
        rentalStartDate,
        rentalEndDate,
        rentalPeriodType,
      }),
    });
  },

  // Update cart item quantity
  updateCartItem: async (lineId, quantity) => {
    return apiCall(`/cart/${lineId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  // Delete cart item
  deleteCartItem: async (lineId) => {
    return apiCall(`/cart/${lineId}`, {
      method: 'DELETE',
    });
  },
};

// Order API functions (Customer)
export const orderAPI = {
  // Checkout - convert quotation to order
  checkout: async (quotationId, billingAddressId, shippingAddressId) => {
    return apiCall('/checkout', {
      method: 'POST',
      body: JSON.stringify({
        quotationId,
        billingAddressId,
        shippingAddressId,
      }),
    });
  },

  // Get my orders
  getMyOrders: async () => {
    return apiCall('/orders', {
      method: 'GET',
    });
  },

  // Get order details
  getOrderDetails: async (orderId) => {
    return apiCall(`/orders/${orderId}`, {
      method: 'GET',
    });
  },

  // Get my invoices (customer)
  getMyInvoices: async () => {
    return apiCall('/invoices', { method: 'GET' });
  },
};

// Vendor Order API functions
export const vendorOrderAPI = {
  getVendorOrders: async () => {
    return apiCall('/vendor/orders', { method: 'GET' });
  },

  confirmOrder: async (orderId) => {
    return apiCall(`/vendor/orders/${orderId}/confirm`, { method: 'POST' });
  },

  cancelOrder: async (orderId) => {
    return apiCall(`/vendor/orders/${orderId}/cancel`, { method: 'POST' });
  },

  processPickup: async (orderId, pickupData = {}) => {
    return apiCall(`/vendor/orders/${orderId}/pickup`, {
      method: 'POST',
      body: JSON.stringify(pickupData),
    });
  },

  processReturn: async (orderId, returnData = {}) => {
    return apiCall(`/vendor/orders/${orderId}/return`, {
      method: 'POST',
      body: JSON.stringify(returnData),
    });
  },

  completeOrder: async (orderId) => {
    return apiCall(`/vendor/orders/${orderId}/complete`, { method: 'POST' });
  },
};

// Vendor Invoice API functions
export const vendorInvoiceAPI = {
  // Get vendor's invoices
  getVendorInvoices: async () => {
    return apiCall('/vendor/invoices', {
      method: 'GET',
    });
  },

  // Create invoice for an order
  createInvoice: async (orderId, dueDate) => {
    return apiCall(`/vendor/orders/${orderId}/invoice`, {
      method: 'POST',
      body: JSON.stringify({ dueDate }),
    });
  },
};

// Vendor Dashboard API functions
export const vendorDashboardAPI = {
  // Get vendor statistics
  getStats: async () => {
    return apiCall('/vendor/stats', {
      method: 'GET',
    });
  },
};

// Vendor Product API functions
export const vendorProductAPI = {
  // Get vendor's products
  getVendorProducts: async () => {
    return apiCall('/vendor/products', {
      method: 'GET',
    });
  },

  // Create product
  createProduct: async (productData) => {
    return apiCall('/vendor/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  // Update product
  updateProduct: async (productId, productData) => {
    return apiCall(`/vendor/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  // Add product pricing
  addProductPricing: async (productId, pricingData) => {
    return apiCall(`/vendor/products/${productId}/pricing`, {
      method: 'POST',
      body: JSON.stringify(pricingData),
    });
  },

  // Create product variant
  createVariant: async (productId, variantData) => {
    return apiCall(`/vendor/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variantData),
    });
  },
};

export default authAPI;
