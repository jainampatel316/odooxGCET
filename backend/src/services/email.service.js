import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOrderStatusEmail = async (customerEmail, customerName, orderDetails) => {
  const { orderNumber, status, totalAmount } = orderDetails;

  const statusMap = {
    DRAFT: {
      subject: 'Order Placed Successfully - RentWise Studio',
      title: 'Order Placed!',
      message: 'Your order has been placed successfully and is currently under review by the vendor.',
    },
    CONFIRMED: {
      subject: 'Order Confirmed - RentWise Studio',
      title: 'Order Confirmed!',
      message: 'Exciting news! Your order has been confirmed by the vendor and is ready for pickup.',
    },
    ACTIVE: {
      subject: 'Order Picked Up - RentWise Studio',
      title: 'Order Picked Up!',
      message: 'You have successfully picked up your rental items. Enjoy your equipment!',
    },
    PICKED_UP: {
      subject: 'Order Picked Up - RentWise Studio',
      title: 'Order Picked Up!',
      message: 'You have successfully picked up your rental items. Enjoy your equipment!',
    },
    RETURNED: {
      subject: 'Items Returned - RentWise Studio',
      title: 'Items Returned!',
      message: 'The items have been returned to the vendor. We will process your final invoice shortly.',
    },
    COMPLETED: {
      subject: 'Order Completed - RentWise Studio',
      title: 'Order Completed!',
      message: 'Thank you for choosing RentWise Studio! Your order is now marked as completed.',
    },
    CANCELLED: {
      subject: 'Order Cancelled - RentWise Studio',
      title: 'Order Cancelled',
      message: 'We regret to inform you that your order has been cancelled.',
    },
  };

  const currentStatus = statusMap[status] || {
    subject: `Order Update: ${status}`,
    title: `Order ${status}`,
    message: `The status of your order #${orderNumber} has been updated to ${status}.`,
  };

  const mailOptions = {
    from: `"RentWise Studio" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: currentStatus.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #7c3aed; margin-bottom: 20px;">${currentStatus.title}</h2>
        <p>Hello ${customerName},</p>
        <p>${currentStatus.message}</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Order Number:</p>
          <p style="margin: 5px 0 15px 0; font-weight: bold; font-family: monospace;">${orderNumber}</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;">Total Amount:</p>
          <p style="margin: 5px 0 0 0; font-weight: bold;">₹${totalAmount}</p>
        </div>
        <p>You can view your order details in your dashboard.</p>
        <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">Best Regards,<br>The RentWise Studio Team</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId} (Status: ${status})`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // We don't throw here to avoid failing the main request if email fails
    return null;
  }
};
