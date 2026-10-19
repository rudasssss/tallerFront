

// Atajo para obtener un elemento del DOM por su id
const porId = (id) => document.getElementById(id);

//  Mostrar el mapa 

const CENTRO_INICIAL = [5.0689, -75.5174]; // Manizales, por si falla la ubicación

const mapa = L.map('mapa').setView(CENTRO_INICIAL, 15);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

//geolocalizacion
let marcadorUsuario = null;  // marcador de Estas aquí
let circuloPrecision = null; // círculo con el radio de precisión del GPS

// Opciones de la API
const OPCIONES_GPS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

// Mensaje para cada código de error de la API de geolocalización
const MENSAJES_ERROR_GPS = {
  1: 'Permiso denegado. Activa la ubicación en el navegador.', // PERMISSION_DENIED
  2: 'No se pudo determinar la ubicación.',                     // POSITION_UNAVAILABLE
  3: 'Se agotó el tiempo de espera.'                            // TIMEOUT
};

// Escribe un mensaje de estado
function mostrarInfo(texto, esAlerta = false) {
  const info = porId('info');
  info.textContent = texto;
  info.classList.toggle('alerta', esAlerta);
}

// Indica si el navegador tiene la API
function hayGeolocalizacion() {
  if ('geolocation' in navigator) return true;
  mostrarInfo('Tu navegador no soporta geolocalización.');
  return false;
}

// Traduce el código de error de la API 
function informarErrorGps(err) {
  mostrarInfo(MENSAJES_ERROR_GPS[err.code] || 'Error desconocido.', true);
}

// Pide UNA posición y entrega sus coordenadas a la función alRecibir
// La comparten ubicarUsuario y agregarMiUbicacion (reto 4) 
function pedirUbicacion(alRecibir) {
  if (!hayGeolocalizacion()) return;
  mostrarInfo('Buscando tu ubicación...');
  navigator.geolocation.getCurrentPosition((pos) => alRecibir(pos.coords), informarErrorGps, OPCIONES_GPS);
}

// Dibuja el marcador del usuario y su círculo 
function dibujarUsuario(punto, precision) {
  if (marcadorUsuario) mapa.removeLayer(marcadorUsuario);
  if (circuloPrecision) mapa.removeLayer(circuloPrecision);
  marcadorUsuario = L.marker(punto).addTo(mapa).bindPopup('Estás aquí');
  circuloPrecision = L.circle(punto, { radius: precision, fillOpacity: 0.1 }).addTo(mapa);
}

// Botón de Mi ubicacion centra el mapa en el usuario y si hay polígono dice si está dentro (reto 7)
function ubicarUsuario() {
  pedirUbicacion(({ latitude, longitude, accuracy }) => {
    const punto = [latitude, longitude];
    dibujarUsuario(punto, accuracy);
    marcadorUsuario.openPopup();
    mapa.setView(punto, 17);
    mostrarInfo(`Ubicación encontrada (precisión: ${Math.round(accuracy)} m). Haz clic para dibujar.${describirPosicion(punto)}`);
  });
}

porId('btnUbicar').addEventListener('click', ubicarUsuario);

//  Capturar los vertices con clics 

let puntos = [];     
let vertices = [];   
let poligono = null; 

// linea punteada que une los vertices cuando el polígono está abierto
const lineaGuia = L.polyline([], { color: '#e67e22', dashArray: '6 6' }).addTo(mapa);

// Agregar un vertice la usan el clic en el mapa el reto 4 y el reto 5
function agregarVertice(lat, lng) {
  if (poligono) return; // si ya esta cerrado no se agregan más puntos
  puntos.push([lat, lng]);
  vertices.push(L.circleMarker([lat, lng], { radius: 6, color: '#e67e22', fillOpacity: 1 }).addTo(mapa));
  refrescarEstado();
  mostrarInfo(`${puntos.length} vértice(s). Necesitas al menos 3 para cerrar.`);
}

