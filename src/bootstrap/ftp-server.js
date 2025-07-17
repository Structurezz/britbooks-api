import { FtpSrv } from 'ftp-srv';
import path from 'path';

const ftpServer = new FtpSrv({
  url: 'ftp://0.0.0.0:21',
  anonymous: false
});

const users = {
  eagle_staging: {
    password: 'Staging#2025',
    root: path.resolve('./ftp-root/staging'),
  },
  eagle_live: {
    password: 'Prod#2025',
    root: path.resolve('./ftp-root/production'),
  }
};

ftpServer.on('login', ({ username, password }, resolve, reject) => {
  const user = users[username];
  if (user && user.password === password) {
    return resolve({ root: user.root });
  }
  return reject(new Error('Invalid username or password'));
});

ftpServer.listen().then(() => {
  console.log('✅ FTP server running on port 21');
});
