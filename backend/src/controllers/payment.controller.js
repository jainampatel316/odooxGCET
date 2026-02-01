import prisma from '../lib/prisma.js';

export const createPaymentIntent = async (req, res) => {

    // Integration with Stripe/Razorpay would happen here
    const { orderId, amount, method } = req.body;
    
    // Mock Payment Creation
    const payment = await prisma.payment.create({
        data: {
            paymentNumber: `PAY-${Date.now()}`,
            orderId,
            customerId: req.user.id,
            amount,
            method: method || 'CREDIT_CARD',
            status: 'COMPLETED', // Assuming success for demo
            paymentDate: new Date(),
            transactionId: `txn_${Date.now()}`
        }
    });

    // Update Invoice if linked, or Order balance
    // Simplified: Update Order Paid Amount
    await prisma.rentalOrder.update({
        where: { id: orderId },
        data: { paidAmount: { increment: amount } }
    });

    res.json(payment);
};

export const getInvoices = async (req, res) => {

    const invoices = await prisma.invoice.findMany({
        where: { customerId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.json(invoices);
};

export const downloadInvoice = async (req, res) => {

    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { order: true, customer: true }
    });

    if (!invoice || invoice.customerId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    // Logic to generate PDF
    // res.download(path) or send PDF buffer
    res.json({ url: invoice.pdfUrl || "https://mock-pdf-url" });
};