mapa.on('click', (e) => agregarVertice(e.latlng.lat, e.latlng.lng));

function refrescarEstado() {
  lineaGuia.setLatLngs(poligono ? [] : puntos);
  actualizarBotones();
  actualizarTabla();    // reto 1
  guardarEnNavegador(); // reto 5
}

// Habilita cada boton solo cuando su acción tiene sentido en el estado actual
function actualizarBotones() {
  const cerrado = poligono !== null;
  porId('btnCerrar').disabled = puntos.length < 3 || cerrado;
  porId('btnDeshacer').disabled = puntos.length === 0 || cerrado;
  porId('btnExportar').disabled = !cerrado;
  porId('btnAgregarUbicacion').disabled = cerrado; // reto 4
  porId('btnGeocerca').disabled = !cerrado;        // reto 8
}

//  Cerrar el polígono y medirlo 

function aGeoJSON() {
  const anillo = puntos.map(([lat, lng]) => [lng, lat]);
  anillo.push(anillo[0]); // cerrar el anillo: GeoJSON repite el primer punto al final
  return turf.polygon([anillo], {
    nombre: nombrePoligono(), // reto 3
    creado: new Date().toISOString(),
    stroke: colorElegido(),   // reto 2
    fill: colorElegido()
  });
}

// Área en m² y perímetro en metros, calculados por Turf sobre la superficie terrestre
function medir(geo = aGeoJSON()) {
  const area = turf.area(geo); // metros cuadrados
  const perimetro = turf.length(turf.polygonToLine(geo), { units: 'meters' });
  return { area, perimetro };
}

function cerrarPoligono() {
  if (poligono || puntos.length < 3) return; // un poligono necesita al menos 3 vértices
  poligono = L.polygon(puntos, { color: colorElegido(), fillOpacity: 0.35 }).addTo(mapa);
  mapa.fitBounds(poligono.getBounds());
  refrescarEstado();
  mostrarMedidas();
}

// Muestra area y perimetro en el popup y en el mensaje avisa si hay cruces (reto 9)
function mostrarMedidas() {
  const geo = aGeoJSON();
  const { area, perimetro } = medir(geo);
  poligono.bindPopup(`Área: ${area.toFixed(1)} m²<br>Perímetro: ${perimetro.toFixed(1)} m`).openPopup();

  const texto = `Polígono cerrado. Área: ${area.toFixed(1)} m² (${(area / 10000).toFixed(3)} ha).`;
  const cruza = seCruzaConsigoMismo(geo);
  mostrarInfo(cruza ? `${texto}  El polígono se cruza consigo mismo: el área no es confiable.` : texto, cruza);
}

porId('btnCerrar').addEventListener('click', cerrarPoligono);

// ---------- Paso 6. Deshacer y limpiar ----------

// Quita el último vértice (solo mientras el polígono sigue abierto)
function deshacerPunto() {
  if (poligono || puntos.length === 0) return; // protege el estado aunque se llame por código
  puntos.pop();
  mapa.removeLayer(vertices.pop());
  refrescarEstado();
  mostrarInfo(`${puntos.length} vértice(s).`);
}

// Devuelve el mapa al estado inicial de dibujo
function limpiar() {
  detenerGeocerca();     // reto 8: sin polígono no hay geocerca
  quitarCapaImportada(); // reto 6
  vertices.forEach((v) => mapa.removeLayer(v));
  if (poligono) mapa.removeLayer(poligono);
  puntos = [];
  vertices = [];
  poligono = null;
  refrescarEstado();
  mostrarInfo('Mapa limpio. Haz clic para empezar de nuevo.');
}

porId('btnDeshacer').addEventListener('click', deshacerPunto);
porId('btnLimpiar').addEventListener('click', limpiar);

// ---------- Paso 7. Exportar a GeoJSON ----------

