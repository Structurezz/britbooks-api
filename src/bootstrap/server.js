// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from '../routes/authRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import supportRoutes from '../routes/supportRoutes.js';
import walletRoutes from '../routes/walletRoutes.js';
import accountAggregationRoutes from '../routes/accountAggregationRoutes.js';
import marketPlaceRoutes from '../routes/marketPlaceRoutes.js';

import { startWatchingIncomingFiles } from '../lib/config/ftp/watchIncomingFolders.js';
import { generateOrderExport } from '../lib/jobs/generateOrderExport.js';
import { startFtpServer } from '../lib/config/ftp/ftpServer.js';
import { startSftpServer } from '../lib/config/sftp/sftpServer.js';
import { startOrderResponseWatcher } from '../lib/integration/orderResponseWatcher.js';
import { startEagleResponseWatcher } from '../lib/integration/eagleOrderResponseWatcher.js';
import { setupFtpFolders } from '../lib/config/ftp/ftp-setup.js';

import { enrichmentQueue } from '../lib/config/enrichmentWorker.js';
import connectDB from '../lib/config/db.js';
import userRoutes from '../routes/userRoutes.js';
import paymentRoutes from '../routes/paymentRoutes.js';

dotenv.config();

// Create express app
const app = express();
let server = null;

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api', accountAggregationRoutes);
app.use('/api/market', marketPlaceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// 404 Handler
app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.status = 404;
  next(error);
});

// Error Handler
app.use((error, req, res, next) => {
  const statusCode = error.status || 500;
  const message = error.message || 'Internal Server Error';
  res.status(statusCode).json({ error: message });
});

// Startup tasks — exported async function
async function initServices() {
  try {
    await connectDB();
    console.log('✅ Database connected');

    setupFtpFolders();
    startWatchingIncomingFiles();
    startFtpServer();
    startSftpServer();
    startOrderResponseWatcher();
    startEagleResponseWatcher();

    enrichmentQueue.on('ready', () => {
      console.log('📥 Enrichment queue ready');
    });

    const PORT = process.env.PORT || 8000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    await generateOrderExport().catch((err) => {
      console.error('❌ Order export failed on server start:', err);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

await initServices();

// Export for external use
export { app, server };
