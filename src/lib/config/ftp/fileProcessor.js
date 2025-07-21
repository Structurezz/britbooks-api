import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { writeToStream } from '@fast-csv/format';
import dayjs from 'dayjs';
import {
  upsertListingFromInventory,
  updateInventoryFields,
} from '../../../app/services/marketPlaceService.js';

const LOG_PATH = path.resolve('./src/ftp-root/staging/outgoing/error-logs');
fs.mkdirSync(LOG_PATH, { recursive: true });

/**
 * Process full product add/update CSV (with title, author, etc.)
 */
async function processCsvFile(type, filePath) {
  const fileName = path.basename(filePath);
  const stream = fs.createReadStream(filePath).pipe(csv());

  const logRows = [];

  for await (const row of stream) {
    const { product_id, title, author, price, condition } = row;
    console.log('➡️ Processing row:', row);

    const hasEnoughData = product_id && title && price && !isNaN(parseFloat(price));
    const fallbackAuthor = author || 'Unknown';
    const fallbackCondition = condition || 'unknown';

    if (hasEnoughData) {
      try {
        const listing = await upsertListingFromInventory({
          inventorySyncId: product_id,
          isbn: product_id,
          title,
          author: fallbackAuthor,
          condition: fallbackCondition,
          price: parseFloat(price),
          currency: 'GBP',
          stock: 1,
          rawDataDump: row,
          syncSource: 'csv',
        });

        console.log('✅ Successfully saved:', listing._id);
        logRows.push({ sku: product_id, status: 'success', error: '' });
      } catch (err) {
        console.error('❌ DB SAVE ERROR:', err.message);
        logRows.push({ sku: product_id, status: 'error', error: `DB ERROR: ${err.message}` });
      }
    } else {
      logRows.push({
        sku: product_id || 'N/A',
        status: 'error',
        error: `Missing required fields: ${JSON.stringify(row)}`,
      });
    }
  }

  await writeCsvLog(type, logRows);
  fs.unlinkSync(filePath);
  console.log(`📦 Processed and removed file: ${fileName}`);
}

/**
 * Process lightweight inventory mod CSV (sku, price, quantity)
 */
async function processInventoryMods(filePath) {
  const fileName = path.basename(filePath);
  const stream = fs.createReadStream(filePath).pipe(csv());

  const logRows = [];

  for await (const row of stream) {
    const { sku, price, quantity } = row;
    console.log('➡️ Processing row:', row);

    const valid = sku && !isNaN(price) && !isNaN(quantity);

    if (valid) {
      try {
        await updateInventoryFields({
          sku,
          price: parseFloat(price),
          quantity: parseInt(quantity),
        });

        logRows.push({ sku, status: 'success', error: '' });
      } catch (err) {
        console.error('❌ UPDATE ERROR:', err.message);
        logRows.push({ sku, status: 'error', error: err.message });
      }
    } else {
      logRows.push({
        sku: sku || 'N/A',
        status: 'error',
        error: `Missing or invalid fields: ${JSON.stringify(row)}`,
      });
    }
  }

  await writeCsvLog('mods', logRows);
  fs.unlinkSync(filePath);
  console.log(`📦 Processed and removed file: ${fileName}`);
}

/**
 * Utility to write CSV log to error-logs folder
 */
async function writeCsvLog(type, rows) {
  const logFilePath = path.join(
    LOG_PATH,
    `${type}-log_${dayjs().format('YYYY-MM-DD_HH-mm')}.csv`
  );
  const writeStream = fs.createWriteStream(logFilePath);
  writeToStream(writeStream, rows, { headers: true });
}

export { processCsvFile, processInventoryMods };
