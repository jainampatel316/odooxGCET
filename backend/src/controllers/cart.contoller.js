const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to calculate line price based on duration and pricing rules
const calculateRentalPrice = (duration, pricingRules) => {
    // Simplified logic: Find base price or specific period price
    // Real implementation needs complex duration logic (hours vs days vs weeks)
    const basePrice = pricingRules[0].price; 
    return basePrice * duration;
};

exports.getOrCreateCart = async (req, res) => {
  try {
    // Find a draft quotation for this user
    let cart = await prisma.quotation.findFirst({
      where: { customerId: req.user.id, status: 'DRAFT' },
      include: { lines: { include: { product: true, variant: true } } }
    });

    if (!cart) {
      cart = await prisma.quotation.create({
        data: {
          customerId: req.user.id,
          quotationNumber: `QT-${Date.now()}`, // Generate unique ID
          status: 'DRAFT',
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        include: { lines: { include: { product: true, variant: true } } }
      });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity, rentalStartDate, rentalEndDate, rentalPeriodType } = req.body;
    
    // 1. Get Cart
    const cart = await prisma.quotation.findFirst({
      where: { customerId: req.user.id, status: 'DRAFT' }
    });
    
    if (!cart) return res.status(400).json({ message: "No active cart found" });

    // 2. Get Product & Pricing
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { rentalPricing: true }
    });

    // 3. Calculate Duration (Simple days diff for demo)
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)); 

    const unitPrice = calculateRentalPrice(duration, product.rentalPricing);
    const lineTotal = unitPrice * quantity;

    // 4. Add Line Item
    const line = await prisma.quotationLine.create({
      data: {
        quotationId: cart.id,
        productId,
        variantId,
        quantity,
        rentalStartDate: start,
        rentalEndDate: end,
        rentalPeriodType,
        rentalDuration: duration,
        unitPrice,
        lineTotal,
        taxRate: 18, // Default GST
        taxAmount: lineTotal * 0.18
      }
    });

    // 5. Update Quotation Totals (Transaction needed for accuracy, simplified here)
    await prisma.quotation.update({
      where: { id: cart.id },
      data: {
         subtotal: { increment: lineTotal },
         taxAmount: { increment: line.taxAmount },
         totalAmount: { increment: lineTotal + line.taxAmount }
      }
    });

    res.status(201).json(line);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
    // Implementation to update quantity or dates
    // 1. Remove old values from total
    // 2. Update Line
    // 3. Add new values to total
    res.json({ message: "Implement update logic" });
};

exports.deleteCartItem = async (req, res) => {
    try {
        const { lineId } = req.params;
        const line = await prisma.quotationLine.findUnique({ where: { id: lineId } });
        
        await prisma.quotationLine.delete({ where: { id: lineId } });
        
        // Deduct from totals
        await prisma.quotation.update({
            where: { id: line.quotationId },
            data: {
                subtotal: { decrement: line.lineTotal },
                taxAmount: { decrement: line.taxAmount },
                totalAmount: { decrement: line.lineTotal + line.taxAmount }
            }
        });
        
        res.json({ message: "Item removed" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};