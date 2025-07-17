import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { createObjectCsvWriter } from 'csv-writer';

const errorDir = path.resolve('./src/ftp-root/staging/outgoing/errors');

// Ensure directory exists
if (!fs.existsSync(errorDir)) {
  fs.mkdirSync(errorDir, { recursive: true });
}

export async function logSyncError(entry) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const filePath = path.join(errorDir, `error-log-${date}.csv`);

  const fileExists = fs.existsSync(filePath);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'timestamp', title: 'timestamp' },
      { id: 'context', title: 'context' },
      { id: 'sku', title: 'sku' },
      { id: 'order_id', title: 'order_id' },
      { id: 'reason', title: 'reason' },
    ],
    append: fileExists,
  });

  await csvWriter.writeRecords([
    {
      timestamp: new Date().toISOString(),
      context: entry.context || '',
      sku: entry.sku || '',
      order_id: entry.order_id || '',
      reason: entry.reason || '',
    },
  ]);
}
