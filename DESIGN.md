# NovaPhone: negro puro y naranja cálido

## Dirección

Tienda de celulares para compradores en Perú. Navegación comercial inspirada en PC Factory, fotografías oficiales y un buscador visible en todos los tamaños. La referencia del usuario define un fondo negro puro, detalles naranjas y movimiento fluido sin controles de reproducción.

## Paleta y jerarquía

- Fondo general y pie `#000000`, cabecera negra con transparencia sutil, tarjetas `#0b0b0b` y superficies elevadas `#141414`.
- Naranja `#f58b42` para acentos y bordes activos; naranja oscuro `#ad410a` en botones principales para dar contraste al texto blanco. Los filtros usan bordes cobre también al pasar el cursor.
- Todos los textos usan blanco puro `#ffffff`, incluidos los secundarios, enlaces y campos. Los precios y nombres mantienen prioridad sobre los mensajes auxiliares.
- La misma paleta cubre buscador, categorías, fichas, tablas, carrito, estados vacíos y pie de página.
- Botones con iconos coherentes, foco visible, estados al agregar un equipo y áreas táctiles amplias.

## Fotografías y movimiento

Las fotos de producto son oficiales y conservan sus colores. Las imágenes de Apple tienen transparencia; la foto de Samsung con fondo negro se integra con `mix-blend-mode: lighten`.

La imagen principal se desplaza seis píxeles y vuelve a su posición durante una única secuencia de 3,6 segundos al entrar en pantalla. Después permanece estable; no hay bucle automático ni botón de reproducción. El cambio manual de equipo conserva su transición breve. El movimiento se cancela fuera de pantalla, cuando la pestaña se oculta o al usar el teclado, y respeta `prefers-reduced-motion`. Las tarjetas aparecen con una entrada breve y sus fotos responden al cursor.

La fotografía de ambiente fue creada con imagegen: manos usando un celular oscuro junto a un café, luz natural, piedra gris y manga oliva, sin logotipos ni texto. No se presenta como fotografía de un modelo concreto.

## Implementación

La incorporación progresiva de Vue mantiene las páginas HTML y sus clases CSS. Vue controla el catálogo, los filtros y el carrito; el resto de la página conserva su estructura y comportamiento actuales. `theme.css` define los colores después de las hojas de estructura y controles; `motion.css` y `motion.js` comparten el comportamiento entre las tres páginas. El observador del catálogo registra las tarjetas que Vue incorpora. `build-pages.mjs` regenera las fichas y el carrito con la cabecera y el pie comunes.


## Administración y solicitudes

El panel mantiene negro puro, tipografía Geist blanca y acentos cobre. Barra lateral fija, métricas calculadas de solicitudes reales, tablas compactas y un panel lateral para editar. El móvil usa navegación compacta, tablas con desplazamiento horizontal y formularios de una columna. El carrito presenta equipos, resumen y un formulario con revisión antes de guardar. No se muestran ventas ficticias ni se confunde una solicitud con un pago.
