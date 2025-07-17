import fs from 'fs';
import path from 'path';
import { processCsvFile, processInventoryMods } from './fileProcessor.js';

const watchFolders = [
  { type: 'products', path: path.resolve('./src/ftp-root/staging/incoming/products') },
  { type: 'inventory', path: path.resolve('./src/ftp-root/staging/incoming/inventory') }
];

export function startWatchingIncomingFiles() {
  watchFolders.forEach(({ type, path: folderPath }) => {
    fs.watch(folderPath, (eventType, filename) => {
      if (eventType === 'rename' && filename.endsWith('.csv')) {
        const filePath = path.join(folderPath, filename);
        if (fs.existsSync(filePath)) {
          console.log(`👀 Detected new file: ${filename}`);
          if (type === 'products') {
            processCsvFile(type, filePath);
          } else if (type === 'inventory') {
            processInventoryMods(filePath);
          }
        }
      }
    });
    console.log(`🚨 Watching for ${type} files in: ${folderPath}`);
  });
}
