import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from '../routes/authRoutes.js';
import barterRoutes from '../routes/barterRoutes.js';
import cryptoTransactionRoutes from '../routes/cryptoRoutes.js';
import forexTransactionRoutes from '../routes/forexRoutes.js';
import investmentRoutes from '../routes/investmentRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import stockRoutes from '../routes/stockRoutes.js';
import supportRoutes from '../routes/supportRoutes.js';
import walletRoutes from '../routes/walletRoutes.js';
import utilityRoutes from '../routes/utilityRoutes.js';
import accountAggregationRoutes from '../routes/accountAggregationRoutes.js';
import marketPlaceRoutes from '../routes/marketPlaceRoutes.js';
import { startWatchingIncomingFiles } from '../lib/config/ftp/watchIncomingFolders.js';
import { generateOrderExport } from '../lib/jobs/generateOrderExport.js';
import { startFtpServer } from '../lib/config/ftp/ftpServer.js';
import { startSftpServer } from '../lib/config/sftp/sftpServer.js';
import { startOrderResponseWatcher } from '../lib/integration/orderResponseWatcher.js';
import { startEagleResponseWatcher } from '../lib/integration/eagleOrderResponseWatcher.js';

import { setupFtpFolders } from '../lib/config/ftp/ftp-setup.js';
import {worker, enrichListing, redis } from '../lib/config/enrichmentWorker.js';

import connectDB from '../lib/config/db.js';

dotenv.config();

const app = express();



// Middleware Setup
app.use(express.json());   
app.use(cors());           
app.use(morgan('dev'));    
app.set('redis', redis);

setupFtpFolders();
startWatchingIncomingFiles();
// Start the enrichment worker
worker.on('completed', (job) => {
    console.log(`Job completed: ${job.id}`);
});

startFtpServer();

startSftpServer();

startOrderResponseWatcher();

startEagleResponseWatcher();

connectDB();


// Import Routes
app.use('/api/auth', authRoutes);
app.use('/api', barterRoutes);
app.use('/api', cryptoTransactionRoutes);
app.use('/api/forex', forexTransactionRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/utility', utilityRoutes);
app.use('/api', accountAggregationRoutes);
app.use('/api/market', marketPlaceRoutes);



// 404 handler for unmatched routes
app.use((req, res, next) => {
    const error = new Error('Route not found');
    error.status = 404;
    next(error);
});

// Global Error Handler
app.use((error, req, res, next) => {
    const statusCode = error.status || 500;
    const message = error.message || 'Internal Server Error';
    res.status(statusCode).json({ error: message });
});

// Create and export the server instance (not yet started)
const server = app.listen(process.env.PORT || 8000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);

    generateOrderExport().catch((err) => {
        console.error('❌ Order export failed on server start:', err);
    });
});

// Export app and server
export { app, server };
