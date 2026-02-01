import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


const FROM_EMAIL = process.env.SMTP_USER; // Use SMTP_USER for best reliability with Gmail
const FROM_NAME = process.env.FROM_NAME || "RentWise Studio";

// Verify connection configuration
console.log('Verifying SMTP connection with:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error Details:', error);
  } else {
    console.log('SMTP Server is ready and verified');
  }
});

export const sendOrderStatusEmail = async (customerEmail, customerName, fullOrder) => {
  const { 
    orderNumber, 
    status, 
    totalAmount, 
    lines = [], 
    subtotal = 0, 
    taxAmount = 0,
    shippingAddress,
    billingAddress
  } = fullOrder;

  console.log(`[EmailService] Preparing ${status} email for ${customerEmail} (Order: ${orderNumber})`);

  const statusMap = {
    DRAFT: {
      subject: `Order Recieved #${orderNumber} - RentWise Studio`,
      title: 'Order Placed!',
      message: 'Your order has been placed successfully and is currently under review by the vendor.',
    },
    CONFIRMED: {
      subject: `Order Confirmed #${orderNumber} - RentWise Studio`,
      title: 'Order Confirmed!',
      message: 'Exciting news! Your order has been confirmed by the vendor and is ready for pickup.',
    },
    ACTIVE: {
      subject: `Order Picked Up #${orderNumber} - RentWise Studio`,
      title: 'Order Picked Up!',
      message: 'You have successfully picked up your rental items. Enjoy your equipment!',
    },
    PICKED_UP: {
      subject: `Order Picked Up #${orderNumber} - RentWise Studio`,
      title: 'Order Picked Up!',
      message: 'You have successfully picked up your rental items. Enjoy your equipment!',
    },
    RETURNED: {
      subject: `Items Returned #${orderNumber} - RentWise Studio`,
      title: 'Items Returned!',
      message: 'The items have been returned to the vendor. We will process your final invoice shortly.',
    },
    COMPLETED: {
      subject: `Order Completed #${orderNumber} - RentWise Studio`,
      title: 'Order Completed!',
      message: 'Thank you for choosing RentWise Studio! Your order is now marked as completed.',
    },
    CANCELLED: {
      subject: `Order Cancelled #${orderNumber} - RentWise Studio`,
      title: 'Order Cancelled',
      message: 'We regret to inform you that your order has been cancelled.',
    },
  };

  const currentStatus = statusMap[status] || {
    subject: `Order Update #${orderNumber}: ${status}`,
    title: `Order ${status}`,
    message: `The status of your order #${orderNumber} has been updated to ${status}.`,
  };

  const formatCurrency = (val) => `₹${parseFloat(val).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  const orderLinesHtml = lines.map(line => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #edf2f7;">
        <div style="font-weight: bold; color: #2d3748;">${line.product?.name || 'Product'}</div>
        <div style="font-size: 12px; color: #718096;">${line.variant?.name || ''}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #edf2f7; text-align: center; color: #4a5568;">
        ${line.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 12px; color: #4a5568;">
        ${formatDate(line.rentalStartDate)} to ${formatDate(line.rentalEndDate)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #edf2f7; text-align: right; font-weight: bold; color: #2d3748;">
        ${formatCurrency(line.lineTotal)}
      </td>
    </tr>
  `).join('');

  const addressHtml = (addr, label) => addr ? `
    <div style="flex: 1; min-width: 250px; margin-bottom: 20px;">
      <h4 style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">${label}</h4>
      <div style="color: #2d3748; line-height: 1.6;">
        ${addr.name || ''}<br>
        ${addr.email || ''}<br>
        ${addr.phone || ''}<br>
        ${addr.street || ''}, ${addr.city || ''}<br>
        ${addr.state || ''} ${addr.zipCode || ''}<br>
        ${addr.country || ''}
      </div>
    </div>
  ` : '';

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: currentStatus.subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7fafc; padding: 40px 20px;">
        <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <div style="background-color: #7c3aed; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${currentStatus.title}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Order #${orderNumber}</p>
          </div>

          <!-- Message -->
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #4a5568; margin-top: 0;">Hello ${customerName},</p>
            <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">${currentStatus.message}</p>
            
            <!-- Items Table -->
            <div style="margin: 30px 0; border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; color: #718096; text-transform: uppercase;">Item</th>
                    <th style="padding: 12px; text-align: center; font-size: 12px; color: #718096; text-transform: uppercase;">Qty</th>
                    <th style="padding: 12px; text-align: left; font-size: 12px; color: #718096; text-transform: uppercase;">Period</th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; color: #718096; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderLinesHtml}
                </tbody>
              </table>
            </div>

            <!-- Totals -->
            <div style="margin-left: auto; max-width: 250px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #718096;">
                <span>Subtotal</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #718096;">
                <span>Tax</span>
                <span>${formatCurrency(taxAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #edf2f7; font-size: 18px; font-weight: bold; color: #2d3748; margin-top: 8px;">
                <span>Total</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 40px 0;">

            <!-- Addresses -->
            <div style="display: flex; flex-wrap: wrap; gap: 40px;">
              ${addressHtml(shippingAddress, 'Shipping Address')}
              ${addressHtml(billingAddress, 'Billing Address')}
            </div>

            <div style="margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #4a5568; font-size: 14px;">If you have any questions, please contact our support team.</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #edf2f7;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} RentWise Studio. All rights reserved.<br>
              Bringing accessibility to premium rentals.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    console.log(`[EmailService] Sending mail context:`, { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    if (error.response) console.error('[EmailService] SMTP Response:', error.response);
    return null;
  }
};



export const sendLateFeeNotification = async (customerEmail, customerName, details) => {
  const { orderNumber, productName, daysLate, newFee, totalDue, invoiceNumber } = details;
  
  const formatCurrency = (val) => `₹${parseFloat(val).toFixed(2)}`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: `Overdue Notice: Late Fee Applied for Order #${orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">Overdue Rental Items</h2>
        <p>Hello ${customerName},</p>
        <p>This is a notification that items from Order <strong>#${orderNumber}</strong> are overdue by <strong>${daysLate} day(s)</strong>.</p>
        
        <p>A late fee has been applied to your account according to our policy (Daily Rate + 10% Product Value).</p>
        
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #fecaca;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">Product:</p>
          <p style="margin: 5px 0 15px 0; font-weight: bold;">${productName}</p>
          
          <p style="margin: 0; font-size: 14px; color: #991b1b;">New Late Fee Added:</p>
          <p style="margin: 5px 0 15px 0; font-weight: bold; font-size: 18px;">${formatCurrency(newFee)}</p>
           
          <p style="margin: 0; font-size: 14px; color: #991b1b;">Total Outstanding Balance:</p>
          <p style="margin: 5px 0 15px 0; font-weight: bold; font-size: 18px;">${formatCurrency(totalDue)}</p>

          <p style="margin: 0; font-size: 14px; color: #991b1b;">Late Fee Invoice:</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; font-family: monospace;">${invoiceNumber}</p>
        </div>

        <p>Please return the items immediately to avoid further charges.</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">Best Regards,<br>The RentWise Studio Team</p>
      </div>
    `,
  };

  try {
    console.log(`[EmailService] Sending Late Fee email to ${customerEmail}`);
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Late fee email sent successfully.`);
  } catch (error) {
    console.error('[EmailService] Error sending late fee email:', error);
  }

export const sendPasswordResetEmail = async (customerEmail, customerName, newPassword) => {
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: customerEmail,
    subject: `Password Reset Request - RentWise Studio`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #7c3aed; margin-bottom: 20px;">Password Reset</h2>
        <p>Hello ${customerName},</p>
        <p>We received a request to reset your password. Here is your new temporary password:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-family: monospace; font-size: 24px; letter-spacing: 2px; font-weight: bold; color: #1f2937;">
            ${newPassword}
          </p>
        </div>

        <p>Please log in using this password and change it immediately from your profile settings.</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">If you did not request this, please contact support immediately.</p>
        <p style="font-size: 14px; color: #94a3b8;">Best Regards,<br>The RentWise Studio Team</p>
      </div>
    `,
  };

  try {
    console.log(`[EmailService] Sending Password Reset email to ${customerEmail}`);
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Password reset email sent successfully.`);
  } catch (error) {
    console.error('[EmailService] Error sending password reset email:', error);
  }
};
