# 🏠 Rental Management System (RMS)

A **full-stack Rental Management System** designed to digitize and optimize the complete rental lifecycle — from product discovery and quotation to invoicing, payments, pickup, return, and analytics.

Built with **scalability, data integrity, and real-world ERP workflows** in mind.

---

## 🚀 Project Overview

The **Rental Management System (RMS)** enables businesses to rent products online while efficiently managing:

* Rental quotations
* Inventory reservations
* Rental orders
* Invoices & payments
* Pickup & return flows
* Dashboards & reports

The system supports **role-based access** for **Customers, Vendors, and Admins**, ensuring secure and structured operations.

---

## 🎯 Key Objectives

* Implement an **end-to-end rental lifecycle**
* Prevent **overbooking** using reservation logic
* Support **flexible rental durations** (hourly, daily, weekly, custom)
* Enable **partial & full payments**
* Provide **business insights through dashboards**

---

## 👥 User Roles

### 👤 Customer

* Browse rentable products
* Create rental quotations
* Confirm orders & make payments
* View invoices and order history

### 🏪 Vendor

* Manage rental products
* Process rental orders
* Track pickups, returns & earnings
* Generate invoices

### 🛡️ Admin

* Full system access
* Manage users, vendors & configurations
* View global reports & analytics

---

## 🧩 Core Functional Modules

### 🔐 Authentication & User Management

* Email & password login
* Secure signup with:

  * Company details
  * GSTIN (mandatory for invoicing)
* Forgot password with email verification
* Coupon code support during signup

---

### 📦 Rental Product Management

* Rentable product configuration
* Pricing by:

  * Hour
  * Day
  * Week
  * Custom duration
* Stock quantity tracking
* Variant-based pricing
* Publish / Unpublish products

---

### 📝 Rental Quotations & Orders

**Flow:**

1. **Quotation** – Editable cart-based price proposal
2. **Rental Order** – Created on confirmation
3. **Reservation Logic** – Prevents double booking

**Order Status:**

```
Draft → Sent → Confirmed
```

---

### 🚚 Pickup & Return Flow

* Pickup document generated on order confirmation
* Inventory moved to **“With Customer”**
* Automated return processing
* Late return fee calculation
* Stock restored after return

---

### 💰 Invoicing & Payments

* Draft invoices generated from rental orders
* Supports:

  * Full upfront payment
  * Partial payment / security deposit
* Automatic tax calculation
* Invoice export (PDF)
* Online payment gateway integration

---

### 🌐 Website & Customer Portal

* Product listing with filters
* Rental configuration on product page
* Cart & checkout flow
* Address & payment selection
* Order tracking & invoice download

---

### ⚙️ Settings & Configuration

* Rental duration rules
* Product attributes & variants
* Role management
* GST & company configuration

---

### 📊 Reports & Dashboards

**Dashboards include:**

* Total rental revenue
* Most rented products
* Vendor-wise performance
* Rental trends over time

**Reports:**

* Exportable (PDF, CSV, XLSX)
* Date-range filters
* Separate views for Admin & Vendor

---

## 🧠 Key Terminology

* **Quotation** – Price proposal before order confirmation
* **Rental Order** – Confirmed rental agreement
* **Reservation** – Blocks inventory for a time range
* **Invoice** – Legal payment document
* **Security Deposit** – Refundable upfront protection amount

---

## 🛠️ Tech Stack

### Backend

* **Node.js**
* **Express.js**
* **PostgreSQL**
* **Prisma ORM**

### Frontend

* **React.js**
* **REST APIs**

### Architecture

* Modular & scalable
* Role-based access control (RBAC)
* Optimized relational database design
* Transaction-safe inventory handling

---

## 🧱 Database Design Highlights

* UUID-based primary keys
* Strong relational integrity
* Indexing for high-frequency queries
* Reservation-based stock locking
* Normalized schema for scalability

---

## 📦 Deliverables (Hackathon Ready)

✔ Functional rental flow (Quotation → Order → Invoice → Return)
✔ Website + Backend integration
✔ Role-based access control
✔ User based dashboard/report
✔ Clean, business-aligned UI

---

## 📌 How to Run the Project (Basic)

```bash
# Clone the repository
git clone <repo-url>

# Install dependencies
npm install

# Setup environment variables
DATABASE_URL=postgresql://...

# Run migrations
npx prisma migrate dev

# Start backend
npm run dev
```

---

## 📈 Learning Outcomes

* Real-world ERP workflow modeling
* Inventory & reservation system design
* Full-stack system thinking
* Clean database architecture
* Business-oriented software design

---

## 👩‍💻 Contributors

Built with 💙 during a hackathon to demonstrate **production-grade system design**.

---

