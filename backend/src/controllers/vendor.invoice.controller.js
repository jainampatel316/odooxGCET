import prisma from "../lib/prisma.js";

// Create Invoice for an Order
export const createInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { dueDate } = req.body;

    // Verify Order contains vendor's products
    const order = await prisma.rentalOrder.findFirst({
      where: { id: orderId },
      include: { lines: { where: { product: { vendorId: req.user.id } } } }
    });

    if (!order || order.lines.length === 0) {
      return res.status(403).json({ message: "Unauthorized or no items to invoice" });
    }

    // Check if invoice already exists for this order (Simplified logic)
    const existing = await prisma.invoice.findFirst({ where: { orderId } });
    if (existing) return res.status(400).json({ message: "Invoice already exists" });

    // Calculate totals (Simplified: using total from order, in reality you calculate only vendor's portion)
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`, // Simple generation
        orderId,
        customerId: order.customerId,
        invoiceType: "RENTAL",
        status: "SENT",
        dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: order.subtotal, // Note: Should filter by vendor items in a multi-vendor scenario
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        // GST Logic
        cgstRate: 9,
        cgstAmount: Number(order.taxAmount) / 2,
        sgstRate: 9,
        sgstAmount: Number(order.taxAmount) / 2,
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating invoice" });
  }
};

// Get Vendor's Invoices
export const getVendorInvoices = async (req, res) => {
  try {
    // Get all invoices associated with orders containing this vendor's products
    const vendorLines = await prisma.orderLine.findMany({
      where: { product: { vendorId: req.user.id } },
      select: { orderId: true },
      distinct: ["orderId"]
    });
    
    const orderIds = vendorLines.map(l => l.orderId);

    const invoices = await prisma.invoice.findMany({
      where: { orderId: { in: orderIds } },
      include: {
        order: true,
        customer: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching invoices" });
  }
};