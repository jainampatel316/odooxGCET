import prisma from "../lib/prisma.js";

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
    } = req.body;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        sku,
        vendorId: req.user.id,
        costPrice,
        salesPrice,
        isRentable: isRentable !== undefined ? isRentable : true,
        quantityOnHand,
        status: status || "DRAFT",
        imageUrl,
        tags,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

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
      await prisma.rentalPricing.createMany({ data: pricingToCreate });
    }

    const productWithPricing = await prisma.product.findUnique({
      where: { id: product.id },
      include: { rentalPricing: true },
    });

    res.status(201).json(productWithPricing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating product" });
  }
};

// Update a product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { hourlyPrice, dailyPrice, ...rest } = req.body;
    const data = rest;

    // Ensure product belongs to this vendor
    const existing = await prisma.product.findFirst({
      where: { id, vendorId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.status === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
    });

    // Upsert rental pricing: remove existing HOURLY/DAILY for this product, then create new
    await prisma.rentalPricing.deleteMany({
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
      await prisma.rentalPricing.createMany({ data: pricingToCreate });
    }

    const productWithPricing = await prisma.product.findUnique({
      where: { id },
      include: { rentalPricing: true },
    });

    res.json(productWithPricing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating product" });
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