// Descarga el polígono como archivo .geojson usando un enlace temporal
function exportar() {
  if (!poligono) return;
  const texto = JSON.stringify(aGeoJSON(), null, 2);
  const blob = new Blob([texto], { type: 'application/geo+json' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'poligono.geojson';
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000); // liberar memoria del Blob
}

porId('btnExportar').addEventListener('click', exportar);

// =============================================================
// RETOS
// =============================================================

// ---------- Reto 1. Tabla de vértices ----------

// Crea una fila <tr> con una celda <td> por cada valor
function crearFila(valores) {
  const fila = document.createElement('tr');
  valores.forEach((valor) => {
    const celda = document.createElement('td');
    celda.textContent = valor;
    fila.appendChild(celda);
  });
  return fila;
}

// Reconstruye la tabla a partir de puntos (6 decimales ≈ 0,1 m de resolución)
function actualizarTabla() {
  const cuerpo = porId('cuerpoTabla');
  cuerpo.replaceChildren();
  puntos.forEach(([lat, lng], i) => cuerpo.appendChild(crearFila([i + 1, lat.toFixed(6), lng.toFixed(6)])));
  porId('tablaVacia').hidden = puntos.length > 0;
}

// ---------- Reto 2. Color del polígono ----------

function colorElegido() {
  return porId('inputColor').value;
}

porId('inputColor').addEventListener('input', () => {
  if (poligono) poligono.setStyle({ color: colorElegido() });
});

// ---------- Reto 3. Nombre del polígono ----------

// Nombre escrito por el usuario o uno por defecto si el campo está vacío
function nombrePoligono() {
  return porId('inputNombre').value.trim() || 'Mi polígono';
}

// ---------- Reto 4. Agregar mi ubicación como vértice ----------

// Sirve para caminar el contorno de una cancha con el celular, un vértice por esquina
function agregarMiUbicacion() {
  pedirUbicacion(({ latitude, longitude, accuracy }) => {
    if (poligono) {
      mostrarInfo('El polígono ya está cerrado. Usa "Limpiar" para empezar otro.');
      return;
    }
    dibujarUsuario([latitude, longitude], accuracy);
    agregarVertice(latitude, longitude);
  });
}

porId('btnAgregarUbicacion').addEventListener('click', agregarMiUbicacion);

// ---------- Reto 5. Guardar en localStorage ----------

const CLAVE_GUARDADO = 'taller-poligono';

// Guarda los vértices y si el polígono está cerrado; con el mapa vacío borra el registro.
// Los datos solo quedan en este navegador: no se envían a ningún servidor.
function guardarEnNavegador() {
  try {
    if (puntos.length === 0) localStorage.removeItem(CLAVE_GUARDADO);
    else localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ puntos, cerrado: poligono !== null }));
  } catch (e) {
    // Almacenamiento bloqueado (p. ej. modo privado): la app sigue funcionando sin guardar
  }
}

// Un punto guardado es válido si es [número, número]
const esPuntoValido = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

// Lee lo guardado; devuelve null si no hay nada o si los datos están dañados
function leerGuardado() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_GUARDADO));
    return datos && Array.isArray(datos.puntos) && datos.puntos.every(esPuntoValido) ? datos : null;
  } catch (e) {
    return null;
  }
}

// Vuelve a dibujar lo guardado al recargar la página
function restaurarGuardado() {
  const guardado = leerGuardado();
  if (!guardado) return;
  guardado.puntos.forEach(([lat, lng]) => agregarVertice(lat, lng));
  if (guardado.cerrado) cerrarPoligono();
}

// ---------- Reto 6. Importar un archivo .geojson ----------

let capaImportada = null; // capa con el último archivo importado
const ESTILO_IMPORTADO = { color: '#8e44ad', dashArray: '4 4', fillOpacity: 0.2 };

function quitarCapaImportada() {
  if (capaImportada) mapa.removeLayer(capaImportada);
  capaImportada = null;
}

