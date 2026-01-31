/**
 * Transform backend order data to frontend format
 * Backend uses RentalOrder schema with different field names and structure
 */

/**
 * Map backend RentalOrderStatus to frontend status
 * Backend: DRAFT, CONFIRMED, PICKED_UP, ACTIVE, RETURNED, COMPLETED, CANCELLED
 * Frontend: quotation, sale_order, confirmed, invoiced, cancelled
 */
export const mapBackendOrderStatus = (backendStatus) => {
  const statusMap = {
    'DRAFT': 'quotation',
    'CONFIRMED': 'confirmed',
    'PICKED_UP': 'invoiced', // After pickup, invoice is typically generated
    'ACTIVE': 'invoiced',
    'RETURNED': 'returned',
    'COMPLETED': 'returned',
    'CANCELLED': 'cancelled',
  };
  
  return statusMap[backendStatus] || 'quotation';
};

/**
 * Map frontend status to backend RentalOrderStatus
 */
export const mapFrontendOrderStatus = (frontendStatus) => {
  const statusMap = {
    'quotation': 'DRAFT',
    'sale_order': 'CONFIRMED',
    'confirmed': 'CONFIRMED',
    'invoiced': 'PICKED_UP',
    'returned': 'COMPLETED',
    'cancelled': 'CANCELLED',
  };
  
  return statusMap[frontendStatus] || 'DRAFT';
};

/**
 * Get rental duration display text from order lines
 */
const getRentalDurationDisplay = (status) => {
  const durationMap = {
    'quotation': 'quotation',
    'sale_order': 'sold-order',
    'confirmed': 'confirmed',
    'invoiced': 'invoiced',
    'returned': 'returned',
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
  
  return {
    id: backendOrder.id,
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
    status: frontendStatus,
    quotationDate: backendOrder.createdAt,
    confirmedDate: backendOrder.confirmedAt,
    invoicedDate: backendOrder.pickupRecords?.[0]?.actualPickupDate || null,
    returnedDate: backendOrder.returnRecords?.[0]?.actualReturnDate || null,
    cancelledDate: backendOrder.status === 'CANCELLED' ? backendOrder.updatedAt : null,
    createdAt: backendOrder.createdAt,
    
    // Additional backend data for detail view
    _backendData: backendOrder,
  };
};

/**
 * Get status color for frontend display
 */
const getStatusColor = (status) => {
  const colorMap = {
    'quotation': 'purple',
    'sale_order': 'orange',
    'confirmed': 'green',
    'invoiced': 'blue',
    'returned': 'gray',
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
