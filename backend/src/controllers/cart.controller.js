import prisma from '../lib/prisma.js';

// Helper to calculate line price: duration × unit price for the given period type (HOURLY or DAILY)
const calculateRentalPrice = (duration, pricingRules, periodType = 'DAILY') => {
  if (!pricingRules || pricingRules.length === 0) return 0;
  const rule = pricingRules.find((r) => r.periodType === periodType);
  const unitPrice = rule ? Number(rule.price) || 0 : 0;
  return unitPrice * duration;
};

export const getOrCreateCart = async (req, res) => {
  try {
    let cart = await prisma.quotation.findFirst({
      where: { customerId: req.user.id, status: 'DRAFT' },
      include: { lines: { include: { product: true, variant: true } } },
    });

    if (!cart) {
      cart = await prisma.quotation.create({
        data: {
          customerId: req.user.id,
          quotationNumber: `QT-${Date.now()}`,
          status: 'DRAFT',
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        include: { lines: { include: { product: true, variant: true } } },
      });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity, rentalStartDate, rentalEndDate, rentalPeriodType } = req.body;
    const periodType = (rentalPeriodType || 'DAILY').toUpperCase();
    const isHourly = periodType === 'HOURLY';

    // Use serializable transaction to prevent race conditions
    const updatedCart = await prisma.$transaction(
      async (tx) => {
        // Get or find cart
        const cart = await tx.quotation.findFirst({
          where: { customerId: req.user.id, status: 'DRAFT' },
        });

        if (!cart) {
          throw new Error('No active cart found');
        }

        // Get product with lock (within transaction)
        const product = await tx.product.findUnique({
          where: { id: productId },
          include: { rentalPricing: true },
        });

        if (!product) {
          throw new Error('Product not found');
        }

        const requestedQty = Math.max(1, Number(quantity) || 1);
        
        // Import getAvailableInventory at the top of the file
        const { getAvailableInventory } = await import('../services/inventory.service.js');
        
        // Check availability using inventory service (considers reservations)
        const start = new Date(rentalStartDate);
        const end = new Date(rentalEndDate);
        const available = await getAvailableInventory(productId, variantId, start, end, tx);
        
        // Check existing cart items
        const existingLines = await tx.quotationLine.findMany({
          where: { quotationId: cart.id, productId },
          select: { quantity: true },
        });
        const totalInCart = existingLines.reduce((sum, l) => sum + (l.quantity || 0), 0);
        const remaining = Math.max(0, available - totalInCart);
        
        if (remaining <= 0) {
          throw new Error('Product is out of stock or maximum quantity already in cart');
        }
        if (requestedQty > remaining) {
          throw new Error(`Only ${remaining} available. You already have ${totalInCart} in cart.`);
        }

        const duration = isHourly
          ? Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)))
          : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

        // Use rental pricing for the selected period type (HOURLY or DAILY); fallback to sales price × duration
        let unitPrice = calculateRentalPrice(duration, product.rentalPricing || [], periodType);
        if (unitPrice <= 0) {
          const salesPrice = Number(product.salesPrice) || 0;
          unitPrice = isHourly ? salesPrice * duration : salesPrice * duration;
        }
        const lineTotal = unitPrice * requestedQty;

        // Create cart line
        await tx.quotationLine.create({
          data: {
            quotationId: cart.id,
            productId,
            variantId: variantId || null,
            quantity: requestedQty,
            rentalStartDate: start,
            rentalEndDate: end,
            rentalPeriodType: periodType,
            rentalDuration: duration,
            unitPrice,
            lineTotal,
            taxRate: 0,
            taxAmount: 0,
          },
        });

        // Update cart totals
        await tx.quotation.update({
          where: { id: cart.id },
          data: {
            subtotal: { increment: lineTotal },
            taxAmount: { increment: 0 },
            totalAmount: { increment: lineTotal },
          },
        });

        // Return full cart
        return await tx.quotation.findFirst({
          where: { id: cart.id },
          include: { lines: { include: { product: true, variant: true } } },
        });
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    res.status(201).json(updatedCart);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { lineId } = req.params;
    const { quantity } = req.body;

    const line = await prisma.quotationLine.findUnique({
      where: { id: lineId },
      include: { quotation: true, product: true },
    });

    if (!line) return res.status(404).json({ message: 'Line not found' });
    if (line.quotation.customerId !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    const requestedQty = Math.max(1, Number(quantity) || 1);
    const available = Number(line.product?.quantityOnHand) ?? 0;
    const otherLinesForProduct = await prisma.quotationLine.findMany({
      where: { quotationId: line.quotationId, productId: line.productId, id: { not: lineId } },
      select: { quantity: true },
    });
    const totalOther = otherLinesForProduct.reduce((sum, l) => sum + (l.quantity || 0), 0);
    if (totalOther + requestedQty > available) {
      return res.status(400).json({
        message: `Only ${available} available. Other items in cart: ${totalOther}. Max for this line: ${Math.max(0, available - totalOther)}`,
      });
    }

    const newLineTotal = Number(line.unitPrice) * requestedQty;

    await prisma.quotationLine.update({
      where: { id: lineId },
      data: {
        quantity: requestedQty,
        lineTotal: newLineTotal,
        taxAmount: 0,
      },
    });

    const subtotalDelta = newLineTotal - Number(line.lineTotal);
    await prisma.quotation.update({
      where: { id: line.quotationId },
      data: {
        subtotal: { increment: subtotalDelta },
        totalAmount: { increment: subtotalDelta },
      },
    });

    const updatedCart = await prisma.quotation.findFirst({
      where: { id: line.quotationId },
      include: { lines: { include: { product: true, variant: true } } },
    });
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCartItem = async (req, res) => {
  try {
    const { lineId } = req.params;
    const line = await prisma.quotationLine.findUnique({ where: { id: lineId }, include: { quotation: true } });

    if (!line) return res.status(404).json({ message: 'Line not found' });
    if (line.quotation.customerId !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    await prisma.quotationLine.delete({ where: { id: lineId } });

    await prisma.quotation.update({
      where: { id: line.quotationId },
      data: {
        subtotal: { decrement: Number(line.lineTotal) },
        taxAmount: { decrement: Number(line.taxAmount) || 0 },
        totalAmount: { decrement: Number(line.lineTotal) + (Number(line.taxAmount) || 0) },
      },
    });

    const updatedCart = await prisma.quotation.findFirst({
      where: { id: line.quotationId },
      include: { lines: { include: { product: true, variant: true } } },
    });
    res.json(updatedCart || { message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
