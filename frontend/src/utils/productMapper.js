// Utility to map backend product structure to frontend format

/**
 * Maps backend product data to frontend format
 * @param {Object} backendProduct - Product from backend API
 * @returns {Object} Product in frontend format
 */
export const mapBackendProductToFrontend = (backendProduct) => {
  if (!backendProduct) return null;

  // Extract rental pricing from backend format
  // Backend uses: HOURLY, DAILY, WEEKLY, MONTHLY, CUSTOM (from Prisma schema)
  const rentalPricing = backendProduct.rentalPricing || [];
  const pricePerHour = Number(rentalPricing.find(p => p.periodType === 'HOURLY')?.price) || 0;
  const pricePerDay = Number(rentalPricing.find(p => p.periodType === 'DAILY')?.price) || Number(backendProduct.salesPrice) || 0;
  const pricePerWeek = Number(rentalPricing.find(p => p.periodType === 'WEEKLY')?.price) || 0;

  // Get images - prefer images array, fallback to imageUrl
  const images = backendProduct.images && backendProduct.images.length > 0 
    ? backendProduct.images 
    : (backendProduct.imageUrl ? [backendProduct.imageUrl] : []);

  return {
    id: backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description || '',
    sku: backendProduct.sku,
    // Pricing
    pricePerHour,
    pricePerDay,
    pricePerWeek,
    salesPrice: backendProduct.salesPrice,
    costPrice: backendProduct.costPrice,
    // Availability
    availableQuantity: backendProduct.quantityOnHand || 0,
    quantity: backendProduct.quantityOnHand || 0,
    isRentable: backendProduct.isRentable || false,
    // Images
    images,
    imageUrl: backendProduct.imageUrl || images[0] || '/placeholder.svg',
    // Attributes - Map array of {category: {name}, value: {value}} to flat object
    attributes: Array.isArray(backendProduct.attributes) 
      ? backendProduct.attributes.reduce((acc, attr) => {
          if (attr.category?.name && attr.value?.value) {
            acc[attr.category.name] = attr.value.value;
          }
          return acc;
        }, {})
      : (backendProduct.attributes || {}),

    // Vendor info
    vendor: backendProduct.vendor,
    vendorId: backendProduct.vendor?.id,
    // Variants
    variants: backendProduct.variants || [],
    // Tags
    tags: backendProduct.tags || [],
    // Status
    status: backendProduct.status,
    isPublished: backendProduct.status === 'PUBLISHED',
    // Dates
    createdAt: backendProduct.createdAt,
    updatedAt: backendProduct.updatedAt,
    // Keep original rentalPricing for reference
    rentalPricing: rentalPricing,
  };
};

/**
 * Maps multiple backend products to frontend format
 * @param {Array} backendProducts - Array of products from backend API
 * @returns {Array} Array of products in frontend format
 */
export const mapBackendProductsToFrontend = (backendProducts) => {
  if (!Array.isArray(backendProducts)) return [];
  return backendProducts.map(mapBackendProductToFrontend).filter(Boolean);
};
