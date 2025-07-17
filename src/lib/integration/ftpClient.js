import { Client } from 'basic-ftp';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const client = new Client();
client.ftp.verbose = false;

async function connect() {
  await client.access({
    host: process.env.EAGLE_FTP_HOST,
    user: process.env.EAGLE_FTP_USER,
    password: process.env.EAGLE_FTP_PASSWORD,
    secure: false,
  });
}

async function uploadFrom(localPath, remotePath) {
  try {
    await connect();
    await client.uploadFrom(localPath, remotePath);
  } finally {
    client.close();
  }
}

async function ensureDir(remoteDir) {
  try {
    await connect();
    await client.ensureDir(remoteDir);
  } finally {
    client.close();
  }
}

export default {
  uploadFrom,
  ensureDir,
};
