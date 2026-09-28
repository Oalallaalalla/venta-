# NovaPhone: tienda y administración

## Abrir el proyecto

Requiere Node.js 24. Ejecuta `npm install` la primera vez y luego `npm run dev` desde esta carpeta.

- Tienda: http://127.0.0.1:4173/
- Carrito: http://127.0.0.1:4173/carrito.html
- Panel: http://127.0.0.1:4173/admin.html
- Acceso inicial: archivo local `ADMIN-ACCESS.md`, creado por el servidor en su primer arranque. Usuario `admin`; contraseña aleatoria. Puede cambiarse en Configuración → Acceso.

## Carrito y recepción de solicitudes

1. Agregar un equipo y abrir el carrito.
2. Ajustar cantidad, completar nombre, celular y ciudad/distrito. Dirección y comentario son opcionales.
3. Revisar el resumen y pulsar **Enviar solicitud a NovaPhone**.
4. El servidor verifica los productos y precios, guarda la solicitud y devuelve una referencia `NP-…`.
5. Entrar al panel → Pedidos para ver los datos del cliente, equipos y cantidades. Cambiar estado o añadir notas internas.

El panel actualiza los datos cada 30 segundos mientras está visible, y también permite actualizar manualmente. Clientes reúne los contactos por número de celular. Productos permite editar nombre, descripción, capacidad, color, precio entero en soles y visibilidad. Configuración permite cambiar el anuncio de la tienda, pausar solicitudes y cambiar la contraseña.

Los precios son referenciales; este flujo recibe solicitudes y no cobra pagos ni confirma inventario. No manda correos o WhatsApp: los datos llegan directamente al panel. Los datos del formulario no se guardan en localStorage; allí solo se conserva el carrito.

## Archivos de la integración

- `server.mjs`: servidor Node, API, validación, sesiones y SQLite. `preview.mjs` usa el mismo servidor.
- `data/novaphone.sqlite`: productos, solicitudes, ajustes y acceso. Se conserva al reiniciar; está fuera de la carpeta pública y excluido de Git.
- `dist/admin.html`, `dist/admin.css`, `dist/admin.js`: panel Vue y acceso privado.
- `dist/checkout.js`, `dist/checkout.css`: formulario, revisión y confirmación del carrito.
- `dist/cart.js`: componentes Vue del carrito y resumen.
- `dist/storefront.js`: aplica el anuncio configurado en el panel.
- `build-pages.mjs`: mantiene el HTML existente y añade los archivos nuevos a las tres páginas.

`/products.js` lo sirve el servidor con los productos activos de SQLite; `dist/products.js` es la semilla inicial. Editar esa semilla no sobrescribe la base de datos existente.

## Pruebas

Ejecuta `npm test`. Incluye pruebas del catálogo, carrito, scroll, formulario, autenticación, permisos, precios calculados por servidor, prevención de duplicados, cambios de productos y persistencia tras reiniciar. Las pruebas de la API usan bases temporales sin modificar pedidos reales.

## Datos y publicación

Actualmente funciona en este equipo, en `127.0.0.1`. Para recibir solicitudes de clientes externos hay que desplegar **el servidor Node y la web juntos**, con HTTPS, almacenamiento persistente y copias de seguridad; subir solo `dist` a un alojamiento estático no habilita la API. Configura `SECURE_COOKIES=true` al servir por HTTPS mediante un proxy. No se ha publicado en Internet en esta tarea.

Para respaldar los datos, detén el servidor y copia la carpeta `data` completa. Conserva ese respaldo fuera de la carpeta pública. `ADMIN-ACCESS.md` contiene la contraseña inicial; tras cambiarla ya no sirve como credencial actual.

---

## Interfaz de la tienda

# NovaPhone

Tienda en español con HTML y CSS existentes, catálogo y carrito en Vue 3, con solicitudes conectadas al panel. Fondo negro puro `#000000`, acentos naranjas y animaciones discretas sin botón de reproducción.

## Ejecutar y probar

Desde esta carpeta (`nova`), con Node.js instalado; validado con Node 24:

```powershell
npm ci
npm run dev
```

Abrir http://127.0.0.1:4173/. `dev` prepara Vue y regenera las páginas antes de iniciar el servidor local. Si la vista previa ya está abierta en ese puerto, basta con ejecutar `npm run build` y recargar el navegador.

```powershell
npm test
npm run build
```

- `npm test`: regenera las páginas y ejecuta 27 pruebas de Vue, JSDOM y la API.
- `npm run build`: copia la versión instalada de Vue a `dist/vendor` junto con su licencia y regenera inicio, producto y carrito. No elimina imágenes ni estilos.
- `npm run preview`: sirve el contenido preparado de `dist` en el puerto 4173.
- Los cambios en JavaScript y CSS de `dist` se ven al recargar. Después de cambiar un fragmento HTML, ejecutar `npm run build` y recargar.

## Integración de Vue sin rehacer la web

