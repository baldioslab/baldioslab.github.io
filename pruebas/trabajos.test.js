const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cargarContenido } = require('../src/contenido.js');
const { pagina, portada, menuDe, ficha, seccion } = require('../src/plantillas.js');
const { construir } = require('../src/sitio.js');
const textos = require('../src/textos.es.json');
const { SITIO, carpeta } = require('./ayuda.js');

const DISCO = `titulo: Un disco
tipo: musica
año: 2025
enlace: https://ejemplo.bandcamp.com/album/un-disco
imagen: portada.jpg
audio: cancion.mp3
`;
const JUEGO = `titulo: Un juego
tipo: juego
año: 2026
enlace: https://ejemplo.itch.io/un-juego
`;
const PROGRAMA = `titulo: Un programa
tipo: proyecto
año: 2025
enlace: https://github.com/GA2991/ejemplo
`;

function base(extra = {}) {
  return carpeta({
    'sitio.txt': SITIO,
    'trabajos/disco.txt': DISCO,
    'trabajos/juego.txt': JUEGO,
    'trabajos/programa.txt': PROGRAMA,
    'imagenes/portada.jpg': 'x',
    'audio/cancion.mp3': 'x',
    ...extra,
  });
}

// Reemplaza o quita una línea de una ficha.
function con(ficha, clave, valor) {
  const patron = new RegExp(`^${clave}:.*\\n`, 'm');
  return valor === null ? ficha.replace(patron, '') : ficha.replace(patron, `${clave}: ${valor}\n`);
}

function fallaCon(fichaMala, patron, extra = {}) {
  assert.throws(() => cargarContenido(base({ 'trabajos/mala.txt': fichaMala, ...extra })), patron);
}

test('carga las fichas y las ordena de la más nueva a la más vieja', () => {
  const { trabajos, avisos } = cargarContenido(base());
  assert.deepEqual(trabajos.map((t) => t.titulo), ['Un juego', 'Un disco', 'Un programa']);
  assert.deepEqual(trabajos[1], {
    titulo: 'Un disco',
    tipo: 'musica',
    año: 2025,
    enlace: 'https://ejemplo.bandcamp.com/album/un-disco',
    imagen: 'portada.jpg',
    audio: 'cancion.mp3',
    archivo: 'trabajos/disco.txt',
  });
  assert.equal(trabajos[0].imagen, undefined);
  assert.deepEqual(avisos, []);
});

test('acepta el tipo con tilde, mayúsculas o en plural', () => {
  const dir = base({
    'trabajos/a.txt': con(DISCO, 'tipo', 'Música'),
    'trabajos/b.txt': con(JUEGO, 'tipo', 'juegos'),
    'trabajos/c.txt': con(PROGRAMA, 'tipo', 'Proyectos'),
  });
  const tipos = cargarContenido(dir).trabajos.map((t) => t.tipo);
  assert.equal(tipos.filter((t) => t === 'musica').length, 2);
  assert.equal(tipos.filter((t) => t === 'juego').length, 2);
  assert.equal(tipos.filter((t) => t === 'proyecto').length, 2);
});

test('sin carpeta de trabajos no hay trabajos', () => {
  assert.deepEqual(cargarContenido(carpeta({ 'sitio.txt': SITIO })).trabajos, []);
});

test('solo se leen los archivos .txt', () => {
  const dir = base({ 'trabajos/notas.md': 'cualquier cosa', 'trabajos/copia.txt.bak': 'x' });
  assert.equal(cargarContenido(dir).trabajos.length, 3);
});

