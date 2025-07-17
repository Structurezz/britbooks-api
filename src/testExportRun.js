import mongoose from 'mongoose';
import { generateOrderExport } from './lib/jobs/generateOrderExport.js';

import { config } from 'dotenv';
config(); // Load env vars like DB connection

await mongoose.connect(process.env.MONGODB_URI);
await generateOrderExport();
await mongoose.disconnect();