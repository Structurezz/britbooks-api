import { FtpSrv } from '@trenskow/ftp-srv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Public Railway host
const PUBLIC_HOST = 'britbooks-api-production.up.railway.app';

const ftpServer = new FtpSrv({
  url: 'ftp://0.0.0.0:2121',   // Control connection
  anonymous: false,
  pasv_url: PUBLIC_HOST,       // External hostname
  pasv_range: [6000, 6010],    // Passive data ports
});

const users = {
  eagle_staging: {
    password: 'Staging#2025',
    root: path.resolve(__dirname, './ftp-root/staging'),
  },
  eagle_live: {
    password: 'Prod#2025',
    root: path.resolve(__dirname, './ftp-root/production'),
  }
};

ftpServer.on('login', ({ username, password }, resolve, reject) => {
  const user = users[username];
  if (user && user.password === password) {
    console.log(`✅ User logged in: ${username}`);
    return resolve({ root: user.root });
  }
  console.log(`❌ Login failed for: ${username}`);
  return reject(new Error('Invalid username or password'));
});

ftpServer.listen()
  .then(() => console.log('✅ FTP server running on port 2121 (Railway)'))
  .catch(err => console.error('❌ Failed to start FTP server:', err));