test('errores de ficha: nombran el archivo y el dato', () => {
  fallaCon(con(DISCO, 'titulo', null), /trabajos\/mala\.txt.*titulo/);
  fallaCon(con(DISCO, 'tipo', null), /trabajos\/mala\.txt.*tipo/);
  fallaCon(con(DISCO, 'tipo', 'disco'), /trabajos\/mala\.txt.*tipo/);
  fallaCon(con(DISCO, 'año', null), /trabajos\/mala\.txt.*año/);
  fallaCon(con(DISCO, 'año', 'dos mil'), /trabajos\/mala\.txt.*año/);
  fallaCon(con(DISCO, 'enlace', null), /trabajos\/mala\.txt.*enlace/);
  fallaCon(con(DISCO, 'enlace', 'javascript:alert(1)'), /trabajos\/mala\.txt.*enlace/);
  fallaCon(con(DISCO, 'enlace', 'ejemplo.com'), /trabajos\/mala\.txt.*enlace/);
  fallaCon(con(DISCO, 'imagen', 'falta.jpg'), /trabajos\/mala\.txt.*falta\.jpg/);
  fallaCon(con(DISCO, 'audio', 'falta.mp3'), /trabajos\/mala\.txt.*falta\.mp3/);
  fallaCon(con(DISCO, 'imagen', '../sitio.txt'), /trabajos\/mala\.txt.*imagen/);
  fallaCon(con(DISCO, 'audio', 'cancion.exe'), /trabajos\/mala\.txt.*audio/, { 'audio/cancion.exe': 'x' });
  fallaCon(JUEGO + 'audio: cancion.mp3\n', /trabajos\/mala\.txt.*audio/);
  fallaCon('titulo: x\nlínea rota', /trabajos\/mala\.txt.*línea 2/);
});

test('una imagen pesada produce un aviso, no un error', () => {
  const dir = base({ 'imagenes/portada.jpg': Buffer.alloc(200001) });
  const { trabajos, avisos } = cargarContenido(dir);
  assert.equal(trabajos.length, 3);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /portada\.jpg/);
  assert.deepEqual(cargarContenido(base({ 'imagenes/portada.jpg': Buffer.alloc(200000) })).avisos, []);
});

// ---- plantillas ----

function datos(dir = base()) {
  const c = cargarContenido(dir);
  return { ...c, textos };
}

test('la ficha es un solo enlace con título, tipo y año', () => {
  const { sitio, trabajos } = datos();
  const html = ficha(trabajos[1], { sitio, textos });
  assert.match(html, /^<a class="ficha" href="https:\/\/ejemplo\.bandcamp\.com\/album\/un-disco" rel="noopener">/);
  assert.equal(html.match(/<a /g).length, 1);
  assert.ok(html.includes('Un disco'));
  assert.ok(html.includes('música · 2025'));
  assert.ok(html.includes('<img src="/imagenes/portada.jpg" alt="" loading="lazy"'));
  assert.ok(!ficha(trabajos[0], { sitio, textos }).includes('<img'));
});

test('la ficha escapa el título', () => {
  const { sitio, trabajos } = datos();
  const html = ficha({ ...trabajos[0], titulo: 'Tom & <Jerry>' }, { sitio, textos });
  assert.ok(html.includes('Tom &amp; &lt;Jerry&gt;'));
  assert.ok(!html.includes('<Jerry>'));
});

test('los nombres de archivo con espacios o tildes se codifican en la dirección', () => {
  const { sitio, trabajos } = datos();
  const html = ficha({ ...trabajos[1], imagen: 'mi portada ñ.jpg' }, { sitio, textos });
  assert.ok(html.includes('src="/imagenes/mi%20portada%20%C3%B1.jpg"'));
});

test('la sección de música tiene las canciones que suenan y las fichas', () => {
  const { sitio, trabajos } = datos();
  const html = seccion({ sitio, textos, tipo: 'musica', trabajos });
  assert.ok(html.includes('<h1>Música</h1>'));
  assert.ok(html.includes('<audio controls preload="none" src="/audio/cancion.mp3"></audio>'));
  assert.ok(html.includes('Escucha'));
  assert.equal(html.match(/class="ficha"/g).length, 1);
  assert.ok(!html.includes('Un juego'));
});

