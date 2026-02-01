// ================= GET PRODUCTS WITH FILTERS =================
import prisma from "../lib/prisma.js";
import { getAvailableInventory } from '../services/inventory.service.js';

export const getProducts = async (req, res) => {
  try {
    const {
      // Pagination
      page = 1,
      limit = 20,
      
      // Search
      search,
      
      // Filters
      vendorId,
      isRentable,
      status,
      minPrice,
      maxPrice,
      tags,
      
      // Rental pricing filters
      rentalPeriodType,
      minRentalPrice,
      maxRentalPrice,
      
      // Attribute filters (passed as JSON string or object)
      attributes, // e.g., {"Color": "Red", "Size": "Large"}
      
      // Sorting
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build where clause
    const where = {
      // Only show published products to customers
      status: 'PUBLISHED',
    };

    // Search filter (product name, description, SKU)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Vendor filter
    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Rentable filter: only restrict when explicitly "false" (show non-rentable only).
    // When "true" or not sent, show all published products so listing is never empty due to this.
    if (isRentable === 'false') {
      where.isRentable = false;
    }

    // Status filter (for admin/vendor views, but customers only see PUBLISHED)
    if (status && req.user?.role !== 'CUSTOMER') {
      where.status = status;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.salesPrice = {};
      if (minPrice) where.salesPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.salesPrice.lte = parseFloat(maxPrice);
    }

    // Tags filter
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      where.tags = {
        hasSome: tagsArray,
      };
    }

    // Attribute filters
    let attributeFilter = null;
    if (attributes) {
      try {
        const attrObj = typeof attributes === 'string' 
          ? JSON.parse(attributes) 
          : attributes;
        
        // We'll filter by attributes after fetching products
        attributeFilter = attrObj;
      } catch (error) {
        console.error('Invalid attributes JSON:', error);
      }
    }

    // Rental pricing filter: only apply when filtering by price range.
    // Do NOT require rental pricing when only rentalPeriodType is sent (e.g. "DAILY"),
    // otherwise products without RentalPricing rows (e.g. newly added) would be excluded.
    const rentalPricingWhere = {};
    if (minRentalPrice || maxRentalPrice) {
      if (rentalPeriodType) rentalPricingWhere.periodType = rentalPeriodType;
      rentalPricingWhere.price = {};
      if (minRentalPrice) rentalPricingWhere.price.gte = parseFloat(minRentalPrice);
      if (maxRentalPrice) rentalPricingWhere.price.lte = parseFloat(maxRentalPrice);
    }

    if (Object.keys(rentalPricingWhere).length > 0) {
      where.rentalPricing = {
        some: {
          isActive: true,
          ...rentalPricingWhere,
        },
      };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'name',
      'salesPrice',
      'costPrice',
      'quantityOnHand',
    ];
    const orderBy = {};
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Fetch products with relations
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
            },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              sku: true,
              salesPrice: true,
              costPrice: true,
              quantityOnHand: true,
              attributes: true,
            },
          },
          rentalPricing: {
            where: { isActive: true },
            orderBy: { periodType: 'asc' },
            select: {
              id: true,
              periodType: true,
              periodValue: true,
              price: true,
              minDuration: true,
              maxDuration: true,
            },
          },
          attributes: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              value: {
                select: {
                  id: true,
                  value: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Filter by attributes if provided
    let filteredProducts = products;
    if (attributeFilter && Object.keys(attributeFilter).length > 0) {
      filteredProducts = products.filter(product => {
        const attrs = product.attributes || [];
        return Object.entries(attributeFilter).every(([categoryName, value]) => {
          return attrs.some(attr => 
            attr?.category?.name === categoryName && 
            attr?.value?.value === value
          );
        });
      });
    }

    // Format products for response
    const formattedProducts = filteredProducts.map(product => {
      // Group attributes by category (guard for missing attributes relation)
      const productAttributes = {};
      (product.attributes || []).forEach(attr => {
        if (attr?.category?.name != null && attr?.value?.value != null) {
          productAttributes[attr.category.name] = attr.value.value;
        }
      });

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        sku: product.sku,
        costPrice: product.costPrice,
        salesPrice: product.salesPrice,
        isRentable: product.isRentable,
        quantityOnHand: product.quantityOnHand,
        status: product.status,
        imageUrl: product.imageUrl,
        images: product.images,
        tags: product.tags,
        attributes: productAttributes,
        vendor: product.vendor,
        variants: product.variants,
        rentalPricing: product.rentalPricing,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    return res.status(200).json({
      success: true,
      data: formattedProducts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        search: search || null,
        vendorId: vendorId || null,
        isRentable: isRentable || null,
        status: status || null,
        priceRange: {
          min: minPrice || null,
          max: maxPrice || null,
        },
        rentalPriceRange: {
          min: minRentalPrice || null,
          max: maxRentalPrice || null,
        },
        rentalPeriodType: rentalPeriodType || null,
        tags: tags || null,
        attributes: attributeFilter || null,
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products',
      error: error.message,
    });
  }
};

// ================= GET SINGLE PRODUCT BY ID =================
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            gstin: true,
          },
        },
        variants: {
          where: { isActive: true },
          include: {
            rentalPricing: {
              where: { isActive: true },
            },
          },
        },
        rentalPricing: {
          where: { isActive: true },
          orderBy: { periodType: 'asc' },
        },
        attributes: {
          include: {
            category: true,
            value: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if customer is allowed to view this product
    if (product.status !== 'PUBLISHED' && req.user?.role === 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Product not available',
      });
    }

    // Group attributes by category
    const productAttributes = {};
    product.attributes.forEach(attr => {
      productAttributes[attr.category.name] = attr.value.value;
    });

    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      costPrice: product.costPrice,
      salesPrice: product.salesPrice,
      isRentable: product.isRentable,
      quantityOnHand: product.quantityOnHand,
      status: product.status,
      imageUrl: product.imageUrl,
      images: product.images,
      tags: product.tags,
      attributes: productAttributes,
      vendor: product.vendor,
      variants: product.variants,
      rentalPricing: product.rentalPricing,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      publishedAt: product.publishedAt,
    };

    return res.status(200).json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message,
    });
  }
};

