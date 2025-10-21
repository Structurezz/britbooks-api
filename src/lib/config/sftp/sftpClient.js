
import SftpClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();


const remoteConfig = {
  host: process.env.SFTP_HOST || '168.231.116.174',
  port: process.env.SFTP_PORT || 22,
  username: process.env.SFTP_USER || 'eagle',
  password: process.env.SFTP_PASS,
};

const localBase = path.resolve('./src/ftp-root/staging/incoming');

/**
 * Sync all mapped folders, but only download new CSV files.
 * Runs once per call (no infinite loop).
 */
export async function syncSftp() {
  const client = new SftpClient();

  try {
    await client.connect(remoteConfig);
    console.log('🔑 Connected to SFTP server');

    const mappings = [
      { remote: '/uploads/products', local: path.join(localBase, 'products') },
      { remote: '/uploads/inventory', local: path.join(localBase, 'inventory') },
      { remote: '/uploads/orders', local: path.join(localBase, 'orders') },
      { remote: '/uploads/listings', local: path.join(localBase, 'listings') },
      { remote: '/uploads/orders/outgoing', local: path.join(localBase, 'orders/outgoing') }, 

    ];

    for (const { remote, local } of mappings) {
      fs.mkdirSync(local, { recursive: true });

      let fileList = [];
      try {
        fileList = await client.list(remote);
      } catch (e) {
        console.warn(`⚠️ Could not list remote dir ${remote}: ${e.message}`);
        continue;
      }

      if (fileList.length === 0) {
        console.log(`📭 No files found in ${remote}`);
        continue;
      }

      for (const file of fileList) {
        if (file.name.endsWith('.csv')) {
          const localPath = path.join(local, file.name);
          const remotePath = `${remote}/${file.name}`;

          if (!fs.existsSync(localPath)) {
            console.log(`⬇️ Downloading ${remotePath} -> ${localPath}`);
            await client.fastGet(remotePath, localPath);

            try {
              await client.delete(remotePath); // remove after download
              console.log(`🗑️ Deleted remote file: ${remotePath}`);
              console.log(`📂 File ready for processing: ${localPath}`);
            } catch (err) {
              console.error(`❌ Error deleting ${file.name}:`, err.message);
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

/**
 * Public trigger: run once on demand
 */
export function startSftpSync(intervalMs = 60 * 1000) {
  console.log(`👀 Starting SFTP watcher (every ${intervalMs / 1000}s)...`);
  syncSftp(); // run immediately
  setInterval(syncSftp, intervalMs); // run on schedule
}

export async function uploadToSftp(localFilePath, remoteDir = '/uploads/orders/outgoing') {
  const client = new SftpClient();

  try {
    console.log('🚀 Starting SFTP upload...');
    await client.connect(remoteConfig);
    console.log('🔑 Connected to SFTP:', remoteConfig.host);

    // Ensure local file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Local file not found: ${localFilePath}`);
    }

    const fileName = path.basename(localFilePath);
    const remotePath = `${remoteDir}/${fileName}`;

    console.log('📁 Local file:', localFilePath);
    console.log('🌍 Target remote path:', remotePath);

    // Check if remoteDir exists; create it if not
    try {
      const dirList = await client.list(remoteDir);
      console.log(`📂 Remote directory "${remoteDir}" exists with ${dirList.length} files.`);
    } catch (e) {
      console.warn(`⚠️ Remote directory not found (${remoteDir}), creating...`);
      await client.mkdir(remoteDir, true);
    }

    // Upload file
    await client.put(localFilePath, remotePath);
    console.log(`✅ Uploaded successfully: ${fileName} → ${remotePath}`);

    // Verify by listing remoteDir again
    const remoteFiles = await client.list(remoteDir);
    console.log('📜 Remote directory contents after upload:', remoteFiles.map(f => f.name));

    const found = remoteFiles.some(f => f.name === fileName);
    if (found) {
      console.log(`🎉 File confirmed on SFTP: ${fileName}`);
    } else {
      console.warn(`⚠️ Upload reported success, but file not visible remotely.`);
    }

    await client.end();
  } catch (err) {
    console.error('❌ SFTP upload failed:', err.message);
  }
}

/**
 * Optional helper: list remote directory contents
 */
export async function listSftpDir(remoteDir) {
  const client = new SftpClient();
  try {
    await client.connect(remoteConfig);
    const files = await client.list(remoteDir);
    await client.end();
    return files;
  } catch (err) {
    console.error('❌ Failed to list SFTP directory:', err.message);
    return [];
  }
}
