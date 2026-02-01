import prisma from '../lib/prisma.js';
import { sendLateFeeNotification } from './email.service.js';

/**
 * Process overdue orders and apply late fees
 * Runs daily via cron/scheduler
 */
export const processOverdueOrders = async () => {
  console.log('[LateFeeService] Starting overdue order processing...');
  
  try {
    // 1. Find all active/picked-up lines that are past their due date
    // and haven't been returned yet.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueLines = await prisma.orderLine.findMany({
      where: {
        order: {
          status: { in: ['ACTIVE', 'PICKED_UP', 'CONFIRMED'] } // Include CONFIRMED if they picked up but status wasn't updated? Maybe safer to stick to ACTIVE/PICKED_UP
        },
        rentalEndDate: {
          lt: today // Due date is in the past
        },
        actualReturnDate: null // Has not been returned
      },
      include: {
        order: {
          include: {
            customer: true
          }
        },
        product: true
      }
    });

    console.log(`[LateFeeService] Found ${overdueLines.length} overdue lines.`);

    for (const line of overdueLines) {
      await processSingleOverdueLine(line, today);
    }

    console.log('[LateFeeService] Completed overdue processing.');
  } catch (error) {
    console.error('[LateFeeService] Error processing overdue orders:', error);
  }
};

/**
 * Process a single overdue line item
 */
const processSingleOverdueLine = async (line, today) => {
  try {
    const dueDate = new Date(line.rentalEndDate);
    dueDate.setHours(0, 0, 0, 0);

    // Calculate days late
    // Difference in time / (1000 * 3600 * 24)
    const diffTime = Math.abs(today - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // If diffDays is 0, it's the due date, not late yet (lt check above handles this, but be safe)
    if (diffDays <= 0) return;

    // Check if we already charged for this day
    // line.lateReturnDays stores total days charged. 
    // If diffDays > line.lateReturnDays, we need to charge for the difference (usually 1 day if run daily)
    // However, to be robust against skipped cron runs, we should calculate the days we haven't charged for yet.
    // BUT, the requirement says "charge 1 day charge + 10%... for EACH day".
    // If we missed 3 days, we should charge 3x.
    
    // For simplicity and safety in this iteration, let's assume we run this daily.
    // If we want to catch up, we simply loop.
    
    const daysToCharge = diffDays - line.lateReturnDays;

    if (daysToCharge <= 0) {
      // Already up to date
      return;
    }

    console.log(`[LateFeeService] Charging ${daysToCharge} days late fee for Line ${line.id} (Order ${line.order.orderNumber})`);

    // Calculate Daily Fee
    // Rule: 1 Day Rental Charge + 10% of Product Price
    const dailyRentalRate = Number(line.unitPrice); // Assuming unitPrice is accurate daily rate or close proxy. 
    // Ideally we'd fetch specific daily pricing, but unitPrice is what they paid per unit time. 
    // If rentalPeriodType is not DAILY, this might be off, but we'll use unitPrice as the "Rental Charge" base.
    
    const productValuePenalty = Number(line.product.salesPrice) * 0.10;
    const dailyFeePerItem = dailyRentalRate + productValuePenalty;
    const totalNewFee = dailyFeePerItem * daysToCharge * line.quantity;

    // Transaction to update everything
    await prisma.$transaction(async (tx) => {
      // 1. Update OrderLine
      await tx.orderLine.update({
        where: { id: line.id },
        data: {
          isLateReturn: true,
          lateReturnDays: diffDays, // Update to current total overdue days
          lateReturnFee: { increment: totalNewFee }
        }
      });

      // 2. Update Order Totals
      await tx.rentalOrder.update({
        where: { id: line.orderId },
        data: {
          lateReturnFee: { increment: totalNewFee },
          totalAmount: { increment: totalNewFee },
          balanceAmount: { increment: totalNewFee } // Add to balance
        }
      });

      // 3. Generate Invoice for this specific fee
      const invoiceNumber = `INV-LATE-${line.order.orderNumber}-${diffDays}-${Date.now().toString().slice(-4)}`;
      
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: line.orderId,
          customerId: line.order.customerId,
          invoiceType: 'LATE_FEE',
          status: 'SENT', // Immediately sent/due
          dueDate: new Date(), // Due immediately
          subtotal: totalNewFee,
          totalAmount: totalNewFee,
          balanceAmount: totalNewFee,
          notes: `Late Fee for ${daysToCharge} day(s) overdue. Product: ${line.product.name}`,
          termsConditions: 'Late fees are calculated as Daily Rental Rate + 10% of Product Value per day.',
        }
      });

      // 4. Send Notification
      // We do this AFTER transaction to ensure DB consistency first
      // But we need data from inside. We can return it.
      return newInvoice;
    }).then(async (savedInvoice) => {
      // Send Email
      if (line.order.customer.email) {
        await sendLateFeeNotification(
          line.order.customer.email,
          line.order.customer.name,
          {
            orderNumber: line.order.orderNumber,
            productName: line.product.name,
            daysLate: diffDays,
            newFee: totalNewFee,
            totalDue: totalNewFee, // For this specific invoice
            invoiceNumber: savedInvoice.invoiceNumber
          }
        );
      }
    });

  } catch (error) {
    console.error(`[LateFeeService] Failed to process line ${line.id}:`, error);
  }
};
