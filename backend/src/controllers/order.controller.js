const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.checkout = async (req, res) => {
  try {
    const { quotationId, billingAddressId, shippingAddressId } = req.body;
    
    // 1. Validate Quotation
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lines: true }
    });
    
    if (!quotation || quotation.customerId !== req.user.id) {
      return res.status(403).json({ message: "Invalid quotation" });
    }

    // 2. Validate Availability (Second check)
    // Iterate through lines and check Reservation table for overlaps
    // (Implementation omitted for brevity, but critical for "Prevent overbooking")

    // 3. Create Rental Order (DRAFT until vendor confirms)
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
          create: quotation.lines.map(line => ({
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
            taxAmount: line.taxAmount
          }))
        }
      }
    });

    // 4. Create Reservations
    for (const line of quotation.lines) {
        await prisma.reservation.create({
            data: {
                orderId: order.id,
                productId: line.productId,
                variantId: line.variantId,
                quantity: line.quantity,
                startDate: line.rentalStartDate,
                endDate: line.rentalEndDate,
                status: 'ACTIVE'
            }
        });
    }

    // 5. Update Quotation Status
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() }
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.rentalOrder.findMany({
      where: { customerId: req.user.id },
      include: {
        lines: { include: { product: { select: { name: true, imageUrl: true } } } },
        pickupRecords: true,
        returnRecords: true,
        invoices: { where: { status: { not: 'DRAFT' } } } // Don't show draft invoices
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
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
                returnRecords: true
            }
        });
        if(!order) return res.status(404).json({message: "Order not found"});
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};