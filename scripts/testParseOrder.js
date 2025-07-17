import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseOrderResponseCSV } from '../src/lib/integration/parseEagleOrderResponse.js';
import { config } from 'dotenv';

config(); // Load environment variables

// Needed to resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.resolve(__dirname, '../src/ftp-root/staging/incoming/orders/d.csv');

async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    console.log('🚀 Starting test of Eagle order response parsing...');
    await parseOrderResponseCSV(filePath);
    console.log('✅ Test complete');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
