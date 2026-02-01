import prisma from '../lib/prisma.js';

/**
 * Log inventory movement without updating quantity
 * Use this when you want to log a movement but handle the quantity update separately
 */
export const logInventoryMovement = async ({
  productId,
  variantId,
  movementType,
  quantity,
  orderId,
  reservationId,
  userId,
  reason,
  notes,
}) => {
  // Get current quantity
  let currentQty = 0;
  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { quantityOnHand: true },
    });
    currentQty = variant?.quantityOnHand || 0;
  } else if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { quantityOnHand: true },
    });
    currentQty = product?.quantityOnHand || 0;
  }

  const newQty = currentQty + quantity;

  // Create inventory log
  const log = await prisma.inventoryLog.create({
    data: {
      productId,
      variantId,
      movementType,
      quantity,
      previousQty: currentQty,
      newQty,
      orderId,
      reservationId,
      userId,
      reason,
      notes,
    },
  });

  return log;
};

/**
 * Update product/variant quantity and log the movement
 * This is the main function to use for inventory changes
 */
export const updateInventory = async ({
  productId,
  variantId,
  movementType,
  quantity,
  orderId,
  reservationId,
  userId,
  reason,
  notes,
  transaction, // Optional Prisma transaction client
}) => {
  const prismaClient = transaction || prisma;

  // Get current quantity
  let currentQty = 0;
  if (variantId) {
    const variant = await prismaClient.productVariant.findUnique({
      where: { id: variantId },
      select: { quantityOnHand: true },
    });
    currentQty = variant?.quantityOnHand || 0;
  } else if (productId) {
    const product = await prismaClient.product.findUnique({
      where: { id: productId },
      select: { quantityOnHand: true },
    });
    currentQty = product?.quantityOnHand || 0;
  }

  const newQty = currentQty + quantity;

  // Prevent negative inventory (optional - can be disabled for certain movement types)
  if (newQty < 0 && !['ADJUSTMENT', 'STOCK_OUT'].includes(movementType)) {
    throw new Error(`Insufficient inventory. Available: ${currentQty}, Requested: ${Math.abs(quantity)}`);
  }

  // Create inventory log
  const log = await prismaClient.inventoryLog.create({
    data: {
      productId,
      variantId,
      movementType,
      quantity,
      previousQty: currentQty,
      newQty,
      orderId,
      reservationId,
      userId,
      reason,
      notes,
    },
  });

  // Update the actual quantity
  if (variantId) {
    await prismaClient.productVariant.update({
      where: { id: variantId },
      data: {
        quantityOnHand: {
          increment: quantity,
        },
      },
    });
  } else if (productId) {
    await prismaClient.product.update({
      where: { id: productId },
      data: {
        quantityOnHand: {
          increment: quantity,
        },
      },
    });
  }

  return log;
};

/**
 * Get inventory history for a product/variant
 */
