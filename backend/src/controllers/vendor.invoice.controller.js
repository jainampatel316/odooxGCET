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

    // Check if invoice already exists for this order
    const existing = await prisma.invoice.findFirst({ where: { orderId } });
    if (existing) return res.status(400).json({ message: "Invoice already exists" });

    const subtotal = Number(order.subtotal) || 0;
    const taxAmount = Number(order.taxAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;
    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`,
        orderId,
        customerId: order.customerId,
        invoiceType: "RENTAL",
        status: "SENT",
        dueDate: due,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        cgstRate: 9,
        cgstAmount: taxAmount / 2,
        sgstRate: 9,
        sgstAmount: taxAmount / 2,
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
    if (orderIds.length === 0) {
      return res.json([]);
    }

    const invoices = await prisma.invoice.findMany({
      where: { orderId: { in: orderIds } },
      include: {
        order: {
          include: {
            lines: { include: { product: { select: { name: true } } } },
          },
        },
        customer: { select: { name: true, email: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching invoices" });
  }
};