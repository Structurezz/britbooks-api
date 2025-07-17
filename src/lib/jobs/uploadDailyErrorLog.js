import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import ftpClient from '../../lib/integration/ftpClient.js';

const LOCAL_ERROR_DIR = path.resolve('./src/ftp-root/staging/outgoing/errors');
const REMOTE_ERROR_DIR = '/errors';

export async function uploadDailyErrorLog() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const filename = `error-log-${today}.csv`;
  const localPath = path.join(LOCAL_ERROR_DIR, filename);

  if (!fs.existsSync(localPath)) {
    console.log(`ℹ️ No error log to upload for ${today}`);
    return;
  }

  try {
    await ftpClient.ensureDir(REMOTE_ERROR_DIR);
    await ftpClient.uploadFrom(localPath, path.join(REMOTE_ERROR_DIR, filename));
    console.log(`✅ Uploaded error log: ${filename} to ${REMOTE_ERROR_DIR}`);
  } catch (err) {
    console.error(`❌ Failed to upload error log:`, err);
  }
}