Vue se monta en `#catalogo`, `#cart-content` y `#cart-page-content`. La cabecera, los banners, los enlaces y las fichas mantienen su estructura y sus clases. No se añadió un router ni se convirtió el sitio entero en una SPA. Es el uso progresivo de [Vue mediante un script independiente](https://vuejs.org/guide/extras/ways-of-using-vue.html#standalone-script).

La dependencia está fijada en `vue@3.5.43`, con `package-lock.json`. El navegador carga `dist/vendor/vue.global.prod.js` desde la propia tienda; no consulta un CDN. Se incluye el compilador de plantillas para usar el HTML existente.

### Archivos y responsabilidades

| Archivo | Cambio o responsabilidad |
| --- | --- |
| `package.json`, `package-lock.json` | Vue, JSDOM para pruebas y comandos de desarrollo. |
| `sync-vue.mjs` | Copia Vue y su licencia MIT desde `node_modules` a la carpeta pública. |
| `catalog-main.html` | HTML del catálogo y plantillas de filtros/tarjetas, con las mismas clases CSS. Editar aquí su estructura. |
| `dist/catalog.js` | Componentes `ProductCatalog`, `CatalogFilters` y `ProductCard`; estado reactivo, filtros combinados, orden por precio y sincronización con la URL. |
| `dist/sort-control.js`, `dist/catalog-controls.css` | Selector de orden propio en Vue, menú negro/cobre, selección visible, teclado, búsqueda por letras y apertura adaptable al espacio disponible. |
| `dist/scroll.js`, `dist/scroll.css` | Barra de scroll cobre, espacio estable y separación de las secciones según la altura real de la cabecera. Mantiene el desplazamiento nativo de rueda, teclado y pantalla táctil. |
| `dist/cart.js` | Componentes `CartView`, `CartLine`, `CartSummary` y `CartEmpty`; un estado reactivo compartido entre panel lateral y página del carrito. |
| `dist/app.js` | Conserva formato de precios, búsquedas, avisos, diálogos y navegación. Retira el renderizado manual anterior del catálogo. |
| `build-pages.mjs` | Inserta el fragmento del catálogo y carga Vue antes de los componentes; regenera las tres páginas. |
| `dist/index.html`, `dist/producto.html`, `dist/carrito.html` | Páginas servidas, con sus cabeceras y pies existentes. La sección del catálogo se regenera desde su fragmento. |
| `dist/theme.css` | Negro puro, superficies oscuras y estados naranjas compartidos. |
| `dist/motion.js`, `dist/motion.css` | Entrada de imagen de 3,6 segundos, transiciones y respuesta al cursor, sin botón de play/pausa. |
| `tests/catalog.test.mjs`, `tests/cart.test.mjs` | Pruebas sobre el HTML real y la versión instalada de Vue. |

`dist/search.js`, `dist/categories.js`, `dist/retail.js` y `dist/product-page.js` siguen trabajando con la estructura actual. `showCatalog()` conecta la búsqueda y los accesos existentes con Vue. `window.add()` conecta las fichas con el carrito reactivo.

## Prueba manual

1. Buscar `Samsung` en la cabecera y pulsar Enter: debe aparecer solo Galaxy S25 Ultra en el catálogo.
2. Limpiar los filtros, buscar `256GB` y seleccionar Apple: debe quedar iPhone 16 Pro Max. Ordenar por menor y mayor precio.
3. Abrir `index.html?marca=Apple&q=128GB&orden=low#catalogo`: deben aparecer iPhone 16 y iPhone 16 Pro en ese orden.
4. Agregar un equipo: el contador sube una unidad por clic. Abrir el carrito, editar cantidades y comprobar subtotal y total.
5. Recargar y abrir `carrito.html`: la selección debe continuar guardada. Cambiarla desde otra pestaña y comprobar que se sincroniza.
6. Eliminar el último equipo: aparece el estado vacío. Probar también la descarga del resumen.
7. Abrir una ficha desde “Ver características”, elegir cantidad y agregar al carrito.
8. Revisar a 390 px y en escritorio: fondo negro, botones visibles y ninguna opción de reproducción en el banner. Con movimiento reducido activado, las imágenes permanecen estables.

Las 27 pruebas automáticas cubren filtros combinados, consultas seguras, orden, URL e historial, integración del buscador, clics sin duplicados, persistencia, cantidades de 1 a 99, foco, eliminación, sincronización, descarga, almacenamiento no disponible, selector accesible y separación de la cabecera durante el scroll.

### Selector de orden y scroll

El selector utiliza un componente Vue con el comportamiento de un [combobox de selección](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/). Las flechas recorren opciones, Enter confirma, Escape cancela y Tab confirma y continúa la navegación. También permite escribir las primeras letras. Un clic fuera cierra el menú. El menú se abre hacia arriba si no hay espacio debajo.

La scrollbar conserva los controles nativos del navegador y muestra una guía cobre sobre negro. `ResizeObserver` mide la cabecera para ajustar `scroll-padding-top`; `scrollbar-gutter` reserva espacio al abrir el carrito. Las secciones se desplazan suavemente con el ratón y de inmediato con teclado o movimiento reducido.

## Datos y comportamiento conservados

- `dist/products.js`: cuatro modelos y características con fuentes oficiales de Apple y Samsung. Los identificadores son `16pro`, `16`, `s25` y `16promax`.
- `product-main.html` y `cart-main.html`: fragmentos de las páginas de producto y carrito.
- Búsqueda por modelo, marca, capacidad y color; navegación de sugerencias con flechas, Enter y Escape; acceso con Ctrl/Cmd+K.
- Los filtros permanecen en la URL (`q`, `marca`, `orden`).
- La clave de almacenamiento `nova-cart` conserva las selecciones anteriores.
- Fotografías oficiales, iconos Phosphor y tipografía Geist existentes. Ver `ASSETS.md`.
- El movimiento se cancela cuando la pestaña se oculta o la imagen sale de pantalla, y respeta `prefers-reduced-motion`.

## Antes de vender

Antes de vender, confirmar precios, stock, entregas y garantías. El formulario ya guarda solicitudes y datos del cliente en el panel; los pagos en línea no están integrados. La descarga sigue siendo una copia de la selección.
