import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { parseOrderResponseCSV } from './parseEagleOrderResponse.js';

// Folder paths
const watchFolder = path.resolve('./src/ftp-root/staging/incoming/orders');
const processedFolder = path.resolve('./src/ftp-root/staging/processed/orders');

// Watcher setup
export const startEagleResponseWatcher = () => {
  // Ensure processed folder exists
  fs.mkdirSync(processedFolder, { recursive: true });

  const watcher = chokidar.watch(path.join(watchFolder, '*.csv'), {
    persistent: true,
    ignoreInitial: false,
  });

  watcher.on('add', async (filePath) => {
    console.log(`📥 New Eagle order response detected: ${filePath}`);

    try {
      await parseOrderResponseCSV(filePath);

      // Move to processed folder
      const filename = path.basename(filePath);
      const destPath = path.join(processedFolder, filename);

      try {
        fs.renameSync(filePath, destPath);
        console.log(`📦 Moved ${filename} to processed folder.`);
      } catch (moveErr) {
        console.error(`❌ Failed to move file: ${moveErr.message}`);
      }
    } catch (err) {
      console.error(`❌ Error parsing order response: ${err.message}`);
    }
  });

  console.log(`👀 Watching Eagle order responses in: ${watchFolder}`);
};
