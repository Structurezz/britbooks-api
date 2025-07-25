import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { Order } from '../../app/models/Order.js';
import { MarketplaceListing } from '../../app/models/MarketPlace.js';
import { INVENTORY_DIR } from '../constants/paths.js';
import { logSyncError } from './logSyncError.js';

export async function parseOrderResponseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    console.log(`🚀 Starting to parse Eagle order response CSV: ${filePath}`);

    fs.createReadStream(filePath)
    .pipe(parse({ headers: true }))

      .on('error', (error) => {
        console.error(`❌ CSV Parse Error: ${error.message}`);
        reject(error);
      })
      .on('data', (row) => {
        console.log('📥 Row read from CSV:', row);
        rows.push(row);
      })
      .on('end', async () => {
        console.log(`📄 Parsed ${rows.length} rows from Eagle response`);

        for (const row of rows) {
          const { order_id, sku, shipped_qty, status } = row;
          console.log(`🔍 Processing row → order_id: ${order_id}, sku: ${sku}, qty: ${shipped_qty}, status: ${status}`);

          try {
            const order = await Order.findById(order_id);
            if (!order) {
              console.warn(`⚠️ Order not found in DB: ${order_id}`);
              continue;
            }
            console.log(`✅ Found order: ${order._id}`);

            const listing = await MarketplaceListing.findOne({ sku });
            if (!listing) {
              console.warn(`⚠️ Listing not found for SKU: ${sku}`);

              await logSyncError({
                context: 'OrderResponseParsing',
                order_id,
                sku,
                reason: 'Listing not found for SKU',
              });

              continue;
            }
            console.log(`✅ Found listing: ${listing._id} with quantity: ${listing.quantity}`);

            if (status === 'shipped') {
              order.status = 'shipped';
              order.shippedAt = new Date();
              await order.save();
              console.log(`✅ Marked order ${order_id} as shipped in DB`);

              const beforeQty = listing.quantity;
              listing.quantity = Math.max(0, beforeQty - (parseInt(shipped_qty) || 0));
              await listing.save();
              console.log(`📦 Updated quantity for SKU ${sku}: ${beforeQty} → ${listing.quantity}`);
            } else {
              console.log(`ℹ️ Skipping row with non-shipped status: ${status}`);
            }
          } catch (err) {
            console.error(`❌ Error processing row for order ${order_id}: ${err.message}`);
          }
        }

        // Move file to processed dir
        const processedDir = path.join(INVENTORY_DIR, 'processed');
        fs.mkdirSync(processedDir, { recursive: true });
        const destPath = path.join(processedDir, path.basename(filePath));

        try {
          fs.renameSync(filePath, destPath);
          console.log(`✅ Moved processed file to: ${destPath}`);
        } catch (err) {
          console.error(`❌ Failed to move file to processed dir: ${err.message}`);
        }

        resolve();
      });
  });
}
