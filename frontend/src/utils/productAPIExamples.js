/**
 * Product API Usage Examples
 * 
 * This file documents all product API invocations with examples.
 * All APIs use the base path: /products/products (due to backend route structure)
 */

import { productAPI } from './api';

/**
 * Example 1: Get all products with pagination
 * GET /products/products?page=1&limit=20
 */
export const example1_getProductsWithPagination = async () => {
  return await productAPI.getProducts({
    page: 1,
    limit: 20,
  });
};

/**
 * Example 2: Search products
 * GET /products/products?search=camera&page=1
 */
export const example2_searchProducts = async (searchTerm) => {
  return await productAPI.getProducts({
    search: searchTerm,
    page: 1,
    limit: 20,
  });
};

/**
 * Example 3: Filter by vendor
 * GET /products/products?vendorId=vendor-uuid-here
 */
export const example3_filterByVendor = async (vendorId) => {
  return await productAPI.getProducts({
    vendorId: vendorId,
    page: 1,
    limit: 20,
  });
};

/**
 * Example 4: Filter by sales price range
 * GET /products/products?minPrice=1000&maxPrice=5000
 */
export const example4_filterBySalesPrice = async (minPrice, maxPrice) => {
  return await productAPI.getProducts({
    minPrice: minPrice,
    maxPrice: maxPrice,
    page: 1,
    limit: 20,
  });
};

/**
 * Example 5: Filter by rental price
 * GET /products/products?rentalPeriodType=DAILY&minRentalPrice=100&maxRentalPrice=500
 */
export const example5_filterByRentalPrice = async (periodType, minRentalPrice, maxRentalPrice) => {
  return await productAPI.getProducts({
    rentalPeriodType: periodType, // HOURLY, DAILY, WEEKLY, MONTHLY
    minRentalPrice: minRentalPrice,
    maxRentalPrice: maxRentalPrice,
    page: 1,
    limit: 20,
  });
};

/**
 * Example 6: Filter by tags
 * GET /products/products?tags=electronics,photography
 */
export const example6_filterByTags = async (tags) => {
  // tags can be array or comma-separated string
  const tagsString = Array.isArray(tags) ? tags.join(',') : tags;
  return await productAPI.getProducts({
    tags: tagsString,
    page: 1,
    limit: 20,
  });
};

/**
 * Example 7: Filter by attributes
 * GET /products/products?attributes={"Color":"Red","Size":"Large"}
 */
export const example7_filterByAttributes = async (attributes) => {
  // attributes should be an object like { Color: "Red", Size: "Large" }
  return await productAPI.getProducts({
    attributes: attributes, // Will be JSON stringified automatically
    page: 1,
    limit: 20,
  });
};

/**
 * Example 8: Combined filters with sorting
 * GET /products/products?search=camera&minPrice=1000&tags=electronics&sortBy=salesPrice&sortOrder=asc
 */
export const example8_combinedFiltersWithSorting = async () => {
  return await productAPI.getProducts({
    search: 'camera',
    minPrice: 1000,
    tags: 'electronics',
    sortBy: 'salesPrice',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
  });
};

/**
 * Example 9: Get filter options
 * GET /products/products/filters
 */
export const example9_getFilterOptions = async () => {
  return await productAPI.getFilterOptions();
};

/**
 * Example 10: Check product availability
 * POST /products/products/check-availability
 */
export const example10_checkAvailability = async (productId, variantId, startDate, endDate, quantity) => {
  return await productAPI.checkAvailability(
    productId,
    variantId || null, // optional
    startDate, // ISO string format
    endDate,   // ISO string format
    quantity || 1
  );
};

/**
 * Helper: Build complex query with all filters
 */
export const buildProductQuery = ({
  page = 1,
  limit = 20,
  search,
  vendorId,
  isRentable,
  minPrice,
  maxPrice,
  rentalPeriodType,
  minRentalPrice,
  maxRentalPrice,
  tags,
  attributes,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  const queryParams = {
    page,
    limit,
  };

  // Add optional filters only if they have values
  if (search) queryParams.search = search;
  if (vendorId) queryParams.vendorId = vendorId;
  if (isRentable !== undefined) queryParams.isRentable = isRentable ? 'true' : 'false';
  if (minPrice) queryParams.minPrice = minPrice;
  if (maxPrice) queryParams.maxPrice = maxPrice;
  if (rentalPeriodType) queryParams.rentalPeriodType = rentalPeriodType;
  if (minRentalPrice) queryParams.minRentalPrice = minRentalPrice;
  if (maxRentalPrice) queryParams.maxRentalPrice = maxRentalPrice;
  if (tags) queryParams.tags = Array.isArray(tags) ? tags.join(',') : tags;
  if (attributes && Object.keys(attributes).length > 0) queryParams.attributes = attributes;
  if (sortBy) queryParams.sortBy = sortBy;
  if (sortOrder) queryParams.sortOrder = sortOrder;

  return queryParams;
};
