import express from 'express';
import {
  getProducts,
  getProductById,
  getFilterOptions,
  checkProductAvailability,
} from '../controllers/product.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const productRouter = express.Router();

// Public routes (or authenticated customer routes)
productRouter.get('/products', getProducts);
productRouter.get('/products/filters', getFilterOptions);
productRouter.get('/products/:id', getProductById);

// Authenticated routes
productRouter.post('/products/check-availability', authenticateUser, checkProductAvailability);

export default productRouter;