// ================= GET FILTER OPTIONS =================
// This endpoint returns all available filter options for the frontend
export const getFilterOptions = async (req, res) => {
  try {
    // Get all unique tags
    const productsWithTags = await prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { tags: true },
    });
    
    const allTags = [...new Set(productsWithTags.flatMap(p => p.tags))].sort();

    // Get all vendors who have published products
    const vendors = await prisma.user.findMany({
      where: {
        role: 'VENDOR',
        products: {
          some: {
            status: 'PUBLISHED',
          },
        },
      },
      select: {
        id: true,
        name: true,
        companyName: true,
      },
    });

    // Get all attribute categories and their values
    const attributeCategories = await prisma.attributeCategory.findMany({
      include: {
        values: {
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            value: true,
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Get rental period types available
    const rentalPeriodTypes = await prisma.rentalPricing.findMany({
      where: { isActive: true },
      distinct: ['periodType'],
      select: { periodType: true },
    });

    // Get price range
    const priceRange = await prisma.product.aggregate({
      where: { status: 'PUBLISHED' },
      _min: { salesPrice: true },
      _max: { salesPrice: true },
    });

    // Get rental price range
    const rentalPriceRange = await prisma.rentalPricing.aggregate({
      where: { isActive: true },
      _min: { price: true },
      _max: { price: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        tags: allTags,
        vendors: vendors.map(v => ({
          id: v.id,
          name: v.companyName || v.name,
        })),
        attributes: attributeCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          values: cat.values,
        })),
        rentalPeriodTypes: rentalPeriodTypes.map(rp => rp.periodType),
        priceRange: {
          min: priceRange._min.salesPrice || 0,
          max: priceRange._max.salesPrice || 0,
        },
        rentalPriceRange: {
          min: rentalPriceRange._min.price || 0,
          max: rentalPriceRange._max.price || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching filter options',
      error: error.message,
    });
  }
};

// ================= CHECK PRODUCT AVAILABILITY =================
export const checkProductAvailability = async (req, res) => {
  try {
    const { productId, variantId, startDate, endDate, quantity = 1 } = req.body;

    // Validation
    if (!productId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, start date, and end date are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    // Use inventory service to get available quantity
    const availableQuantity = await getAvailableInventory(
      productId,
      variantId,
      start,
      end
    );

    // Get total stock for reference
    let totalStock;
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { quantityOnHand: true },
      });
      totalStock = variant?.quantityOnHand || 0;
    } else {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { quantityOnHand: true },
      });
      totalStock = product?.quantityOnHand || 0;
    }

    const reservedQuantity = totalStock - availableQuantity;
    const isAvailable = availableQuantity >= quantity;

    return res.status(200).json({
      success: true,
      data: {
        isAvailable,
        requestedQuantity: quantity,
        availableQuantity: Math.max(0, availableQuantity),
        totalStock,
        reservedQuantity,
        message: isAvailable 
          ? `${availableQuantity} units available for your selected dates`
          : `Only ${availableQuantity} units available. ${quantity - availableQuantity} more needed.`
      },
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking availability',
      error: error.message,
    });
  }
};