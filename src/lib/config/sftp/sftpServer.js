import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ssh2 from 'ssh2';
import crypto from 'crypto';

const { Server, SFTP_OPEN_MODE } = ssh2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, 'sftp-root');
const openDirs = new Map();  // handle -> { files, index, path }
const openFiles = new Map(); // handle -> fd

if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });

const hostKeyPath = path.join(__dirname, 'ssh_host_rsa_key');
if (!fs.existsSync(hostKeyPath)) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  fs.writeFileSync(hostKeyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
  console.log('🔑 Generated SSH host key');
}

// --- safely resolve paths inside ROOT ---
function resolvePath(givenPath = '/') {
  const safePath = path.normalize(givenPath).replace(/^(\.\.[\/\\])+/, '');
  const p = path.join(ROOT, safePath);
  const resolved = path.resolve(p);
  if (!resolved.startsWith(ROOT)) throw new Error('Access outside root forbidden');
  return resolved;
}

// --- convert SFTP flags to fs flags ---
function sftpFlagsToFs(flags) {
  if (flags & SFTP_OPEN_MODE.READ && flags & SFTP_OPEN_MODE.WRITE) return 'r+';
  if (flags & SFTP_OPEN_MODE.WRITE) return 'w';
  if (flags & SFTP_OPEN_MODE.READ) return 'r';
  return 'r';
}

