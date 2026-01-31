import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, cartAPI } from '../utils/api';
import { toast } from '@/hooks/use-toast';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartLoading, setIsCartLoading] = useState(false);

  // Initialize on mount - fetch cart from backend
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);

      try {
        // Try to fetch cart from backend (will work if user is authenticated)
        const cartData = await cartAPI.getOrCreateCart();
        // Backend returns cart object directly (no .data wrapper)
        setCart(cartData?.data ?? cartData ?? null);
      } catch (error) {
        // User not authenticated or cart doesn't exist yet
        console.log('No cart found or user not authenticated');
        setCart(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Fetch cart from backend
  const fetchCart = async () => {
    setIsCartLoading(true);
    try {
      const response = await cartAPI.getOrCreateCart();
      const cartData = response?.data ?? response;
      setCart(cartData || null);
      return cartData;
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cart',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCartLoading(false);
    }
  };

  // Add item to cart (rental dates optional: default today to +7 days for quotation pricing)
  const addToCart = async (product, quantity = 1, rentalStartDate, rentalEndDate, rentalPeriodType = 'DAILY') => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to add items to cart',
        variant: 'destructive',
      });
      return null;
    }

    // Default rental period so backend can create quotation with price (today → +7 days)
    let start = rentalStartDate ? new Date(rentalStartDate) : null;
    let end = rentalEndDate ? new Date(rentalEndDate) : null;
    if (!start || !end || end <= start) {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    }
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    setIsCartLoading(true);
    try {
      const response = await cartAPI.addToCart(
        product.id,
        null, // variantId
        quantity,
        startStr,
        endStr,
        rentalPeriodType
      );

      // Backend returns full cart object directly
      setCart(response?.data ?? response ?? null);

      toast({
        title: 'Added to Cart',
        description: `${product.name} added to cart`,
      });

      return response.data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item to cart',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCartLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (lineId) => {
    setIsCartLoading(true);
    try {
      await cartAPI.deleteCartItem(lineId);
      await fetchCart(); // Refresh cart

      toast({
        title: 'Removed from Cart',
        description: 'Item removed from cart',
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove item from cart',
        variant: 'destructive',
      });
    } finally {
      setIsCartLoading(false);
    }
  };

  // Update cart item quantity
  const updateCartItem = async (lineId, quantity) => {
    setIsCartLoading(true);
    try {
      await cartAPI.updateCartItem(lineId, quantity);
      await fetchCart(); // Refresh cart
    } catch (error) {
      console.error('Error updating cart item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update cart item',
        variant: 'destructive',
      });
    } finally {
      setIsCartLoading(false);
    }
  };

  // Clear cart (after checkout)
  const clearCart = async () => {
    setCart(null);
    // Cart will be cleared on backend after successful checkout
  };

  // Login user
  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);

      // Backend returns: { message: "User logged in Successfully", role: "CUSTOMER" }
      // We need to construct a user object from this
      if (response && response.role) {
        const userData = {
          email: email,
          name: email.split('@')[0], // Extract name from email as fallback
          role: response.role,
        };

        setUser(userData);

        // Fetch cart after login
        await fetchCart();

        toast({
          title: 'Login Successful',
          description: response.message || `Welcome back!`,
        });

        return { user: userData };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setCart(null);

      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if backend call fails
      setUser(null);
      setCart(null);
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);

      // Backend returns { message, user } on success
      if (response?.user || response?.message) {
        toast({
          title: 'Registration Successful',
          description: response.message || 'Please login with your credentials',
        });
        return response.user ?? response.data ?? response;
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Get cart items count
  const cartItemsCount = cart?.lines?.reduce((sum, line) => sum + line.quantity, 0) || 0;

  // Get cart total
  const cartTotal = cart?.totalAmount || 0;

  const value = {
    cart,
    user,
    isLoading,
    isCartLoading,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    fetchCart,
    cartItemsCount,
    cartTotal,
    login,
    logout,
    register,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;

