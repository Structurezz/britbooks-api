
import fs from 'fs';
const pkgPath = './node_modules/bullmq/package.json';

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
pkg.main = './dist/esm/index.js'; // redirect away from dist/cjs/index.js
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log('✅ Patched bullmq to use dist/esm/index.js');
