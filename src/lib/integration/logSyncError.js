import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { stringify } from 'csv-stringify/sync';

const errorDir = path.resolve('./src/ftp-root/staging/outgoing/errors');

// Ensure error directory exists
if (!fs.existsSync(errorDir)) {
  fs.mkdirSync(errorDir, { recursive: true });
}

export async function logSyncError(entry) {
  const date = format(new Date(), 'yyyy-MM-dd');
  const filePath = path.join(errorDir, `error-log-${date}.csv`);

  const headers = ['timestamp', 'context', 'sku', 'order_id', 'reason'];

  // Prepare record
  const record = [
    new Date().toISOString(),
    entry.context || '',
    entry.sku || '',
    entry.order_id || '',
    entry.reason || '',
  ];

  // Check if file exists to know whether to write headers
  const fileExists = fs.existsSync(filePath);

  // Build CSV string with or without headers
  const csvString = stringify(fileExists ? [record] : [headers, record], {
    header: false,
  });

  // Append CSV string to file
  await fs.promises.appendFile(filePath, csvString);
}
