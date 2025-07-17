import path from 'path';
import { fileURLToPath } from 'url';

// Helps resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FTP_ROOT = path.join(__dirname, '../../../ftp-root');
export const ORDER_RESPONSES_DIR = path.join(FTP_ROOT, 'staging/incoming/orders');
export const INVENTORY_DIR = path.join(FTP_ROOT, 'staging/incoming/inventory');
export const ORDER_EXPORT_DIR = path.join(FTP_ROOT, 'staging/outgoing');
