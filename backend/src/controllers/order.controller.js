const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.checkout = async (req, res) => {
  try {
    const { quotationId, billingAddressId, shippingAddressId } = req.body;
    
    // Use serializable transaction to prevent race conditions during checkout
    const order = await prisma.$transaction(
      async (tx) => {
        // 1. Validate Quotation
        const quotation = await tx.quotation.findUnique({
          where: { id: quotationId },
          include: { lines: { include: { product: true } } }
        });
        
        if (!quotation || quotation.customerId !== req.user.id) {
          throw new Error("Invalid quotation");
        }

        // 2. Import inventory service
        const { getAvailableInventory, createReservation } = require('../services/inventory.service.js');

        // 3. Validate Availability for all products (with locks)
        for (const line of quotation.lines) {
          const available = await getAvailableInventory(
            line.productId,
            line.variantId,
            line.rentalStartDate,
            line.rentalEndDate,
            tx
          );
          
          if (available < line.quantity) {
            throw new Error(
              `Insufficient inventory for ${line.product.name}. Available: ${available}, Requested: ${line.quantity}`
            );
          }
        }

        // 4. Create Rental Order
        const newOrder = await tx.rentalOrder.create({
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

        // 5. Create Reservations using inventory service (with proper locking)
        for (const line of quotation.lines) {
          await createReservation({
            orderId: newOrder.id,
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
            startDate: line.rentalStartDate,
            endDate: line.rentalEndDate,
            userId: req.user.id,
            transaction: tx, // Pass transaction to maintain lock
          });
        }

        // 6. Update Quotation Status
        await tx.quotation.update({
          where: { id: quotationId },
          data: { status: 'CONFIRMED', confirmedAt: new Date() }
        });

        return newOrder;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 15000, // 15 seconds for checkout (multiple products)
      }
    );

    res.status(201).json(order);
  } catch (error) {
    console.error('Checkout error:', error);
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