// src/lib/config/sftp/sftpServer.js

import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'ssh2'; // 👈 CommonJS default import
const { Server } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startSftpServer() {
  const server = new Server(
    {
      hostKeys: [fs.readFileSync(path.join(__dirname, 'id_rsa'))],
    },
    (client) => {
      console.log('SFTP client connected');

      client.on('authentication', (ctx) => {
        if (ctx.method === 'password' && ctx.username === 'eagle' && ctx.password === 'eagle123') {
          ctx.accept();
        } else {
          ctx.reject();
        }
      });

      client.on('ready', () => {
        console.log('SFTP client authenticated and ready');

        client.on('session', (accept, reject) => {
          const session = accept();

          session.on('sftp', (accept, reject) => {
            const sftpStream = accept();
            // TODO: Implement file handling here
          });
        });
      });
    }
  );

  server.listen(2222, '0.0.0.0', function () {
    console.log('✅ SFTP Server listening on port 2222');
  });
}