// Lee el archivo elegido con FileReader y lo dibuja al terminar
function importarArchivo(evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = () => dibujarImportado(lector.result, archivo.name);
  lector.readAsText(archivo);
  evento.target.value = ''; // permite volver a elegir el mismo archivo
}

// Convierte el texto en capa de Leaflet (L.geoJSON ya entiende el orden [lng, lat])
function dibujarImportado(texto, nombreArchivo) {
  try {
    const capa = L.geoJSON(JSON.parse(texto), { style: ESTILO_IMPORTADO });
    if (!capa.getBounds().isValid()) throw new Error('El archivo no tiene geometrías');
    quitarCapaImportada();
    capaImportada = capa.addTo(mapa);
    mapa.fitBounds(capaImportada.getBounds());
    mostrarInfo(`Archivo "${nombreArchivo}" importado (en morado).`);
  } catch (e) {
    mostrarInfo('El archivo no es un GeoJSON válido.', true);
  }
}

porId('inputArchivo').addEventListener('change', importarArchivo);

// ---------- Reto 7. ¿El usuario está dentro del polígono? ----------

// Turf espera [lng, lat], por eso se invierte el punto de Leaflet
function estaDentro([lat, lng]) {
  return turf.booleanPointInPolygon(turf.point([lng, lat]), aGeoJSON());
}

// Frase para añadir a los mensajes de ubicación; vacía si aún no hay polígono
function describirPosicion(punto) {
  if (!poligono) return '';
  return estaDentro(punto) ? ' Estás DENTRO del polígono.' : ' Estás FUERA del polígono.';
}

// ---------- Reto 8. Geocerca en tiempo real ----------

let idSeguimiento = null; // id que devuelve watchPosition; null = geocerca apagada
let estabaDentro = null;  // último estado conocido, para detectar el momento de salida

function alternarGeocerca() {
  if (idSeguimiento === null) {
    iniciarGeocerca();
  } else {
    detenerGeocerca();
    mostrarInfo('Geocerca detenida.');
  }
}

function iniciarGeocerca() {
  if (!poligono || !hayGeolocalizacion()) return;
  estabaDentro = null;
  idSeguimiento = navigator.geolocation.watchPosition(revisarGeocerca, errorGeocerca, OPCIONES_GPS);
  porId('btnGeocerca').textContent = 'Detener geocerca';
  mostrarInfo('Geocerca activa: esperando tu ubicación...');
}

function detenerGeocerca() {
  if (idSeguimiento === null) return;
  navigator.geolocation.clearWatch(idSeguimiento);
  idSeguimiento = null;
  porId('btnGeocerca').textContent = 'Iniciar geocerca';
}

// Se ejecuta con cada nueva posición: mueve el marcador y avisa si el usuario salió
function revisarGeocerca({ coords }) {
  const punto = [coords.latitude, coords.longitude];
  dibujarUsuario(punto, coords.accuracy);
  const dentro = estaDentro(punto);
  if (estabaDentro && !dentro) avisarSalida();
  mostrarInfo(dentro ? 'Geocerca activa: se encuentra dentro del poligono.' : ' Geocerca activa: se encuentra fuera del poligono.', !dentro);
  estabaDentro = dentro;
}

// Aviso llamativo solo en el momento de cruzar el borde hacia afuera
function avisarSalida() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // en celulares
  alert('¡Saliste del polígono!');
}

// Si el usuario niega el permiso no tiene sentido seguir rastreando
function errorGeocerca(err) {
  informarErrorGps(err);
  if (err.code === 1) detenerGeocerca();
}

porId('btnGeocerca').addEventListener('click', alternarGeocerca);

// Polígono que se cruza consigo mismo

// Un polígono en forma de 8 tiene autointersecciones y su area sale mal
function seCruzaConsigoMismo(geo) {
  return turf.kinks(geo).features.length > 0;
}

// inicio de la aplicación 

restaurarGuardado(); // reto 5
ubicarUsuario();     // intentar ubicar al usuario apenas carga la página
