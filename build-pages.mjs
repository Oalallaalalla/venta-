import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
let index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
index = index.replace(/(<meta name="theme-color" content=")[^"]+(">)/, '$1#000000$2').replaceAll('samsung-gray.png', 'samsung.png');
const catalog = fs.readFileSync(path.join(root, 'catalog-main.html'), 'utf8').trim();
index = index.includes('<!-- catalog:start -->')
  ? index.replace(/<!-- catalog:start -->[\s\S]*?<!-- catalog:end -->/, catalog)
  : index.replace(/<section class="catalog container" id="catalogo">[\s\S]*?<\/section>/, catalog);
const icon = (name, className = '') => `<svg class="ui-icon ${className}" aria-hidden="true"><use href="assets/ui-icons.svg#${name}"></use></svg>`;
index = index.replace(/<button class="category-trigger"[\s\S]*?<\/button>/, `<button class="category-trigger" id="category-toggle" type="button" aria-label="Categorías de celulares" aria-expanded="false" aria-controls="category-menu">${icon('menu', 'category-menu-icon')}<span class="category-label">Categorías</span>${icon('chevron', 'category-chevron')}</button>`);
index = index.replace(/<button type="button" id="category-close"[\s\S]*?<\/button>/, `<button type="button" id="category-close" aria-label="Cerrar categorías">${icon('close')}</button>`);
index = index.replace(/<span class="category-mark apple-mark">[\s\S]*?<\/span>/, '<span class="category-mark apple-mark"><img src="assets/iphone16.png" alt=""></span>');
index = index.replace(/<span class="category-mark samsung-mark">[\s\S]*?<\/span>/, '<span class="category-mark samsung-mark"><img src="assets/samsung.png" alt=""></span>');
index = index.replace(/<button type="button" class="search-clear"[\s\S]*?<\/button>/, `<button type="button" class="search-clear" aria-label="Limpiar búsqueda" hidden>${icon('close')}</button>`);
index = index.replace(/<button type="submit" class="search-submit"[\s\S]*?<\/button>/, `<button type="submit" class="search-submit" aria-label="Buscar celulares"><span class="button-label">Buscar</span>${icon('search')}</button>`);
index = index.replace(/<button type="button" class="search-dismiss"[\s\S]*?<\/button>/, `<button type="button" class="search-dismiss" aria-label="Cerrar buscador">${icon('close')}</button>`);
index = index.replace(/<button class="bag-button"[\s\S]*?<\/button>/, `<button class="bag-button" id="cart-open" aria-label="Abrir carrito">${icon('bag')}<span class="bag-label">Mi carrito</span><span id="cart-count">0</span></button>`);
index = index.replace(/<button class="close" data-close aria-label="Cerrar carrito">[\s\S]*?<\/button>/, `<button class="close" data-close aria-label="Cerrar carrito">${icon('close')}</button>`);
if (!index.includes('href="cart.css"')) index = index.replace('</head>', '<link rel="stylesheet" href="cart.css"><link rel="stylesheet" href="interactions.css"></head>');
if (!index.includes('href="controls.css"')) index = index.replace('</head>', '<link rel="stylesheet" href="controls.css"></head>');
if (!index.includes('href="theme.css"')) index = index.replace('</head>', '<link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="motion.css"></head>');
if (!index.includes('href="catalog-controls.css"')) index = index.replace('</head>', '<link rel="stylesheet" href="catalog-controls.css"></head>');
if (!index.includes('href="checkout.css"')) index = index.replace('</head>', '<link rel="stylesheet" href="checkout.css"></head>');
if (!index.includes('href="scroll.css"')) index = index.replace('</head>', '<link rel="stylesheet" href="scroll.css"></head>');
if (!index.includes('src="motion.js"')) index = index.replace('</body>', '<script src="motion.js"></script></body>');
if (!index.includes('src="products.js"')) index = index.replace('<script src="app.js"></script>', '<script src="products.js"></script><script src="app.js"></script><script src="checkout.js"></script><script src="cart.js"></script><script src="storefront.js"></script>');
index = index.replace(/<dialog id="product-dialog"[\s\S]*?<\/dialog>/, '');
if (!index.includes('id="cart-drawer-live"')) index = index.replace('<div id="cart-content"></div>', '<div id="cart-content"></div><p id="cart-drawer-live" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></p>');
if (!index.includes('id="catalog-context"')) index = index.replace('<div class="products" id="products">', '<div id="catalog-context" class="catalog-context" hidden><span></span><button id="clear-filters" type="button">Limpiar filtros ×</button></div><div class="products" id="products">');
index = index.replace('id="results-count"', 'id="results-count" role="status" aria-live="polite"');
index = index.replace(/(?: role="status" aria-live="polite"){2,}/g, ' role="status" aria-live="polite"');
index = index.replace('para revisar su color y capacidad.', 'para revisar su pantalla, cámaras, procesador, color y capacidad.');
index = index.replace(/href="#catalogo" data-brand="(Apple|Samsung|Todos)"/g, (_, brand) => `href="index.html${brand === 'Todos' ? '' : '?marca=' + brand}#catalogo" data-brand="${brand}"`);
const sharedScripts = '<script src="vendor/vue.global.prod.js"></script><script src="products.js"></script><script src="app.js"></script><script src="checkout.js"></script><script src="cart.js"></script><script src="storefront.js"></script>';
const searchScripts = '<script src="search.js"></script><script src="categories.js"></script>';
index = index.replace(/<script src="(?:vendor\/vue\.global\.prod\.js|products\.js)">[\s\S]*?<\/body>/, sharedScripts + '<script src="sort-control.js"></script><script src="catalog.js"></script>' + searchScripts + '<script src="retail.js"></script><script src="motion.js"></script><script src="scroll.js"></script></body>');
fs.writeFileSync(path.join(dist, 'index.html'), index);

const header = index.slice(0, index.indexOf('<main>'));
const footer = index.slice(index.indexOf('</main>') + 7, index.indexOf('<script src="vendor/vue.global.prod.js">'));
const scripts = sharedScripts + searchScripts;
for (const page of [
  { file: 'producto.html', fragment: 'product-main.html', title: 'Características del celular | NovaPhone', target: 'product-main', css: 'product-page.css', js: 'product-page.js' },
  { file: 'carrito.html', fragment: 'cart-main.html', title: 'Mi carrito | NovaPhone', target: 'contenido' }
]) {
  let pageHeader = header.replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace('href="#catalogo">Saltar al catálogo', `href="#${page.target}">Saltar al contenido`);
  if (page.css) pageHeader = pageHeader.replace('<link rel="stylesheet" href="controls.css">', `<link rel="stylesheet" href="${page.css}"><link rel="stylesheet" href="controls.css">`);
  const crossPageLinks = html => html.replace(/href="#(inicio|catalogo|ayuda|elegir)"/g, 'href="index.html#$1"');
  const main = fs.readFileSync(path.join(root, page.fragment), 'utf8');
  fs.writeFileSync(path.join(dist, page.file), crossPageLinks(pageHeader) + main + crossPageLinks(footer) + scripts + (page.js ? `<script src="${page.js}"></script>` : '') + '<script src="motion.js"></script><script src="scroll.js"></script></body></html>');
}
console.log('Páginas generadas: index.html, producto.html y carrito.html');

