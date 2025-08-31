// src/lib/config/sftp/sftpClient.js
import SftpClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';

const remoteConfig = {
  host: process.env.SFTP_HOST || '168.231.116.174',
  port: process.env.SFTP_PORT || 22,
  username: process.env.SFTP_USER || 'eagle',
  password: process.env.SFTP_PASS, // or use privateKey
};

const localBase = path.resolve('./src/ftp-root/staging/incoming');

async function syncSftp() {
  const client = new SftpClient();

  try {
    await client.connect(remoteConfig);
    console.log('🔑 Connected to SFTP server');

    const mappings = [
      { remote: '/uploads/products', local: path.join(localBase, 'products') },
      { remote: '/uploads/inventory', local: path.join(localBase, 'inventory') },
      { remote: '/uploads/orders', local: path.join(localBase, 'orders') },
      { remote: '/uploads/listings', local: path.join(localBase, 'listings') },
    ];

    for (const { remote, local } of mappings) {
      fs.mkdirSync(local, { recursive: true });

      try {
        await client.mkdir(remote, true); // ensure remote dir exists
      } catch (e) {
        console.warn(`⚠️ Could not ensure remote dir ${remote}: ${e.message}`);
      }

      const fileList = await client.list(remote);

      for (const file of fileList) {
        if (file.name.endsWith('.csv')) {
          const localPath = path.join(local, file.name);
          const remotePath = `${remote}/${file.name}`;

          if (!fs.existsSync(localPath)) {
            console.log(`⬇️ Downloading ${remotePath} -> ${localPath}`);
            await client.fastGet(remotePath, localPath);

            try {
              await client.delete(remotePath); // remove remote after download
              console.log(`🗑️ Deleted remote file: ${remotePath}`);
              console.log(`📂 File ready for processing: ${localPath}`);
              // 👆 At this point, your existing FTP chokidar watchers will detect the new file
            } catch (err) {
              console.error(`❌ Error handling ${file.name}:`, err.message);
            }
          }
        }
      }
    }

    await client.end();
    console.log('✅ SFTP sync complete');
  } catch (err) {
    console.error('❌ SFTP sync error:', err.message);
  }
}

export function startSftpSync() {
  console.log('🚨 Starting SFTP sync loop...');
  syncSftp(); // run immediately
  setInterval(syncSftp, 60 * 1000); // every 1 min
}
