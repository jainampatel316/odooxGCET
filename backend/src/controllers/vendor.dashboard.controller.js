import prisma from "../lib/prisma.js";

export const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // 1. Total Revenue
    // Sum of totalAmount from Invoices linked to orders with this vendor's products
    const revenueResult = await prisma.invoice.groupBy({
      by: ['orderId'],
      where: {
        order: {
          lines: {
            some: {
              product: { vendorId }
            }
          }
        },
        status: { in: ['PAID', 'PARTIALLY_PAID'] }
      },
      _sum: { totalAmount: true }
    });
    
    const totalRevenue = revenueResult.reduce((acc, curr) => acc + Number(curr._sum.totalAmount || 0), 0);

    // 2. Active Rentals (Confirmed or Picked Up)
    const activeOrders = await prisma.rentalOrder.count({
      where: {
        status: { in: ['CONFIRMED', 'PICKED_UP', 'ACTIVE'] },
        lines: {
          some: {
            product: { vendorId }
          }
        }
      }
    });

    // 3. Total Products
    const totalProducts = await prisma.product.count({
      where: { vendorId }
    });

    // 4. Pending Pickups
    const pendingPickups = await prisma.pickupRecord.count({
      where: {
        status: 'SCHEDULED',
        order: {
          lines: {
            some: {
              product: { vendorId }
            }
          }
        }
      }
    });

    res.json({
      totalRevenue,
      activeRentals: activeOrders,
      totalProducts,
      pendingPickups
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching dashboard stats" });
  }
};