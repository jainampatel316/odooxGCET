const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Import Controllers
const authController = require('../controllers/auth.controller');
const productController = require('../controllers/product.controller');
const quotationController = require('../controllers/quotation.controller');
const orderController = require('../controllers/order.controller');
const paymentController = require('../controllers/payment.controller');

// ============================================
// PUBLIC ROUTES (No Auth)
// ============================================
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);

router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductDetails);
router.get('/products/:id/check-availability', productController.checkAvailability);

// ============================================
// CUSTOMER PROTECTED ROUTES
// ============================================
router.use(authMiddleware); // Apply Auth Middleware to all routes below

// User Profile
router.get('/auth/me', authController.getProfile);

// Cart & Quotations
router.get('/cart', quotationController.getOrCreateCart);
router.post('/cart/add', quotationController.addToCart);
router.put('/cart/:lineId', quotationController.updateCartItem);
router.delete('/cart/:lineId', quotationController.deleteCartItem);

// Orders & Checkout
router.post('/checkout', orderController.checkout);
router.get('/orders', orderController.getMyOrders);
router.get('/orders/:id', orderController.getOrderDetails);

// Payments & Invoices
router.post('/payments', paymentController.createPaymentIntent);
router.get('/invoices', paymentController.getInvoices);
router.get('/invoices/:id/download', paymentController.downloadInvoice);

module.exports = router;