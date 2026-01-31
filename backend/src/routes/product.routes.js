import express from 'express';
import {
  getProducts,
  getProductById,
  getFilterOptions,
  checkProductAvailability,
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';

const productRouter = express.Router();

// Public routes (or authenticated customer routes)
router.get('/products', getProducts);
router.get('/products/filters', getFilterOptions);
router.get('/products/:id', getProductById);

// Authenticated routes
router.post('/products/check-availability', authenticate, checkProductAvailability);

export default productRouter;