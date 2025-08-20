import FTP from 'ftp-srv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FTP_ROOT = resolve(__dirname, '../../ftp-root');

// Hardcoded staging credentials
const FTP_USER = 'eagle';
const FTP_PASS = 'eagle123';
const FTP_PORT = 2121;

const ftpServer = new FTP(`ftp://0.0.0.0:${FTP_PORT}`, {
  anonymous: false,
  greeting: ['📚 Welcome to BritBooks FTP Server!'],
  pasv_range: '50000-51000', // passive mode range for firewall/NAT
});

ftpServer.on('login', ({ username, password }, resolve, reject) => {
  if (username === FTP_USER && password === FTP_PASS) {
    fs.ensureDirSync(FTP_ROOT);
    resolve({ root: FTP_ROOT });
    console.log(`✅ ${username} logged in`);
  } else {
    reject(new Error('❌ Invalid FTP credentials'));
  }
});

ftpServer.on('client-error', ({ context, error }) => {
  console.error(`❌ FTP error in ${context}:`, error);
});

export const startFtpServer = async () => {
  if (!ftpServer.listening) {
    await ftpServer.listen();
    console.log(`✅ FTP server running at ftp://localhost:${FTP_PORT}`);
  } else {
    console.log('ℹ️ FTP server already running');
  }
};

