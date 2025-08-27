import FtpSrv from 'ftp-srv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// -------------------------
// ENVIRONMENT CONFIG
// -------------------------
const FTP_ENV = process.env.FTP_ENV || 'staging'; // 'staging' | 'live'

// Roots
const ROOTS = {
  staging: resolve(__dirname, '../../ftp-root/staging'),
  live: resolve(__dirname, '../../ftp-root/live'),
};

// Credentials
const CREDS = {
  staging: { user: 'eagle', pass: 'eagle123' },
  live: { user: process.env.FTP_USER || 'britbooks', pass: process.env.FTP_PASS || 'securePass!' },
};

// Ports
const PORTS = {
  staging: 2121,
  live: process.env.PORT || 21,
};

const FTP_ROOT = ROOTS[FTP_ENV];
const { user: FTP_USER, pass: FTP_PASS } = CREDS[FTP_ENV];
const FTP_PORT = PORTS[FTP_ENV];

// -------------------------
// FTP SERVER
// -------------------------
const ftpServer = new FtpSrv(
  `ftp://0.0.0.0:${FTP_PORT}`,
  {
    anonymous: false,
    greeting: [
      `📚 Welcome to BritBooks FTP Server (${FTP_ENV.toUpperCase()})!`,
      'Only authorized access is permitted.',
    ],
    pasv_url: '127.0.0.1',       // force localhost for PASV
    pasv_min: 50000,             // ✅ correct way to set passive range
    pasv_max: 50010        // ✅ force localhost in PASV response
  }
);

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  if (username === FTP_USER && password === FTP_PASS) {
    fs.ensureDirSync(FTP_ROOT);
    resolve({ root: FTP_ROOT });
    console.log(`✅ ${username} logged in to ${FTP_ENV}`);
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
    console.log(`✅ FTP server (${FTP_ENV}) running at ftp://localhost:${FTP_PORT}`);
  } else {
    console.log('ℹ️ FTP server already running');
  }
};
