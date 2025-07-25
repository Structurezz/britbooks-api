import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { Order } from '../../app/models/Order.js';
import dotenv from 'dotenv';
import { stringify } from 'csv-stringify/sync';

dotenv.config();

const EXPORT_DIR = path.resolve('./src/ftp-root/staging/outgoing/orders');
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/britbook';

export async function generateOrderExport() {
  console.log('✅ Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  console.log('🚀 Running order export job...');

  const filter = {
    type: 'order',
    status: 'confirmed',
  };

  console.log(`🔍 Fetching orders with filter:`, filter);

  const orders = await Order.find(filter).populate('items.listing').limit(50);
  console.log(`📦 Found ${orders.length} orders.`);

  const records = [];

  for (const order of orders) {
    console.log(`🔍 Processing order: ${order._id}`);

    for (const item of order.items) {
      const listing = item.listing;

      if (!listing || !listing.inventory || !listing.inventory.inventorySyncId) {
        console.warn(`⚠️ Skipping item for order ${order._id}: Missing listing or inventorySyncId.`);
        continue;
      }

      const sku = listing.inventory.inventorySyncId;
      const orderDate = dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss');
      const fullName = order.shippingAddress?.fullName || 'Unknown';
      const address = order.shippingAddress
        ? `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.country}`
        : 'Unknown';

      console.log(`✅ Writing row: SKU=${sku}, Qty=${item.quantity}, Order=${order._id}`);

      records.push([
        order._id.toString(),
        orderDate,
        sku,
        item.quantity,
        item.priceAtPurchase,
        fullName,
        address,
      ]);
    }
  }

  if (records.length === 0) {
    console.log('ℹ️ No valid items to export.');
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    return;
  }

  const filename = `orders_${dayjs().format('YYYY-MM-DD_HH-mm')}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  const header = [
    'Order ID',
    'Order Date',
    'SKU',
    'Quantity',
    'Price',
    'Customer Name',
    'Shipping Address',
  ];

  const csvContent = stringify([header, ...records], {
    quoted: true,
  });

  fs.writeFileSync(filepath, csvContent);
  console.log(`✅ Exported ${records.length} rows to ${filename}`);

  await mongoose.disconnect();
  console.log('🔌 MongoDB disconnected');
}

// ESM script execution check
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  generateOrderExport().catch(async (err) => {
    console.error('❌ Failed to generate order export:', err);
    await mongoose.disconnect();
  });
}
