// Load .env from the backend folder (works even when run from project root)
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Log uncaught errors so we see why the process might exit
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function main() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  }));

  const authRouter = (await import('./src/routes/auth.routes.js')).default;
  const productRouter = (await import('./src/routes/product.routes.js')).default;
  const vendorRouter = (await import('./src/routes/vendor.routes.js')).default;
  const cartRouter = (await import('./src/routes/cart.routes.js')).default;
  const customerRouter = (await import('./src/routes/customer.routes.js')).default;

  app.use("/auth", authRouter);
  app.use("/products", productRouter);
  app.use("/vendor", vendorRouter);
  app.use("/cart", cartRouter);
  app.use("/", customerRouter);

  const PORT = Number(process.env.PORT) || 4000;
  const server = app.listen(PORT, () => {
    console.log('Server running on http://localhost:' + PORT);
  });

  // Background Task: Check for overdue orders every 24 hours
  const startLateFeeScheduler = async () => {
    const { processOverdueOrders } = await import('./src/services/lateFee.service.js');
    console.log('[Scheduler] Initializing Late Fee Scheduler...');
    
    // Run once on startup (optional, good for dev testing, maybe comment out for prod if needed)
    // await processOverdueOrders(); 

    // Schedule: Every 24 hours (86400000 ms)
    setInterval(() => {
      console.log('[Scheduler] Running scheduled overdue check...');
      processOverdueOrders();
    }, 24 * 60 * 60 * 1000); 
  };

  startLateFeeScheduler();

  // Test Endpoint for Late Fees (Admin only ideally, but public for dev)
  app.post('/api/admin/run-late-fees', async (req, res) => {
    try {
      const { processOverdueOrders } = await import('./src/services/lateFee.service.js');
      await processOverdueOrders();
      res.json({ message: 'Overdue processing triggered successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  server.on('error', (err) => {

    if (err.code === 'EADDRINUSE') {
      console.error('Port', PORT, 'is already in use.');
      console.error('Either stop the other process or run: set PORT=4001 && npm start');
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});


////////////////////////////////////////////////////////////



