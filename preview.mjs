import './server.mjs';
// Compatibility entry point. The application server owns the storefront and API.
import { createStoreServer } from './server.mjs';
import fs from 'node:fs';
const port = Number(process.env.PORT || 4173);
createStoreServer({ secureCookies: process.env.SECURE_COOKIES === 'true' }).listen(port, '127.0.0.1', () => { fs.writeFileSync('server.pid', String(process.pid)); console.log(`NovaPhone http://127.0.0.1:${port}`); });
