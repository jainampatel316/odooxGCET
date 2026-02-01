import prisma from "../lib/prisma.js";
import { updateInventory } from "../services/inventory.service.js";

// Get all products for the logged-in vendor
export const getVendorProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { vendorId: req.user.id },
      include: {
        variants: true,
        rentalPricing: true,
        attributes: { include: { category: true, value: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching products" });
  }
};

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      sku,
      costPrice,
      salesPrice,
      hourlyPrice,
      dailyPrice,
      isRentable,
      quantityOnHand,
      status, // DRAFT, PUBLISHED
      imageUrl,
      tags,
      attributes, // Array of {categoryId, valueId}
    } = req.body;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create product
      const product = await tx.product.create({
        data: {
          name,
          description,
          sku,
          vendorId: req.user.id,
          costPrice,
          salesPrice,
          isRentable: isRentable !== undefined ? isRentable : true,
          quantityOnHand: quantityOnHand || 0,
          status: status || "DRAFT",
          imageUrl,
          tags,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
      });

      // Log initial inventory if quantity > 0
      if (quantityOnHand && quantityOnHand > 0) {
        await updateInventory({
          productId: product.id,
          movementType: 'INITIAL_STOCK',
          quantity: quantityOnHand,
          userId: req.user.id,
          reason: 'Initial stock when product was created',
          notes: `Product "${name}" created with ${quantityOnHand} units`,
          transaction: tx,
        });
      }

      // Create rental pricing (HOURLY, DAILY) when provided
      const pricingToCreate = [];
      if (hourlyPrice != null && Number(hourlyPrice) >= 0) {
        pricingToCreate.push({
          productId: product.id,
          periodType: "HOURLY",
          periodValue: 1,
          price: Number(hourlyPrice),
        });
      }
      if (dailyPrice != null && Number(dailyPrice) >= 0) {
        pricingToCreate.push({
          productId: product.id,
          periodType: "DAILY",
          periodValue: 1,
          price: Number(dailyPrice),
        });
      }
      if (pricingToCreate.length > 0) {
        await tx.rentalPricing.createMany({ data: pricingToCreate });
      }

      // Create product attributes if provided
      if (attributes && Array.isArray(attributes) && attributes.length > 0) {
        const attributesToCreate = attributes.map(attr => ({
          productId: product.id,
          categoryId: attr.categoryId,
          valueId: attr.valueId,
        }));
        await tx.productAttribute.createMany({ data: attributesToCreate });
      }

      // Fetch complete product with relations
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          rentalPricing: true,
          attributes: {
            include: {
              category: true,
              value: true,
            },
          },
          inventoryLogs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

// Update a product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { hourlyPrice, dailyPrice, quantityOnHand, attributes, ...rest } = req.body;

    // Ensure product belongs to this vendor
    const existing = await prisma.product.findFirst({
      where: { id, vendorId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    // Use transaction for inventory updates
    const result = await prisma.$transaction(async (tx) => {
      // Handle quantity change if provided
      if (quantityOnHand !== undefined && quantityOnHand !== existing.quantityOnHand) {
        const diff = quantityOnHand - existing.quantityOnHand;
        
        await updateInventory({
          productId: id,
          movementType: diff > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          quantity: diff,
          userId: req.user.id,
          reason: 'Manual inventory adjustment',
          notes: `Quantity adjusted from ${existing.quantityOnHand} to ${quantityOnHand}`,
          transaction: tx,
        });
      }

      // Update product
      const product = await tx.product.update({
        where: { id },
        data: {
          ...rest,
          ...(quantityOnHand !== undefined && { quantityOnHand }),
          publishedAt: rest.status === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt,
        },
      });

      // Upsert rental pricing: remove existing HOURLY/DAILY for this product, then create new
      await tx.rentalPricing.deleteMany({
        where: { productId: id, periodType: { in: ["HOURLY", "DAILY"] } },
      });

      const pricingToCreate = [];
      if (hourlyPrice != null && Number(hourlyPrice) >= 0) {
        pricingToCreate.push({
          productId: id,
          periodType: "HOURLY",
          periodValue: 1,
          price: Number(hourlyPrice),
        });
      }
      if (dailyPrice != null && Number(dailyPrice) >= 0) {
        pricingToCreate.push({
          productId: id,
          periodType: "DAILY",
          periodValue: 1,
          price: Number(dailyPrice),
        });
      }
      if (pricingToCreate.length > 0) {
        await tx.rentalPricing.createMany({ data: pricingToCreate });
      }

      // Update product attributes if provided
      if (attributes && Array.isArray(attributes)) {
        // Remove existing attributes
        await tx.productAttribute.deleteMany({
          where: { productId: id },
        });
        
        // Add new attributes
        if (attributes.length > 0) {
          const attributesToCreate = attributes.map(attr => ({
            productId: id,
            categoryId: attr.categoryId,
            valueId: attr.valueId,
          }));
          await tx.productAttribute.createMany({ data: attributesToCreate });
        }
      }

      // Fetch complete product with relations
      return tx.product.findUnique({
        where: { id },
        include: {
          rentalPricing: true,
          attributes: {
            include: {
              category: true,
              value: true,
            },
          },
          inventoryLogs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

// Add Pricing for a product
export const addProductPricing = async (req, res) => {
  try {
    const { productId } = req.params;
    const { periodType, periodValue, price, minDuration, maxDuration } = req.body;

    // Verify ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId: req.user.id },
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    const pricing = await prisma.rentalPricing.create({
      data: {
        productId,
        periodType,
        periodValue: periodValue || 1,
        price,
        minDuration,
        maxDuration,
      },
    });

    res.status(201).json(pricing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error adding pricing" });
  }
};

// Create Product Variant
export const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, sku, costPrice, salesPrice, quantityOnHand, attributes } = req.body;

    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId: req.user.id },
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        name,
        sku,
        costPrice,
        salesPrice,
        quantityOnHand,
        attributes, // Expects JSON e.g. { color: "Red" }
      },
    });

    res.status(201).json(variant);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating variant" });
  }
};

// Get inventory history for a product
export const getProductInventoryHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50, offset = 0, movementType } = req.query;

    // Verify ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, vendorId: req.user.id },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    // Get inventory history
    const history = await prisma.inventoryLog.findMany({
      where: {
        productId,
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
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Get total count
    const total = await prisma.inventoryLog.count({
      where: {
        productId,
        ...(movementType && { movementType }),
      },
    });

    res.json({
      history,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + history.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({ message: "Error fetching inventory history", error: error.message });
  }
};