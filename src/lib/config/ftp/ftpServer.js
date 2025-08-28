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

// FTP root directories
const ROOTS = {
  staging: resolve(__dirname, '../../ftp-root/staging'),
  live: resolve(__dirname, '../../ftp-root/live'),
};

// FTP credentials
const CREDS = {
  staging: { user: 'eagle', pass: 'eagle123' },
  live: {
    user: process.env.FTP_USER || 'britbooks',
    pass: process.env.FTP_PASS || 'securePass!',
  },
};

// Ports (ensure number, with fallback)
const PORTS = {
  staging: 2121,
  live: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 2121,
};

const FTP_ROOT = ROOTS[FTP_ENV];
const { user: FTP_USER, pass: FTP_PASS } = CREDS[FTP_ENV];
const FTP_PORT = PORTS[FTP_ENV];

// -------------------------
// PASV CONFIG FOR VPS
// -------------------------
// Set this to your VPS public IP
const PASV_HOST = FTP_ENV === 'live' ? '168.231.116.174' : '127.0.0.1';
const PASV_MIN = 50000;
const PASV_MAX = 50010;

// -------------------------
// FTP SERVER CONFIG
// -------------------------
const ftpServer = new FtpSrv(`ftp://0.0.0.0:${FTP_PORT}`, {
  anonymous: false,
  greeting: [
    `📚 Welcome to BritBooks FTP Server (${FTP_ENV.toUpperCase()})!`,
    'Only authorized access is permitted.',
  ],
  pasv_url: PASV_HOST,
  pasv_min: PASV_MIN,
  pasv_max: PASV_MAX,
});

// -------------------------
// EVENT HANDLERS
// -------------------------
ftpServer.on('login', async ({ connection, username, password }, resolve, reject) => {
  try {
    if (username === FTP_USER && password === FTP_PASS) {
      // Ensure root directory exists
      await fs.ensureDir(FTP_ROOT);
      resolve({ root: FTP_ROOT });
      console.log(`✅ ${username} logged in to ${FTP_ENV}`);
    } else {
      reject(new Error('❌ Invalid FTP credentials'));
    }
  } catch (err) {
    reject(err);
  }
});

ftpServer.on('client-error', ({ context, error }) => {
  console.error(`❌ FTP error in ${context}:`, error);
});

// -------------------------
// START FUNCTION
// -------------------------
export const startFtpServer = async () => {
  if (!ftpServer.listening) {
    await ftpServer.listen();
    console.log(`✅ FTP server (${FTP_ENV}) running at ftp://localhost:${FTP_PORT}`);
    if (FTP_ENV === 'live') {
      console.log(`🌍 External access via VPS: ftp://${PASV_HOST}:${FTP_PORT}`);
      console.log(`🔑 FTP user: ${FTP_USER} | FTP pass: ${FTP_PASS}`);
      console.log(`📡 Passive ports: ${PASV_MIN}-${PASV_MAX} must be forwarded on VPS`);
    }
  } else {
    console.log('ℹ️ FTP server already running');
  }
};
