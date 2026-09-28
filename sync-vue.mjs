import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve('vue/package.json'));
const target = path.join(root, 'dist', 'vendor');
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(path.join(source, 'dist', 'vue.global.prod.js'), path.join(target, 'vue.global.prod.js'));
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(target, 'vue.LICENSE'));
console.log('Vue copiado a dist/vendor con su licencia MIT.');
