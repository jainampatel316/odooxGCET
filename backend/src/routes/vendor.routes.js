import express from "express";
import { authenticateVendor } from "../middleware/vendorAuth.js";
import * as productController from "../controllers/vendor.product.controller.js";
import * as orderController from "../controllers/vendor.order.controller.js";
import * as invoiceController from "../controllers/vendor.invoice.controller.js";
import * as dashboardController from "../controllers/vendor.dashboard.controller.js";

const router = express.Router();

// All routes require Vendor Authentication
router.use(authenticateVendor);

// --- Dashboard ---
router.get("/stats", dashboardController.getVendorStats);

// --- Products ---
router.get("/products", productController.getVendorProducts);
router.post("/products", productController.createProduct);
router.put("/products/:id", productController.updateProduct);
router.post("/products/:productId/pricing", productController.addProductPricing);
router.post("/products/:productId/variants", productController.createVariant);

// --- Orders ---
// Get orders that contain my products
router.get("/orders", orderController.getVendorOrders);
// Process Pickup
router.post("/orders/:orderId/pickup", orderController.processPickup);
// Process Return
router.post("/orders/:orderId/return", orderController.processReturn);

// --- Invoices ---
router.get("/invoices", invoiceController.getVendorInvoices);
router.post("/orders/:orderId/invoice", invoiceController.createInvoice);

export default router;