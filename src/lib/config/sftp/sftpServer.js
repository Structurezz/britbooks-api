// src/lib/config/sftp/sftpServer.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'ssh2'; // ssh2 library
const { Server } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, 'sftp-root');

// Ensure root dir exists
if (!fs.existsSync(ROOT)) {
  fs.mkdirSync(ROOT, { recursive: true });
}

export async function startSftpServer() {
  const server = new Server(
    {
      hostKeys: [fs.readFileSync(path.join(__dirname, 'id_rsa'))], // private key file
    },
    (client) => {
      console.log('🔌 Client connected');

      client.on('authentication', (ctx) => {
        if (
          ctx.method === 'password' &&
          ctx.username === 'eagle' &&
          ctx.password === 'eagle123'
        ) {
          console.log('✅ Auth success');
          ctx.accept();
        } else {
          console.log('❌ Auth failed');
          ctx.reject();
        }
      });

      client.on('ready', () => {
        console.log('🟢 Client ready');

        client.on('session', (accept, reject) => {
          const session = accept();

          session.on('sftp', (accept, reject) => {
            const sftpStream = accept();

            sftpStream.on('REALPATH', (reqid, givenPath) => {
              let resolvedPath = path.resolve(ROOT, '.' + givenPath);
              sftpStream.name(reqid, [
                { filename: resolvedPath, longname: resolvedPath, attrs: {} },
              ]);
            });

            sftpStream.on('STAT', (reqid, givenPath) => {
              let fsPath = path.resolve(ROOT, '.' + givenPath);
              fs.stat(fsPath, (err, stats) => {
                if (err) return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.FAILURE);
                sftpStream.attrs(reqid, stats);
              });
            });

            sftpStream.on('OPENDIR', (reqid, givenPath) => {
              let fsPath = path.resolve(ROOT, '.' + givenPath);
              fs.readdir(fsPath, (err, files) => {
                if (err) return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.FAILURE);
                let handle = Buffer.from('fakehandle');
                sftpStream.handle(reqid, handle);
                sftpStream.on('READDIR', (reqid2, handle2) => {
                  if (handle2.toString() !== 'fakehandle')
                    return sftpStream.status(reqid2, ssh2.SFTP_STATUS_CODE.FAILURE);
                  let list = files.map((f) => ({
                    filename: f,
                    longname: f,
                    attrs: {},
                  }));
                  sftpStream.name(reqid2, list);
                  sftpStream.status(reqid2, ssh2.SFTP_STATUS_CODE.EOF);
                });
              });
            });

            sftpStream.on('OPEN', (reqid, filename, flags, attrs) => {
              let fsPath = path.resolve(ROOT, '.' + filename);
              let mode = flags & 3; // read/write
              let handle;
              try {
                if (mode === 0) {
                  handle = fs.openSync(fsPath, 'r');
                } else {
                  handle = fs.openSync(fsPath, 'w');
                }
              } catch (e) {
                return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.FAILURE);
              }
              let handleBuf = Buffer.alloc(4);
              handleBuf.writeUInt32BE(handle);
              sftpStream.handle(reqid, handleBuf);
            });

            sftpStream.on('READ', (reqid, handle, offset, length) => {
              let fd = handle.readUInt32BE(0);
              let buffer = Buffer.alloc(length);
              fs.read(fd, buffer, 0, length, offset, (err, bytesRead) => {
                if (err) return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.FAILURE);
                if (bytesRead === 0)
                  return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.EOF);
                sftpStream.data(reqid, buffer.slice(0, bytesRead));
              });
            });

            sftpStream.on('WRITE', (reqid, handle, offset, data) => {
              let fd = handle.readUInt32BE(0);
              fs.write(fd, data, 0, data.length, offset, (err) => {
                if (err) return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.FAILURE);
                sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.OK);
              });
            });

            sftpStream.on('CLOSE', (reqid, handle) => {
              let fd = handle.readUInt32BE(0);
              fs.close(fd, (err) => {
                if (err) return sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.FAILURE);
                sftpStream.status(reqid, ssh2.SFTP_STATUS_CODE.OK);
              });
            });
          });
        });
      });
    }
  );

  server.listen(2222, '0.0.0.0', function () {
    console.log('🚀 SFTP Server running on port 2222');
    console.log(`📂 Root directory: ${ROOT}`);
  });
}
