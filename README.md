# Taller: Polígonos sobre un mapa con geolocalización

Asignatura: Programación Frontend / Páginas Web Dinámicas.

Página web que ubica al usuario en un mapa, le permite dibujar un polígono con clics, calcula su área y su perímetro, y exporta el resultado como GeoJSON. Está hecha con JavaScript puro (sin frameworks ni compilación), **Leaflet 1.9.4**, **Turf.js 7** y mapas de **OpenStreetMap**.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la página: botones, opciones, mapa y tabla de vértices |
| `estilos.css` | Estilos (diseño adaptable a celular) |
| `app.js` | Toda la lógica, organizada por pasos (2 a 7) y por retos (1 a 9) |
| `ejemplo.geojson` | **Archivo de ejemplo**: un polígono de prueba en Manizales para probar la importación. No es una medición real. |
| `poligono.geojson` | Entregable real: lo exporta el usuario desde la app con el botón "Exportar GeoJSON" |

## Cómo correrlo (Live Server)

La API de geolocalización solo funciona en un **contexto seguro** (HTTPS o `localhost`). Si abres `index.html` con doble clic (`file://`), el navegador no entrega la ubicación.

1. Abre la carpeta en VS Code.
2. Instala la extensión **Live Server** (de Ritwick Dey).
3. Clic derecho sobre `index.html` y elige **Open with Live Server** (o el botón "Go Live" de la barra inferior).
4. Se abre `http://127.0.0.1:5500/index.html`. Acepta el permiso de ubicación.

Se necesita conexión a internet: Leaflet, Turf y las imágenes del mapa se cargan desde CDN.

## Cómo publicarlo (para probarlo en el celular)

En el celular, `http://192.168.x.x:5500` (Live Server en la red local) **no sirve**: no es HTTPS y el navegador bloquea la geolocalización. Hay que publicarlo:

**GitHub Pages**
1. Crea un repositorio en GitHub y sube `index.html`, `estilos.css`, `app.js`, `README.md` y los `.geojson`.
2. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch*, rama `main`, carpeta `/ (root)`, y guarda.
3. En uno o dos minutos la página queda en `https://<usuario>.github.io/<repositorio>/`.

**Netlify**
1. Entra a [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arrastra la carpeta del proyecto. Netlify entrega una URL `https://<nombre>.netlify.app`.

Ambos sitios sirven por HTTPS, así que el GPS del teléfono funciona.

## Uso

1. Al cargar, la página pide tu ubicación y muestra un marcador azul con su círculo de precisión. En un portátil la precisión puede ser de cientos de metros, porque se calcula con Wi-Fi o IP y no con GPS. Si no das permiso, el mapa queda en Manizales.
2. Haz clic en el mapa para agregar vértices: aparecen puntos naranjas unidos por una línea punteada.
3. Con 3 o más vértices se habilita **Cerrar polígono**, que muestra el área (m² y hectáreas) y el perímetro (m).
4. **Deshacer punto** quita el último vértice; **Limpiar** borra todo.
5. **Exportar GeoJSON** descarga `poligono.geojson`, que puedes arrastrar a [geojson.io](https://geojson.io) para comprobarlo.

### Retos implementados (los 9)

| # | Reto | Cómo se usa |
|---|---|---|
| 1 | Tabla de coordenadas con 6 decimales | Panel "Vértices" a la derecha (debajo del mapa en celular). Se actualiza al agregar, deshacer, limpiar y recargar. |
| 2 | Color del polígono | Selector "Color". Cambia el polígono al instante (`setStyle`) y se exporta como `stroke`/`fill`, que geojson.io usa para pintarlo. |
| 3 | Nombre del polígono | Campo "Nombre". Se guarda en `properties.nombre` del GeoJSON ("Mi polígono" si está vacío). |
| 4 | Mi ubicación como vértice | Botón "Agregar mi ubicación como vértice": sirve para caminar el contorno de una cancha con el celular y pulsarlo en cada esquina. |
| 5 | Guardar en `localStorage` | Automático: al recargar se recupera el dibujo (abierto o cerrado). "Limpiar" borra lo guardado. |
| 6 | Importar `.geojson` | "Importar GeoJSON": dibuja el archivo en morado punteado. Puedes probar con `ejemplo.geojson`. |
| 7 | ¿Dentro o fuera? | Con el polígono cerrado, pulsa "Mi ubicación": el mensaje dice si estás DENTRO o FUERA (`turf.booleanPointInPolygon`). |
| 8 | Geocerca | "Iniciar geocerca" rastrea tu posición en tiempo real (`watchPosition`) y avisa con una alerta (y vibración en el celular) al salir del polígono. "Detener geocerca" llama a `clearWatch`. |
| 9 | Polígono que se cruza | Al cerrar un polígono en forma de "8", aparece una advertencia porque el área no es confiable (`turf.kinks`). |

## Conceptos clave en el código

- Leaflet usa `[lat, lng]` y GeoJSON/Turf usan `[lng, lat]`. El array `puntos` siempre está en orden Leaflet, y la conversión se hace en una sola función: `aGeoJSON()`.
- El anillo GeoJSON repite el primer punto al final para cerrarse.
- No se puede cerrar con menos de 3 vértices. Tanto el botón como la función `cerrarPoligono()` lo impiden.
- Después de cada cambio, `refrescarEstado()` sincroniza la línea guía, los botones, la tabla y `localStorage`, así que el estado nunca queda inconsistente.
- `pedirUbicacion()` es la única llamada a `getCurrentPosition`. La comparten "Mi ubicación" y el reto 4, que también maneja los 3 códigos de error.

## Privacidad

**¿Qué riesgos de privacidad tiene una página que pide y guarda la ubicación de sus usuarios, y cómo los mitigaría?**

La ubicación es un dato personal sensible. Con unas pocas coordenadas se puede deducir dónde vive, estudia o trabaja una persona, cuáles son sus rutinas y con quién se reúne. Si esos datos se filtran, se venden o se cruzan con otras fuentes, facilitan el acoso, el robo o la vigilancia. Para mitigar esos riesgos, la página debe pedir **consentimiento** explícito e informado: solicitar el permiso solo cuando hace falta y explicar para qué se usa. También debe **minimizar los datos**: pedir la ubicación únicamente para la función que la requiere, no guardar historiales de recorrido y no conservar más precisión de la necesaria. Tampoco debe **enviar las coordenadas a terceros** (analítica, publicidad ni servidores propios sin necesidad). En esta app la ubicación se procesa en el propio navegador y solo se descarga la cartografía de OpenStreetMap. Lo que se guarda en **`localStorage` se queda en ese dispositivo**, no viaja a ningún servidor y solo contiene los vértices dibujados, no el rastro del usuario. Por **transparencia**, el usuario debe saber qué se guarda y dónde. Finalmente, debe existir un mecanismo de **borrado**: aquí el botón "Limpiar" elimina el polígono y su registro guardado, la geocerca se detiene cuando el usuario quiera, y el permiso puede revocarse en cualquier momento desde la configuración del navegador.

## Entregables

- [ ] Enlace al repositorio con `index.html`, `estilos.css` y `app.js`
- [ ] Enlace a la página publicada en GitHub Pages o Netlify (HTTPS)
- [ ] `poligono.geojson` de un lugar real del campus o del barrio (exportado desde la app)
- [ ] Captura de pantalla del polígono con el popup de área y perímetro
- [ ] Párrafo de privacidad (sección anterior)
