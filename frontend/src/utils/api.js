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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }

    return data;
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

export default authAPI;
