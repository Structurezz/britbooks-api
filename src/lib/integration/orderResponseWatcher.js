import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { parse } from 'csv-parse';
import { Order } from '../../app/models/Order.js';

const incomingOrderPath = path.resolve('./src/ftp-root/staging/incoming/orders');

export function startOrderResponseWatcher() {
  console.log(`[Watcher] Initializing for: ${incomingOrderPath}/eagle_orders_*.csv`);

  const watcher = chokidar.watch(`${incomingOrderPath}/eagle_orders_*.csv`);

  watcher
    .on('add', async (filePath) => {
      console.log(`[Order Response] New file detected: ${filePath}`);

      await new Promise((r) => setTimeout(r, 200)); // Wait in case file is still being written
      const records = [];

      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, skip_empty_lines: true }))
        .on('data', (row) => records.push(row))
        .on('end', async () => {
          for (const record of records) {
            const { order_id, sku, quantity, status, tracking_number, message } = record;

            try {
              const order = await Order.findOne({ orderId: order_id });
              if (!order) {
                console.warn(`[Order Response] Order not found: ${order_id}`);
                continue;
              }

              const item = order.items.find((i) => i.sku === sku);
              if (!item) {
                console.warn(`[Order Response] SKU not found in order ${order_id}: ${sku}`);
                continue;
              }

              item.status = status;
              if (tracking_number) item.trackingNumber = tracking_number;
              if (message) item.failureReason = message;

              await order.save();
              console.log(`[Order Response] Updated ${order_id} / ${sku} -> ${status}`);
            } catch (err) {
              console.error(`[Order Response] Error processing ${order_id} / ${sku}:`, err);
            }
          }

          fs.unlinkSync(filePath);
          console.log(`[Order Response] Processed and deleted: ${filePath}`);
        });
    })
    .on('ready', () => {
      console.log(`[Watcher] Watching for Eagle order responses in ${incomingOrderPath}`);
    })
    .on('error', (error) => {
      console.error(`[Watcher] Error:`, error);
    });
}
