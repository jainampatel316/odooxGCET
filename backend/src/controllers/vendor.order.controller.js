import prisma from "../lib/prisma.js";

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
        customer: { select: { name: true, email: true, phone: true } },
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

    // 5. Check if Order is fully picked up (if multi-vendor, this logic needs coordination)
    // For now, let's update Order Status if possible
    // (Ideally, a centralized service checks if all vendors have picked up)
    // But we can assume if we are here, we are marking this vendor's portion as done.

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

    res.json({ message: "Return processed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error processing return" });
  }
};