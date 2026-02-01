import prisma from "../lib/prisma.js";
import { sendOrderStatusEmail } from "../services/email.service.js";
import { releaseReservation } from "../services/inventory.service.js";


// Get orders containing this vendor's products
export const getVendorOrders = async (req, res) => {
  try {
    // Find Order IDs where lines contain this vendor's products
    const vendorLines = await prisma.orderLine.findMany({
      where: {
        product: { vendorId: req.user.id }
      },
      select: { orderId: true },
      distinct: ["orderId"]
    });

    const orderIds = vendorLines.map(l => l.orderId);

    if (orderIds.length === 0) {
      return res.json([]);
    }

    const orders = await prisma.rentalOrder.findMany({
      where: { id: { in: orderIds } },
      include: {
        customer: { select: { name: true, email: true } },
        lines: {
          where: { product: { vendorId: req.user.id } },
          include: { product: true, variant: true }
        },
        pickupRecords: { where: { status: { not: "CANCELLED" } } },
        returnRecords: { where: { status: { not: "CANCELLED" } } },
        invoices: true,
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching orders" });
  }
};

// Process Pickup
export const processPickup = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { actualPickupDate, pickupLocation, verificationNotes } = req.body;

    // 1. Validate Order contains this vendor's items
    const order = await prisma.rentalOrder.findFirst({
      where: { id: orderId },
      include: { 
        lines: { where: { product: { vendorId: req.user.id } } },
        pickupRecords: true 
      }
    });

    if (!order || order.lines.length === 0) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    // 2. Find or Create Pickup Record (Simplified: assuming one record per order for this demo)
    let pickupRecord = order.pickupRecords[0];

    if (!pickupRecord) {
        pickupRecord = await prisma.pickupRecord.create({
            data: {
                orderId,
                pickupNumber: `PICKUP-${Date.now()}`,
                status: "IN_PROGRESS",
                scheduledDate: order.lines[0].rentalStartDate,
            }
        });
    }

    // 3. Update Pickup Record
    await prisma.pickupRecord.update({
      where: { id: pickupRecord.id },
      data: {
        status: "COMPLETED",
        actualPickupDate: actualPickupDate ? new Date(actualPickupDate) : new Date(),
        pickupLocation,
        verificationNotes,
        verifiedBy: req.user.name,
      }
    });

    // 4. Update Inventory Log (Move to "With Customer")
    for (const line of order.lines) {
        const product = await prisma.product.findUnique({
            where: { id: line.productId },
            select: { quantityOnHand: true },
        });
        const prevQty = product?.quantityOnHand ?? 0;
        const newQty = Math.max(0, prevQty - line.quantity);
        await prisma.inventoryLog.create({
            data: {
                productId: line.productId,
                movementType: "WITH_CUSTOMER",
                quantity: line.quantity,
                referenceType: "order",
                referenceId: orderId,
                previousQty: prevQty,
                newQty,
                notes: "Pickup completed",
                createdBy: req.user.id
            }
        });
        
        // Update actual pickup date on line
        await prisma.orderLine.update({
            where: { id: line.id },
            data: { actualPickupDate: new Date() }
        });
    }

    // 5. Update order status: CONFIRMED → ACTIVE when pickup is completed
    if (order.status === "CONFIRMED" || order.status === "PICKED_UP") {
      const updatedOrder = await prisma.rentalOrder.update({
        where: { id: orderId },
        data: { status: "ACTIVE" },
        include: { 
          customer: { select: { name: true, email: true } },
          lines: { include: { product: true, variant: true } },
          shippingAddress: true,
          billingAddress: true
        }
      });

      await sendOrderStatusEmail(updatedOrder.customer.email, updatedOrder.customer.name, updatedOrder);
    }





    res.json({ message: "Pickup processed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing pickup" });
  }
};

// Process Return
export const processReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { condition, conditionNotes, damageAmount, lateFee } = req.body;

    const order = await prisma.rentalOrder.findFirst({
      where: { id: orderId },
      include: { 
        lines: { where: { product: { vendorId: req.user.id } } },
        returnRecords: true
      }
    });

    if (!order || order.lines.length === 0) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    // 1. Find or Create Return Record
    let returnRecord = order.returnRecords[0];
    if (!returnRecord) {
        returnRecord = await prisma.returnRecord.create({
            data: {
                orderId,
                returnNumber: `RET-${Date.now()}`,
                status: "IN_PROGRESS",
                scheduledDate: order.lines[0].rentalEndDate,
            }
        });
    }

    // 2. Update Return Record
    const isLate = new Date() > new Date(returnRecord.scheduledDate);
    
    await prisma.returnRecord.update({
      where: { id: returnRecord.id },
      data: {
        status: "COMPLETED",
        actualReturnDate: new Date(),
        condition: condition || "GOOD",
        conditionNotes,
        damageAmount: damageAmount || 0,
        lateFee: lateFee || 0,
        isLate,
        verifiedBy: req.user.name,
      }
    });

    // 3. Restore Inventory
    for (const line of order.lines) {
        const product = await prisma.product.findUnique({
            where: { id: line.productId },
            select: { quantityOnHand: true },
        });
        const prevQty = product?.quantityOnHand ?? 0;
        const newQty = prevQty + line.quantity;
        await prisma.inventoryLog.create({
            data: {
                productId: line.productId,
                movementType: "RETURNED",
                quantity: line.quantity,
                referenceType: "order",
                referenceId: orderId,
                previousQty: prevQty,
                newQty,
                notes: "Item returned",
                createdBy: req.user.id
            }
        });

        await prisma.orderLine.update({
            where: { id: line.id },
            data: { actualReturnDate: new Date() }
        });
    }

    // 4. Update Reservation Status
    await prisma.reservation.updateMany({
      where: { orderId },
      data: { status: "COMPLETED" }
    });

    // 5. Update order status: ACTIVE → RETURNED when return is completed
    if (order.status === "ACTIVE" || order.status === "PICKED_UP") {
      const updatedOrder = await prisma.rentalOrder.update({
        where: { id: orderId },
        data: { status: "RETURNED" },
        include: { 
          customer: { select: { name: true, email: true } },
          lines: { include: { product: true, variant: true } },
          shippingAddress: true,
          billingAddress: true
        }
      });

      await sendOrderStatusEmail(updatedOrder.customer.email, updatedOrder.customer.name, updatedOrder);
    }




    // 6. Create invoice for the order (after return) if none exists
    let createdInvoice = null;
    const fullOrder = await prisma.rentalOrder.findUnique({
      where: { id: orderId },
      select: { subtotal: true, taxAmount: true, totalAmount: true, customerId: true },
    });
    const existingInvoice = await prisma.invoice.findFirst({ where: { orderId } });
    if (fullOrder && !existingInvoice) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const subtotal = Number(fullOrder.subtotal) || 0;
      const taxAmount = Number(fullOrder.taxAmount) || 0;
      const totalAmount = Number(fullOrder.totalAmount) || 0;
      createdInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}`,
          orderId,
          customerId: fullOrder.customerId,
          invoiceType: "RENTAL",
          status: "SENT",
          dueDate,
          subtotal,
          taxAmount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
        },
      });
    }

    res.json({ message: "Return processed successfully", invoice: createdInvoice });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing return" });
  }
};

// Confirm order (vendor accepts): DRAFT → CONFIRMED
export const confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.rentalOrder.findFirst({
      where: { id: orderId },
      include: { lines: { where: { product: { vendorId: req.user.id } } } },
    });
    if (!order || order.lines.length === 0) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }
    if (order.status !== "DRAFT") {
      return res.status(400).json({ message: "Only draft orders can be confirmed" });
    }
    const updatedOrder = await prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
      include: { 
        customer: { select: { name: true, email: true } },
        lines: { include: { product: true, variant: true } },
        shippingAddress: true,
        billingAddress: true
      }
    });

    console.log(`[ConfirmOrder] Order ${orderId} status updated to CONFIRMED. Customer:`, updatedOrder.customer);

    if (updatedOrder.customer && updatedOrder.customer.email) {
      await sendOrderStatusEmail(updatedOrder.customer.email, updatedOrder.customer.name, updatedOrder);
    } else {
      console.warn(`[ConfirmOrder] No customer email found for order ${orderId}, skipping email.`);
    }


    res.json({ message: "Order confirmed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error confirming order" });
  }
};

// Cancel order: DRAFT or CONFIRMED → CANCELLED
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Get order with all related data
      const order = await tx.rentalOrder.findFirst({
        where: { id: orderId },
        include: {
          lines: {
            where: { product: { vendorId: req.user.id } },
            include: { product: true },
          },
          payments: { where: { status: 'COMPLETED' } },
          invoices: true,
          reservations: { where: { status: { in: ['PENDING', 'ACTIVE'] } } },
        },
      });

      if (!order || order.lines.length === 0) {
        throw new Error("Order not found or unauthorized");
      }

      if (order.status !== "DRAFT" && order.status !== "CONFIRMED") {
        throw new Error("Only draft or confirmed orders can be cancelled");
      }

      // 1. Update order status to CANCELLED
      const updatedOrder = await tx.rentalOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: { 
          customer: { select: { name: true, email: true } },
          lines: { include: { product: true, variant: true } },
          shippingAddress: true,
          billingAddress: true
        }
      });

      await sendOrderStatusEmail(updatedOrder.customer.email, updatedOrder.customer.name, updatedOrder);




      // 2. Release all reservations for this order
      for (const reservation of order.reservations) {
        try {
          await releaseReservation(reservation.id, req.user.id, 'Order cancelled');
        } catch (error) {
          console.error(`Failed to release reservation ${reservation.id}:`, error);
        }
      }


      // 3. Create refund payments for completed payments
      for (const payment of order.payments) {
        await tx.payment.create({
          data: {
            paymentNumber: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            orderId: order.id,
            invoiceId: payment.invoiceId,
            customerId: order.customerId,
            amount: payment.amount, // Refund full amount
            method: payment.method,
            status: 'REFUNDED',
            paymentDate: new Date(),
            notes: `Refund for cancelled order ${order.orderNumber}. Original payment: ${payment.paymentNumber}`,
            referenceNumber: payment.paymentNumber, // Reference to original payment
          },
        });
      }

      // 4. Update invoice status to CANCELLED
      for (const invoice of order.invoices) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'CANCELLED',
            balanceAmount: 0, // Clear balance
          },
        });
      }

      // 5. Log activity
      await tx.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'ORDER_CANCELLED',
          entityType: 'RentalOrder',
          entityId: order.id,
          description: `Order ${order.orderNumber} cancelled. Refund amount: ₹${order.totalAmount}`,
          metadata: {
            orderNumber: order.orderNumber,
            refundAmount: order.totalAmount.toString(),
            paymentsRefunded: order.payments.length,
            reservationsReleased: order.reservations.length,
          },
        },
      });
    });

    res.json({
      message: "Order cancelled successfully",
      details: "Reservations released and refunds processed"
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: error.message || "Error cancelling order" });
  }
};

// Complete order (invoice/payments done): RETURNED → COMPLETED
export const completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.rentalOrder.findFirst({
      where: { id: orderId },
      include: { lines: { where: { product: { vendorId: req.user.id } } } },
    });
    if (!order || order.lines.length === 0) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }
    if (order.status !== "RETURNED") {
      return res.status(400).json({ message: "Only returned orders can be marked complete" });
    }
    const updatedOrder = await prisma.rentalOrder.update({
      where: { id: orderId },
      data: { status: "COMPLETED" },
      include: { 
        customer: { select: { name: true, email: true } },
        lines: { include: { product: true, variant: true } },
        shippingAddress: true,
        billingAddress: true
      }
    });

    await sendOrderStatusEmail(updatedOrder.customer.email, updatedOrder.customer.name, updatedOrder);



    res.json({ message: "Order completed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error completing order" });
  }
};