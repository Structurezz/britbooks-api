import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import mongoose from 'mongoose';

import { fileURLToPath } from 'url';
import { Order } from '../../app/models/Order.js';
import { MarketplaceListing } from '../../app/models/Marketplace.js';
import dotenv from 'dotenv';

dotenv.config();


const EXPORT_DIR = path.resolve('./src/ftp-root/staging/outgoing/orders');
fs.mkdirSync(EXPORT_DIR, { recursive: true });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/britbook';

export async function generateOrderExport() {
  const { writeToStream } = await import('@fast-csv/format');
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

  const rows = [];

  for (const order of orders) {
    console.log(`🔍 Processing order: ${order._id}`);

    for (const item of order.items) {
      const listing = item.listing;

      if (!listing) {
        console.warn(`⚠️ Skipping item: listing not populated for order ${order._id}, item:`, item);
        continue;
      }

      if (!listing.inventory) {
        console.warn(`⚠️ Skipping item: no inventory for listing ${listing._id} in order ${order._id}`);
        continue;
      }

      if (!listing.inventory.inventorySyncId) {
        console.warn(`⚠️ Skipping item: missing inventorySyncId for listing ${listing._id} in order ${order._id}`);
        continue;
      }

      const sku = listing.inventory.inventorySyncId;
      const orderDate = dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss');
      const fullName = order.shippingAddress?.fullName || 'Unknown';
      const address = order.shippingAddress
        ? `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.country}`
        : 'Unknown';

      console.log(`✅ Writing row: SKU=${sku}, Qty=${item.quantity}, Order=${order._id}`);

      rows.push({
        order_id: order._id.toString(),
        order_date: orderDate,
        sku,
        quantity: item.quantity,
        price: item.priceAtPurchase,
        customer_name: fullName,
        shipping_addr: address,
      });
    }
  }

  if (rows.length === 0) {
    console.log('ℹ️ No valid items to export.');
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    return;
  }

  const filename = `orders_${dayjs().format('YYYY-MM-DD_HH-mm')}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  const stream = fs.createWriteStream(filepath);
  writeToStream(stream, rows, { headers: true });

  console.log(`✅ Exported ${rows.length} rows to ${filename}`);

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
