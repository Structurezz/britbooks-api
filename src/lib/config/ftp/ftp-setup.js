import fs from 'fs';
import path from 'path';

const basePath = path.resolve('./src/ftp-root');

const environments = ['staging', 'production'];
const subfolders = [
  'incoming/products',
  'incoming/inventory',
  'outgoing/logs'
];

export function setupFtpFolders() {
  environments.forEach((env) => {
    subfolders.forEach((sub) => {
      const fullPath = path.join(basePath, env, sub);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created: ${fullPath}`);
      }
    });
  });
}