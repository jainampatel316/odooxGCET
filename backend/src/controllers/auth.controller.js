import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/tokens.js";


// ================= REGISTER =================
export const registerUser = async (req, res) => {
  try {
    const { email, password, name, role, companyName, gstin, signupCouponCode } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: "Email, password, and name are required" 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: "Invalid email format" 
      });
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    // Determine the role (prioritize req.body, fallback to req.user if available)
    const userRole = role || req.user?.role || 'CUSTOMER';

    // Validate role
    const validRoles = ['CUSTOMER', 'VENDOR'];
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ 
        message: "Invalid role. Must be CUSTOMER or VENDOR" 
      });
    }

    // Role-specific validation for VENDOR
    if (userRole === 'VENDOR') {
      if (!companyName) {
        return res.status(400).json({ 
          message: "Company name is required for vendor registration" 
        });
      }

      if (!gstin) {
        return res.status(400).json({ 
          message: "GSTIN is required for vendor registration" 
        });
      }

      // GSTIN format validation (15 characters alphanumeric)
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstin)) {
        return res.status(400).json({ 
          message: "Invalid GSTIN format" 
        });
      }

      // Check if GSTIN already exists
      const existingGstin = await prisma.user.findUnique({
        where: { gstin },
      });

      if (existingGstin) {
        return res.status(400).json({ 
          message: "GSTIN already registered" 
        });
      }
    }

    // Check existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: "User with this email already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data based on role
    const userData = {
      email,
      name,
      password: hashedPassword,
      role: userRole,
    };

    // Add vendor-specific fields if role is VENDOR
    if (userRole === 'VENDOR') {
      userData.companyName = companyName;
      userData.gstin = gstin;
    }

    // Add signup coupon code if provided (optional for both)
    if (signupCouponCode) {
      userData.signupCouponCode = signupCouponCode;
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
    });

    // Return success response (exclude password)
    return res.status(201).json({
      message: `${userRole === 'VENDOR' ? 'Vendor' : 'Customer'} registered successfully`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...(userRole === 'VENDOR' && {
          companyName: user.companyName,
          gstin: user.gstin,
        }),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return res.status(400).json({ 
        message: `${field} already exists` 
      });
    }
    
    res.status(500).json({ 
      message: "Server error during registration" 
    });
  }
};


// ================= LOGIN =================
export const loginUser = async (req, res) => {
  try {
    const { email, password} = req.body;

    // find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // compare password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // save refresh token in DB

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 min
    });

    res.json({
        message: "User logged in Successfully",
        role:user.role
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutUser = async (req, res) => {
  try {

    if (req.userId) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { refresh_token: null },
      });
    }

    res.clearCookie("accessToken");

    res.json({ message: "Logged out successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
