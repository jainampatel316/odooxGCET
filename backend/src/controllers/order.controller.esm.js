import prisma from '../lib/prisma.js';
import { sendOrderStatusEmail } from '../services/email.service.js';


export const checkout = async (req, res) => {
  try {
    const { quotationId, billingAddressId, shippingAddressId } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lines: true },
    });

    if (!quotation || quotation.customerId !== req.user.id) {
      return res.status(403).json({ message: 'Invalid quotation' });
    }

    const order = await prisma.rentalOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        customerId: req.user.id,
        quotationId: quotation.id,
        status: 'DRAFT',
        billingAddressId,
        shippingAddressId,
        subtotal: quotation.subtotal,
        taxAmount: quotation.taxAmount,
        totalAmount: quotation.totalAmount,
        lines: {
          create: quotation.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            rentalStartDate: line.rentalStartDate,
            rentalEndDate: line.rentalEndDate,
            rentalPeriodType: line.rentalPeriodType,
            rentalDuration: line.rentalDuration,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
          })),
        },
      },
    });

    for (const line of quotation.lines) {
      await prisma.reservation.create({
        data: {
          orderId: order.id,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          startDate: line.rentalStartDate,
          endDate: line.rentalEndDate,
          status: 'ACTIVE',
        },
      });
    }

    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    const fullOrder = await prisma.rentalOrder.findUnique({
      where: { id: order.id },
      include: {
        lines: { include: { product: true, variant: true } },
        billingAddress: true,
        shippingAddress: true,
        customer: { select: { name: true, email: true } },
      },
    });

    // Send Status Email (Async)
    if (fullOrder && fullOrder.customer) {
      await sendOrderStatusEmail(fullOrder.customer.email, fullOrder.customer.name, fullOrder);
    }



    res.status(201).json(fullOrder);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.rentalOrder.findMany({
      where: { customerId: req.user.id },
      include: {
        lines: { include: { product: { select: { name: true, imageUrl: true, images: true } } } },
        pickupRecords: true,
        returnRecords: true,
        invoices: { where: { status: { not: 'DRAFT' } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.rentalOrder.findFirst({
      where: { id, customerId: req.user.id },
      include: {
        lines: { include: { product: true, variant: true } },
        billingAddress: true,
        shippingAddress: true,
        invoices: true,
        pickupRecords: true,
        returnRecords: true,
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyInvoices = async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { customerId: req.user.id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            lines: { include: { product: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
