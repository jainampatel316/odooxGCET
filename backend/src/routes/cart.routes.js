import express from 'express';
import { authenticateUser } from '../middleware/auth.middleware.js';
import {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
} from '../controllers/cart.controller.js';

const router = express.Router();

router.use(authenticateUser);

router.get('/', getOrCreateCart);
router.post('/add', addToCart);
router.put('/:lineId', updateCartItem);
router.delete('/:lineId', deleteCartItem);

export default router;
