import { uploadDailyErrorLog } from '../src/lib/jobs/uploadDailyErrorLog.js';

console.log('🚀 Uploading error log to Eagle FTP...');
await uploadDailyErrorLog();
console.log('✅ Upload complete');
process.exit(0);
