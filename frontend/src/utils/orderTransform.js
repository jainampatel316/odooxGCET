/**
 * Transform backend order data to frontend format
 * Backend uses RentalOrder schema with different field names and structure
 */

/**
 * Map backend RentalOrderStatus to frontend status
 * Backend: DRAFT, CONFIRMED, PICKED_UP, ACTIVE, RETURNED, COMPLETED, CANCELLED
 * Frontend: draft, confirmed, picked_up, active, returned, completed, cancelled
 */
export const mapBackendOrderStatus = (backendStatus) => {
  const statusMap = {
    'DRAFT': 'draft',
    'CONFIRMED': 'confirmed',
    'PICKED_UP': 'picked_up',
    'ACTIVE': 'active',
    'RETURNED': 'returned',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled',
  };
  return statusMap[backendStatus] || 'draft';
};

/**
 * Map frontend status to backend RentalOrderStatus
 */
export const mapFrontendOrderStatus = (frontendStatus) => {
  const statusMap = {
    'draft': 'DRAFT',
    'confirmed': 'CONFIRMED',
    'picked_up': 'PICKED_UP',
    'active': 'ACTIVE',
    'returned': 'RETURNED',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELLED',
  };
  return statusMap[frontendStatus] || 'DRAFT';
};

/**
 * Get rental duration display text from order lines
 */
const getRentalDurationDisplay = (status) => {
  const durationMap = {
    'draft': 'draft',
    'confirmed': 'confirmed',
    'picked_up': 'picked-up',
    'active': 'active',
    'returned': 'returned',
    'completed': 'completed',
    'cancelled': 'cancelled',
  };
  return durationMap[status] || status;
};

/**
 * Transform backend order to frontend format
 * @param {Object} backendOrder - Order from backend API
 * @returns {Object} - Frontend order format
 */
export const transformBackendOrder = (backendOrder) => {
  if (!backendOrder) return null;
  
  // Get first order line for product info
  const firstLine = backendOrder.lines?.[0];
  const productName = firstLine?.product?.name || 'Unknown Product';
  
  // Map status
  const frontendStatus = mapBackendOrderStatus(backendOrder.status);
  
  // Calculate rental period type and duration from first line
  const rentalPeriodType = firstLine?.rentalPeriodType?.toLowerCase() || null;
  const rentalDuration = firstLine?.rentalDuration || null;
  
  const balanceAmount = Number(backendOrder.balanceAmount) ?? 0;
  const pickupRecords = backendOrder.pickupRecords ?? [];
  const returnRecords = backendOrder.returnRecords ?? [];
  const hasPickup = pickupRecords.some((r) => r.status === 'COMPLETED') || ['ACTIVE', 'PICKED_UP', 'RETURNED', 'COMPLETED'].includes(backendOrder.status);
  const hasReturn = returnRecords.some((r) => r.status === 'COMPLETED') || ['RETURNED', 'COMPLETED'].includes(backendOrder.status);
  return {
    id: backendOrder.id,
    orderNumber: backendOrder.orderNumber,
    orderReference: backendOrder.orderNumber,
    orderDate: backendOrder.createdAt,
    customerId: backendOrder.customerId,
    customerName: backendOrder.customer?.name || 'Unknown Customer',
    customerEmail: backendOrder.customer?.email || '',
    customerPhone: backendOrder.customer?.phone || '',
    product: productName,
    productId: firstLine?.productId || null,
    rentalDuration: getRentalDurationDisplay(frontendStatus),
    rentalDurationColor: getStatusColor(frontendStatus),
    rentalPeriodType: rentalPeriodType,
    rentalPeriodDuration: rentalDuration,
    total: parseFloat(backendOrder.totalAmount) || 0,
    totalAmount: parseFloat(backendOrder.totalAmount) || 0,
    subtotal: backendOrder.subtotal != null ? parseFloat(backendOrder.subtotal) : undefined,
    taxAmount: backendOrder.taxAmount != null ? parseFloat(backendOrder.taxAmount) : undefined,
    lateReturnFees: backendOrder.lateReturnFee != null ? parseFloat(backendOrder.lateReturnFee) : 0,
    lateReturnDays: backendOrder.lines?.reduce((acc, line) => acc + (line.lateReturnDays || 0), 0) || 0,
    status: frontendStatus,
    quotationDate: backendOrder.createdAt,
    confirmedDate: backendOrder.confirmedAt,
    invoicedDate: backendOrder.pickupRecords?.[0]?.actualPickupDate || null,
    returnedDate: backendOrder.returnRecords?.[0]?.actualReturnDate || null,
    cancelledDate: backendOrder.status === 'CANCELLED' ? backendOrder.updatedAt : null,
    createdAt: backendOrder.createdAt,
    rentalStart: firstLine?.rentalStartDate ?? null,
    rentalEnd: firstLine?.rentalEndDate ?? null,
    paymentStatus: balanceAmount <= 0 ? 'paid' : 'partial',
    pickupStatus: hasPickup ? 'completed' : 'pending',
    returnStatus: hasReturn ? 'completed' : 'pending',
    pickupDate: pickupRecords.find((r) => r.actualPickupDate)?.actualPickupDate ?? null,
    returnDate: returnRecords.find((r) => r.actualReturnDate)?.actualReturnDate ?? null,
    pickupRecords,
    returnRecords,
    lines: backendOrder.lines ?? [],
    _backendData: backendOrder,
  };
};

/**
 * Get status color for frontend display
 */
const getStatusColor = (status) => {
  const colorMap = {
    'draft': 'purple',
    'confirmed': 'blue',
    'picked_up': 'cyan',
    'active': 'green',
    'returned': 'orange',
    'completed': 'gray',
    'cancelled': 'red',
  };
  return colorMap[status] || 'gray';
};

/**
 * Transform array of backend orders
 */
export const transformBackendOrders = (backendOrders) => {
  if (!Array.isArray(backendOrders)) return [];
  return backendOrders.map(transformBackendOrder).filter(Boolean);
};
