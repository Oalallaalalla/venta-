import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');
const statuses = ['nuevo', 'contactado', 'confirmado', 'entregado', 'cancelado'];
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const str = (value, min, max, label) => { if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, `Revisa ${label}.`); return value.trim(); };
export function createStoreServer({ dataDir = path.join(root, 'data'), initialPassword, secureCookies = false } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'novaphone.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, salt TEXT NOT NULL, digest TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL, customer TEXT NOT NULL, items TEXT NOT NULL, total REAL NOT NULL, note TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, data TEXT NOT NULL);`);
  if (!db.prepare('SELECT username FROM users LIMIT 1').get()) {
    const password = initialPassword || randomBytes(18).toString('base64url');
    const salt = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users VALUES (?,?,?)').run('admin', salt, scryptSync(password, salt, 64).toString('hex'));
    if (!initialPassword) fs.writeFileSync(path.join(root, 'ADMIN-ACCESS.md'), `# Acceso privado a NovaPhone\n\nPanel: http://127.0.0.1:4173/admin.html\n\nUsuario: admin\n\nContraseña inicial: ${password}\n\nCámbiala desde Configuración → Acceso. Este archivo es local y no se sirve en la web.\n`, { mode: 0o600 });
  }
  if (!db.prepare('SELECT id FROM products LIMIT 1').get()) {
    const seed = vm.runInNewContext(fs.readFileSync(path.join(root, 'dist/products.js'), 'utf8') + ';products');
    for (const product of seed) db.prepare('INSERT INTO products VALUES (?,?)').run(product.id, JSON.stringify({ ...product, active: true }));
  }
  if (!db.prepare('SELECT id FROM settings').get()) db.prepare('INSERT INTO settings VALUES (1,?)').run(JSON.stringify({ announcement: 'Apple y Samsung. Encuentra tu próximo celular.', acceptingOrders: true, contactEmail: '' }));
  const allProducts = () => db.prepare('SELECT data FROM products ORDER BY rowid').all().map(r => JSON.parse(r.data));
  const settings = () => JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get().data);
  const decodeOrder = r => ({ id: r.id, created: r.created, status: r.status, customer: JSON.parse(r.customer), items: JSON.parse(r.items), total: r.total, note: r.note });
  const limits = new Map();
  function rate(key, max) { const now=Date.now(); for (const [k,v] of limits) if(v.until < now) limits.delete(k); const item = limits.get(key) || { count: 0, until: now + 15*60*1000 }; item.count++; limits.set(key,item); if(item.count > max) fail(429, 'Demasiados intentos. Vuelve a intentarlo en 15 minutos.'); }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const token = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('nova_session='))?.slice(13);
      const authenticated = token && db.prepare('SELECT expires FROM sessions WHERE token=? AND expires>?').get(hash(token), Date.now());
      const mutation = !['GET','HEAD'].includes(req.method);
      if (mutation) {
        if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) fail(403, 'Origen no permitido.');
        if (!String(req.headers['content-type']).startsWith('application/json')) fail(415, 'Se requiere JSON.');
      }
      let body;
      if (mutation) {
        let raw = ''; for await (const part of req) { raw += part; if (Buffer.byteLength(raw) > 32768) fail(413, 'Solicitud demasiado grande.'); }
        try { body = JSON.parse(raw); } catch { fail(400, 'Solicitud inválida.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Solicitud inválida.');
      }
      if (route === '/api/login' && req.method === 'POST') {
        rate('login:'+req.socket.remoteAddress, 10);
        const user = db.prepare('SELECT * FROM users WHERE username=?').get(String(body.username || '').slice(0,80));
        const candidate = scryptSync(String(body.password || '').slice(0,200), user?.salt || 'invalid-user', 64);
        if (!user || !timingSafeEqual(candidate, Buffer.from(user.digest, 'hex'))) fail(401, 'Usuario o contraseña incorrectos.');
        db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
        const session = randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash(session), Date.now()+8*60*60*1000);
        res.setHeader('Set-Cookie', `nova_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookies ? '; Secure' : ''}`);
        return json(200, { username: 'admin' });
      }
      if (route === '/api/session' && req.method === 'GET') return json(authenticated ? 200 : 401, authenticated ? { username: 'admin' } : { error: 'Inicia sesión para continuar.' });
      if (route === '/api/logout' && req.method === 'POST') { if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token)); res.setHeader('Set-Cookie', 'nova_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(200, { ok:true }); }
      if (route === '/products.js' && req.method === 'GET') { res.writeHead(200, {'Content-Type':'application/javascript; charset=utf-8'}); return res.end('const products = '+ JSON.stringify(allProducts().filter(p=>p.active)) + ';'); }
      if (route === '/api/store' && req.method === 'GET') { const { announcement, acceptingOrders }=settings(); return json(200, { announcement, acceptingOrders }); }
      if (route === '/api/orders' && req.method === 'POST') {
        const key = str(body.requestKey, 16, 80, 'la referencia del pedido');
        const customer = { name: str(body.customer?.name,3,100,'tu nombre'), phone:str(body.customer?.phone,7,24,'tu celular'), city:str(body.customer?.city,2,100,'tu ciudad'), address:str(body.customer?.address || '',0,180,'tu dirección'), note:str(body.customer?.note || '',0,300,'tu comentario') };
        if(!/^\+?[\d\s()-]{7,24}$/.test(customer.phone) || !/^\d{7,15}$/.test(customer.phone.replace(/\D/g,''))) fail(400,'Ingresa un teléfono válido.');
        if(!Array.isArray(body.items) || !body.items.length || body.items.length>30) fail(400,'El carrito está vacío o no es válido.');
        const ids = new Set();
        for(const item of body.items) { if(!item || typeof item.id !== 'string' || ids.has(item.id) || !Number.isInteger(item.qty) || item.qty<1 || item.qty>99) fail(400,'Revisa las cantidades del carrito.'); ids.add(item.id); }
        const fingerprint = hash(JSON.stringify({customer,items:body.items.map(({id,qty})=>({id,qty}))}));
        const prior = db.prepare('SELECT * FROM orders WHERE request_key=?').get(key);
        if(prior) { if(prior.fingerprint!==fingerprint) fail(409,'La referencia ya se utilizó con otros datos. Revisa tu pedido.'); return json(200,{ id:prior.id,total:prior.total,created:prior.created }); }
        rate('order:'+req.socket.remoteAddress, 20);
        if(!settings().acceptingOrders) fail(503,'Por el momento no recibimos solicitudes. Inténtalo más tarde.');
        const catalog=allProducts(); const items=body.items.map(item=>{ const p=catalog.find(p=>p.id===item.id && p.active); if(!p) fail(409,'Un equipo ya no está disponible. Actualiza el carrito.'); return {id:p.id,name:p.name,brand:p.brand,capacity:p.capacity,color:p.color,image:p.image,price:p.price,qty:item.qty}; });
        const total=Math.round(items.reduce((sum,p)=>sum+p.price*p.qty,0)*100)/100;
        if(typeof body.expectedTotal !== 'number' || Math.abs(total-body.expectedTotal)>.005) fail(409,'Los precios cambiaron. Actualiza la página y revisa el total antes de enviar.');
        const id='NP-'+randomBytes(5).toString('hex').toUpperCase(); const created=new Date().toISOString();
        db.prepare('INSERT INTO orders (id,request_key,fingerprint,created,status,customer,items,total) VALUES (?,?,?,?,?,?,?,?)').run(id,key,fingerprint,created,'nuevo',JSON.stringify(customer),JSON.stringify(items),total);
        return json(201,{id,total,created});
      }
      if(route.startsWith('/api/admin/')) {
        if(!authenticated) fail(401,'Inicia sesión para continuar.');
        if(route==='/api/admin/overview' && req.method==='GET') return json(200,{orders:db.prepare('SELECT * FROM orders ORDER BY created DESC').all().map(decodeOrder),products:allProducts(),settings:settings()});
        if(route.startsWith('/api/admin/orders/') && req.method==='PATCH') {
          const id=decodeURIComponent(route.split('/').pop()); const order=db.prepare('SELECT * FROM orders WHERE id=?').get(id); if(!order) fail(404,'Pedido no encontrado.');
          if(!statuses.includes(body.status)) fail(400,'Estado no válido.'); const note=str(body.note ?? order.note,0,2000,'la nota interna');
          db.prepare('UPDATE orders SET status=?,note=? WHERE id=?').run(body.status,note,id); return json(200,decodeOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(id)));
        }
        if(route.startsWith('/api/admin/products/') && req.method==='PATCH') {
          const id=decodeURIComponent(route.split('/').pop()); const old=allProducts().find(p=>p.id===id); if(!old) fail(404,'Producto no encontrado.');
          const next={...old,name:str(body.name,2,100,'el nombre'),color:str(body.color,2,80,'el color'),description:str(body.description,5,2000,'la descripción')};
          if(typeof body.price!=='number' || !Number.isFinite(body.price) || body.price<1 || body.price>100000 || Math.round(body.price)!==body.price) fail(400,'Usa un precio entero entre S/ 1 y S/ 100 000.');
          if(!Number.isInteger(body.capacity)||body.capacity<1||body.capacity>4096||typeof body.active!=='boolean') fail(400,'Revisa la capacidad y visibilidad.');
          Object.assign(next,{price:body.price,capacity:body.capacity,active:body.active}); db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(next),id); return json(200,next);
        }
        if(route==='/api/admin/settings' && req.method==='PATCH') {
          const next={announcement:str(body.announcement,3,160,'el anuncio'),contactEmail:str(body.contactEmail||'',0,160,'el correo'),acceptingOrders:body.acceptingOrders};
          if(typeof next.acceptingOrders!=='boolean' || (next.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.contactEmail))) fail(400,'Revisa la configuración.');
          db.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify(next)); return json(200,next);
        }
        if(route==='/api/admin/password' && req.method==='POST') {
          const old=db.prepare('SELECT * FROM users WHERE username=?').get('admin');
          if(!timingSafeEqual(scryptSync(String(body.current||'').slice(0,200),old.salt,64),Buffer.from(old.digest,'hex'))) fail(400,'La contraseña actual no coincide.');
          const password=str(body.password,12,128,'la nueva contraseña (mínimo 12 caracteres)');const salt=randomBytes(16).toString('hex');db.prepare('UPDATE users SET salt=?,digest=? WHERE username=?').run(salt,scryptSync(password,salt,64).toString('hex'),'admin'); db.prepare('DELETE FROM sessions WHERE token<>?').run(hash(token));
          return json(200,{ok:true});
        }
        fail(404,'Acción no encontrada.');
      }
      if(route.startsWith('/api/')) fail(404,'Ruta no encontrada.');
      if(!['GET','HEAD'].includes(req.method)) fail(405,'Método no permitido.');
      const staticRoot=path.join(root,'dist');const target=path.resolve(staticRoot,'.'+decodeURIComponent(route==='/'?'/index.html':route));
      if(!target.startsWith(staticRoot+path.sep)) fail(403,'Acceso denegado.');
      if(!fs.existsSync(target)||!fs.statSync(target).isFile()) fail(404,'Archivo no encontrado.');
      const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
      res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});if(req.method==='HEAD') return res.end();fs.createReadStream(target).pipe(res);
    } catch(error) { if(!res.headersSent) json(error.status||500,{error:error.status?error.message:'No se pudo completar la operación. Inténtalo nuevamente.'}); else res.end(); }
  });
  server.on('close',()=>db.close());
  return server;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT || 4173);const server=createStoreServer({secureCookies:process.env.SECURE_COOKIES==='true'});
  server.listen(port,'127.0.0.1',()=>{fs.writeFileSync(path.join(root,'server.pid'),String(process.pid)); console.log(`NovaPhone: http://127.0.0.1:${port} · Panel: /admin.html`);});
}