export function startSftpServer() {
  const server = new Server({ hostKeys: [fs.readFileSync(hostKeyPath)] }, (client) => {
    console.log('🔌 Client connected');

    client.on('authentication', (ctx) => {
      if (ctx.method === 'password' && ctx.username === 'eagle' && ctx.password === 'eagle123') {
        ctx.accept();
        console.log('✅ Auth success');
      } else ctx.reject();
    });

    client.on("session", (accept) => {
      const session = accept();

      session.on("sftp", (accept) => {
        const sftp = accept();

        // --- REALPATH ---
        sftp.on("REALPATH", (reqid, givenPath) => {
          try {
            const resolved = resolvePath(givenPath);
            const rel = "/" + path.relative(ROOT, resolved).replace(/\\/g, '/');
            const filename = rel === '/' ? '/' : rel;
            const stats = fs.statSync(resolved);
            sftp.name(reqid, [{
              filename,
              longname: filename,
              attrs: { size: stats.size, mode: stats.mode, uid: stats.uid, gid: stats.gid, mtime: stats.mtimeMs }
            }]);
          } catch (err) {
            console.error('REALPATH error:', err);
            sftp.status(reqid, 4);
          }
        });

        // --- OPENDIR ---
        sftp.on("OPENDIR", (reqid, givenPath) => {
          try {
            const fsPath = resolvePath(givenPath);
            const files = fs.readdirSync(fsPath);
            const handle = crypto.randomBytes(4).toString("hex");
            openDirs.set(handle, { files, index: 0, path: fsPath });
            sftp.handle(reqid, Buffer.from(handle, 'hex'));
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- READDIR ---
        sftp.on("READDIR", (reqid, handleBuf) => {
          try {
            const handle = handleBuf.toString("hex");
            const dir = openDirs.get(handle);
            if (!dir) return sftp.status(reqid, 4);

            // Include "." and ".." for clients
            let batch = [];
            if (dir.index === 0) {
              batch.push({ filename: '.', longname: '.', attrs: {} });
              batch.push({ filename: '..', longname: '..', attrs: {} });
            }

            const filesBatch = dir.files.slice(dir.index, dir.index + 10).map(f => {
              const fPath = path.join(dir.path, f);
              const stats = fs.statSync(fPath);
              return { filename: f, longname: f, attrs: { size: stats.size, mode: stats.mode, mtime: stats.mtimeMs } };
            });

            batch = batch.concat(filesBatch);
            dir.index += filesBatch.length;

            if (batch.length === 0) {
              openDirs.delete(handle);
              return sftp.status(reqid, 1); // EOF
            }

            sftp.name(reqid, batch);
          } catch (err) {
            console.error('READDIR error:', err);
            sftp.status(reqid, 4);
          }
        });

        // --- OPEN ---
        sftp.on("OPEN", (reqid, filename, flags) => {
          try {
            const fsPath = resolvePath(filename);
            const fd = fs.openSync(fsPath, sftpFlagsToFs(flags));
            const handle = crypto.randomBytes(4).toString("hex");
            openFiles.set(handle, fd);
            sftp.handle(reqid, Buffer.from(handle, 'hex'));
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- READ ---
        sftp.on("READ", (reqid, handleBuf, offset, length) => {
          try {
            const handle = handleBuf.toString("hex");
            const fd = openFiles.get(handle);
            if (!fd) return sftp.status(reqid, 4);
            const buffer = Buffer.alloc(length);
            fs.read(fd, buffer, 0, length, offset, (err, bytesRead) => {
              if (err) return sftp.status(reqid, 4);
              if (bytesRead === 0) return sftp.status(reqid, 1);
              sftp.data(reqid, buffer.slice(0, bytesRead));
            });
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- WRITE ---
        sftp.on("WRITE", (reqid, handleBuf, offset, data) => {
          try {
            const handle = handleBuf.toString("hex");
            const fd = openFiles.get(handle);
            if (!fd) return sftp.status(reqid, 4);
            fs.write(fd, data, 0, data.length, offset, (err) => {
              if (err) return sftp.status(reqid, 4);
              sftp.status(reqid, 0);
            });
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- CLOSE ---
        sftp.on("CLOSE", (reqid, handleBuf) => {
          try {
            const handle = handleBuf.toString("hex");
            if (openFiles.has(handle)) {
              const fd = openFiles.get(handle);
              fs.close(fd, (err) => {
                if (err) return sftp.status(reqid, 4);
                openFiles.delete(handle);
                sftp.status(reqid, 0);
              });
            } else if (openDirs.has(handle)) {
              openDirs.delete(handle);
              sftp.status(reqid, 0);
            } else sftp.status(reqid, 4);
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- REMOVE ---
        sftp.on("REMOVE", (reqid, filename) => {
          try {
            fs.unlinkSync(resolvePath(filename));
            sftp.status(reqid, 0);
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- RENAME ---
        sftp.on("RENAME", (reqid, oldPath, newPath) => {
          try {
            fs.renameSync(resolvePath(oldPath), resolvePath(newPath));
            sftp.status(reqid, 0);
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- MKDIR ---
        sftp.on("MKDIR", (reqid, dirname) => {
          try {
            fs.mkdirSync(resolvePath(dirname));
            sftp.status(reqid, 0);
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- RMDIR ---
        sftp.on("RMDIR", (reqid, dirname) => {
          try {
            fs.rmdirSync(resolvePath(dirname));
            sftp.status(reqid, 0);
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- STAT / LSTAT ---
        sftp.on("STAT", (reqid, filename) => {
          try {
            const stats = fs.statSync(resolvePath(filename));
            sftp.attrs(reqid, { size: stats.size, mode: stats.mode, mtime: stats.mtimeMs });
          } catch {
            sftp.status(reqid, 4);
          }
        });

        sftp.on("LSTAT", (reqid, filename) => {
          try {
            const stats = fs.lstatSync(resolvePath(filename));
            sftp.attrs(reqid, { size: stats.size, mode: stats.mode, mtime: stats.mtimeMs });
          } catch {
            sftp.status(reqid, 4);
          }
        });

        // --- FSTAT ---
        sftp.on("FSTAT", (reqid, handleBuf) => {
          try {
            const handle = handleBuf.toString("hex");
            const fd = openFiles.get(handle);
            if (!fd) return sftp.status(reqid, 4);
            const stats = fs.fstatSync(fd);
            sftp.attrs(reqid, { size: stats.size, mode: stats.mode, mtime: stats.mtimeMs });
          } catch {
            sftp.status(reqid, 4);
          }
        });

      });
    });
  });

  const PORT = process.env.PORTi || 2222;
  server.listen(PORT, '0.0.0.0', () => console.log(`🚀 SFTP Server running on port ${PORT}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startSftpServer();