export const getInventoryHistory = async (productId, variantId, options = {}) => {
  const { limit = 50, offset = 0, movementType } = options;

  return prisma.inventoryLog.findMany({
    where: {
      ...(productId && { productId }),
      ...(variantId && { variantId }),
      ...(movementType && { movementType }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      },
      reservation: {
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
};

/**
 * Get current available inventory for a product/variant
 * This considers reservations and current stock
 * @param {string} productId - Product ID
 * @param {string} variantId - Variant ID (optional)
 * @param {Date|string} startDate - Start date for availability check
 * @param {Date|string} endDate - End date for availability check
 * @param {Object} transaction - Optional Prisma transaction client
 */
export const getAvailableInventory = async (productId, variantId, startDate, endDate, transaction) => {
  const prismaClient = transaction || prisma;

  // Get current quantity on hand
  let quantityOnHand = 0;
  if (variantId) {
    const variant = await prismaClient.productVariant.findUnique({
      where: { id: variantId },
      select: { quantityOnHand: true },
    });
    quantityOnHand = variant?.quantityOnHand || 0;
  } else if (productId) {
    const product = await prismaClient.product.findUnique({
      where: { id: productId },
      select: { quantityOnHand: true },
    });
    quantityOnHand = product?.quantityOnHand || 0;
  }

  // If no date range specified, return current quantity
  if (!startDate || !endDate) {
    return quantityOnHand;
  }

  // Get active reservations that overlap with the requested period
  const overlappingReservations = await prismaClient.reservation.findMany({
    where: {
      ...(productId && { productId }),
      ...(variantId && { variantId }),
      status: {
        in: ['PENDING', 'ACTIVE'],
      },
      OR: [
        {
          // Reservation starts during requested period
          startDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          // Reservation ends during requested period
          endDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          // Reservation spans the entire requested period
          AND: [
            { startDate: { lte: new Date(startDate) } },
            { endDate: { gte: new Date(endDate) } },
          ],
        },
      ],
    },
    select: {
      quantity: true,
    },
  });

  // Calculate total reserved quantity
  const reservedQuantity = overlappingReservations.reduce(
    (sum, reservation) => sum + reservation.quantity,
    0
  );

  // Available = On Hand - Reserved
  return Math.max(0, quantityOnHand - reservedQuantity);
};

/**
 * Create a reservation and update inventory with database locking
 * Uses serializable transaction to prevent race conditions
 */
export const createReservation = async ({
  orderId,
  productId,
  variantId,
  quantity,
  startDate,
  endDate,
  userId,
  transaction,
}) => {
  // If already in a transaction, use it; otherwise create a new one
  if (transaction) {
    return await _createReservationInTransaction({
      orderId,
      productId,
      variantId,
      quantity,
      startDate,
      endDate,
      userId,
      transaction,
    });
  }

  // Create new serializable transaction with timeout
  return await prisma.$transaction(
    async (tx) => {
      return await _createReservationInTransaction({
        orderId,
        productId,
        variantId,
        quantity,
        startDate,
        endDate,
        userId,
        transaction: tx,
      });
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000, // 5 seconds max wait for lock
      timeout: 10000, // 10 seconds total timeout
    }
  );
};

/**
 * Internal function to create reservation within a transaction
 */
const _createReservationInTransaction = async ({
  orderId,
  productId,
  variantId,
  quantity,
  startDate,
  endDate,
  userId,
  transaction,
}) => {
  // Check if enough inventory is available (within transaction for consistency)
  const available = await getAvailableInventory(productId, variantId, startDate, endDate, transaction);
  if (available < quantity) {
    throw new Error(`Insufficient inventory. Available: ${available}, Requested: ${quantity}`);
  }

  // Create reservation
  const reservation = await transaction.reservation.create({
    data: {
      orderId,
      productId,
      variantId,
      quantity,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'PENDING',
    },
  });

  // Log the reservation (inventory update happens within same transaction)
  await updateInventory({
    productId,
    variantId,
    movementType: 'RESERVED',
    quantity: -quantity, // Negative to reduce available stock
    orderId,
    reservationId: reservation.id,
    userId,
    reason: 'Inventory reserved for rental order',
    notes: `Reserved ${quantity} units from ${startDate} to ${endDate}`,
    transaction,
  });

  return reservation;
};

/**
 * Release a reservation and update inventory
 */
export const releaseReservation = async (reservationId, userId, reason = 'Reservation released') => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      product: true,
      variant: true,
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.status === 'CANCELLED' || reservation.status === 'COMPLETED') {
    throw new Error('Reservation already released');
  }

  // Update reservation status
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 'CANCELLED' },
  });

  // Log the release
  await updateInventory({
    productId: reservation.productId,
    variantId: reservation.variantId,
    movementType: 'RESERVATION_RELEASE',
    quantity: reservation.quantity, // Positive to add back to stock
    orderId: reservation.orderId,
    reservationId: reservation.id,
    userId,
    reason,
    notes: `Released ${reservation.quantity} units from reservation`,
  });

  return reservation;
};

export default {
  logInventoryMovement,
  updateInventory,
  getInventoryHistory,
  getAvailableInventory,
  createReservation,
  releaseReservation,
};