test('la sección de juegos no tiene bloque Escucha', () => {
  const { sitio, trabajos } = datos();
  const html = seccion({ sitio, textos, tipo: 'juego', trabajos });
  assert.ok(html.includes('<h1>Juegos</h1>'));
  assert.ok(!html.includes('Escucha'));
  assert.ok(!html.includes('<audio'));
});

test('la portada muestra Escucha y los 6 trabajos más recientes', () => {
  const extra = {};
  for (let i = 0; i < 5; i++) {
    extra[`trabajos/extra${i}.txt`] = con(con(JUEGO, 'titulo', `Extra ${i}`), 'año', String(2010 + i));
  }
  for (let i = 0; i < 4; i++) {
    extra[`trabajos/cancion${i}.txt`] = con(
      con(con(DISCO, 'titulo', `Canción ${i}`), 'año', String(2000 + i)),
      'imagen',
      'portada.jpg'
    );
  }
  const { sitio, trabajos } = datos(base(extra));
  assert.equal(trabajos.length, 12);
  const html = portada({ sitio, textos, trabajos, entradas: [] });
  assert.ok(html.includes('Escucha'));
  assert.ok(html.includes('Últimos trabajos'));
  assert.equal(html.match(/class="ficha"/g).length, 6);
  assert.equal(html.match(/<audio /g).length, 3);
  assert.ok(html.includes('Un juego'));
  assert.ok(!html.includes('Extra 0'));
});

test('sin trabajos la portada no tiene esos bloques', () => {
  const { sitio } = datos();
  const html = portada({ sitio, textos, trabajos: [], entradas: [] });
  assert.ok(!html.includes('Escucha'));
  assert.ok(!html.includes('Últimos trabajos'));
});

test('el menú solo incluye las secciones que tienen fichas', () => {
  const { sitio, trabajos } = datos();
  assert.deepEqual(menuDe({ sitio, textos, trabajos, entradas: [] }), [
    { texto: 'inicio', ruta: '' },
    { texto: 'música', ruta: 'musica/' },
    { texto: 'juegos', ruta: 'juegos/' },
    { texto: 'proyectos', ruta: 'proyectos/' },
  ]);
  const sinJuegos = trabajos.filter((t) => t.tipo !== 'juego');
  const rutas = menuDe({ sitio, textos, trabajos: sinJuegos, entradas: [] }).map((m) => m.ruta);
  assert.deepEqual(rutas, ['', 'musica/', 'proyectos/']);
});

// ---- armado ----

test('construir genera las secciones y copia audio e imágenes', () => {
  const salida = path.join(carpeta(), 'salida');
  const { paginas, avisos } = construir(base(), salida);
  assert.deepEqual(avisos, []);
  for (const p of ['index.html', 'musica/index.html', 'juegos/index.html', 'proyectos/index.html']) {
    assert.ok(paginas.includes(p), p);
    const html = fs.readFileSync(path.join(salida, p), 'utf8');
    assert.ok(Buffer.byteLength(html) < 50000, p);
    assert.ok(!html.includes('<script'), p);
  }
  assert.ok(fs.existsSync(path.join(salida, 'audio', 'cancion.mp3')));
  assert.ok(fs.existsSync(path.join(salida, 'imagenes', 'portada.jpg')));
  const musica = fs.readFileSync(path.join(salida, 'musica', 'index.html'), 'utf8');
  assert.ok(musica.includes('<title>Música · baldíos lab</title>'));
  assert.ok(musica.includes('<a href="/musica/" aria-current="page">'));
});

test('una sección sin fichas no se genera', () => {
  const salida = path.join(carpeta(), 'salida');
  const dir = carpeta({ 'sitio.txt': SITIO, 'trabajos/juego.txt': JUEGO });
  const { paginas } = construir(dir, salida);
  assert.ok(paginas.includes('juegos/index.html'));
  assert.ok(!paginas.includes('musica/index.html'));
  assert.ok(!fs.existsSync(path.join(salida, 'musica')));
});
