import FTP from 'ftp-srv'; // Use default import

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FTP_ROOT = resolve(__dirname, '../../../ftp-root');

const ftpServer = new FTP({
  url: 'ftp://0.0.0.0:2121',
  anonymous: false,
  greeting: ['📚 Welcome to BritBooks FTP Server!'],
});

ftpServer.on('login', ({ username, password }, resolve, reject) => {
  const VALID_USER = 'eagle';
  const VALID_PASS = 'eagle123';

  if (username === VALID_USER && password === VALID_PASS) {
    fs.mkdirSync(FTP_ROOT, { recursive: true });
    resolve({ root: FTP_ROOT });
  } else {
    reject(new Error('❌ Invalid FTP credentials'));
  }
});

ftpServer.on('client-error', ({ context, error }) => {
  console.error(`❌ FTP error in ${context}:`, error);
});

export const startFtpServer = async () => {
  await ftpServer.listen();
  console.log(`✅ FTP server running at ftp://localhost:2121`);
};
