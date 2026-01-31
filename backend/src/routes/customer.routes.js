import express from 'express';
import { authenticateUser } from '../middleware/auth.middleware.js';
import {
  checkout,
  getMyOrders,
  getOrderDetails,
  getMyInvoices,
} from '../controllers/order.controller.esm.js';

const router = express.Router();

router.use(authenticateUser);

router.post('/checkout', checkout);
router.get('/orders', getMyOrders);
router.get('/orders/:id', getOrderDetails);
router.get('/invoices', getMyInvoices);

export default router;
