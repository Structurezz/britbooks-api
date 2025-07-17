import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { parseOrderResponseCSV } from './parseEagleOrderResponse.js';

// Folder paths
const watchFolder = path.resolve('./src/ftp-root/staging/incoming/orders');
const processedFolder = path.resolve('./src/ftp-root/staging/processed/orders');

// Watcher setup
export const startEagleResponseWatcher = () => {
  const watcher = chokidar.watch(path.join(watchFolder, 'eagle_orders_response_*.csv'), {
    persistent: true,
    ignoreInitial: false,
  });

  watcher.on('add', async (filePath) => {
    console.log(`📥 New Eagle order response: ${filePath}`);
    try {
      await parseOrderResponseCSV(filePath);

      // Move to processed
      const filename = path.basename(filePath);
      const destPath = path.join(processedFolder, filename);
      fs.renameSync(filePath, destPath);

      console.log(`📦 Moved ${filename} to processed folder.`);
    } catch (err) {
      console.error(`❌ Error parsing order response: ${err.message}`);
    }
  });
};
