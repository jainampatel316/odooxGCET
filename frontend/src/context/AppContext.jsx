import { createContext, useContext, useState, useEffect } from 'react';
import { initializeStorage, getCart, setCart, getProducts, getCurrentUser, setCurrentUser, clearCurrentUser } from '../utils/storage';
import mockData from '../data/mockData';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [cart, setCartState] = useState({ items: [], rentalStart: null, rentalEnd: null });
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize on mount
  useEffect(() => {
    initializeStorage(mockData);
    const savedCart = getCart();
    const savedUser = getCurrentUser();
    setCartState(savedCart);
    setUser(savedUser);
    setIsLoading(false);
  }, []);

  // Update cart
  const updateCart = (newCart) => {
    setCartState(newCart);
    setCart(newCart);
  };

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    const updatedCart = { ...cart };
    const existingItem = updatedCart.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      updatedCart.items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        pricePerHour: product.pricePerHour,
        pricePerDay: product.pricePerDay,
        pricePerWeek: product.pricePerWeek,
        image: product.images?.[0] || '/placeholder.svg',
      });
    }
    
    updateCart(updatedCart);
    return updatedCart;
  };

  // Remove item from cart
  const removeFromCart = (productId) => {
    const updatedCart = {
      ...cart,
      items: cart.items.filter(item => item.productId !== productId),
    };
    updateCart(updatedCart);
    return updatedCart;
  };

  // Update cart item quantity
  const updateCartItem = (productId, quantity) => {
    const updatedCart = { ...cart };
    const item = updatedCart.items.find(i => i.productId === productId);
    if (item) {
      item.quantity = quantity;
    }
    updateCart(updatedCart);
    return updatedCart;
  };

  // Update cart dates
  const updateCartDates = (startDate, endDate) => {
    const updatedCart = {
      ...cart,
      rentalStart: startDate,
      rentalEnd: endDate,
    };
    updateCart(updatedCart);
    return updatedCart;
  };

  // Clear cart
  const clearCart = () => {
    const emptyCart = { items: [], rentalStart: null, rentalEnd: null };
    updateCart(emptyCart);
  };

  // Login user
  const login = (userData) => {
    setUser(userData);
    setCurrentUser(userData);
  };

  // Logout user
  const logout = () => {
    setUser(null);
    clearCurrentUser();
  };

  // Get cart items count
  const cartItemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    user,
    isLoading,
    addToCart,
    removeFromCart,
    updateCartItem,
    updateCartDates,
    clearCart,
    cartItemsCount,
    login,
    logout,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;
