const test = require('node:test');
const assert = require('node:assert/strict');
const { cargarContenido } = require('../src/contenido.js');
const { SITIO, carpeta, sitioCon } = require('./ayuda.js');

test('lee sitio.txt', () => {
  const { sitio, trabajos, entradas, avisos } = cargarContenido(carpeta({ 'sitio.txt': SITIO }));
  assert.equal(sitio.nombre, 'baldíos lab');
  assert.equal(sitio.lema, 'música · videojuegos · software');
  assert.equal(sitio.tema, 'bosque');
  assert.equal(sitio.redes.length, 4);
  assert.deepEqual(sitio.redes[0], { nombre: 'bandcamp', url: 'https://ejemplo.bandcamp.com' });
  assert.equal(sitio.raiz, '/');
  assert.equal(sitio.foto, undefined);
  assert.equal(sitio.presentacion, 'Un párrafo corto sobre quién eres y qué haces.');
  assert.deepEqual(trabajos, []);
  assert.deepEqual(entradas, []);
  assert.deepEqual(avisos, []);
});

test('la raíz sale de la dirección', () => {
  const con = (direccion) =>
    cargarContenido(carpeta({ 'sitio.txt': sitioCon({ direccion }) })).sitio;
  assert.equal(con('https://ga2991.github.io/baldioslab').raiz, '/baldioslab/');
  assert.equal(con('https://ga2991.github.io/baldioslab/').raiz, '/baldioslab/');
  assert.equal(con('https://ga2991.github.io/baldioslab').direccion, 'https://ga2991.github.io/baldioslab/');
  const sin = cargarContenido(carpeta({ 'sitio.txt': sitioCon({ direccion: null }) })).sitio;
  assert.equal(sin.raiz, '/');
});

test('el tema por defecto es bosque', () => {
  const { sitio } = cargarContenido(carpeta({ 'sitio.txt': sitioCon({ tema: null }) }));
  assert.equal(sitio.tema, 'bosque');
});

test('errores de sitio.txt en español y con el dato que falla', () => {
  const falla = (cambios, patron) =>
    assert.throws(() => cargarContenido(carpeta({ 'sitio.txt': sitioCon(cambios) })), patron);
  falla({ nombre: null }, /sitio\.txt.*nombre/);
  falla({ tema: 'azul' }, /sitio\.txt.*tema/);
  falla({ red: 'x | javascript:alert(1)' }, /sitio\.txt.*red/);
  falla({ red: 'solo-un-nombre' }, /sitio\.txt.*red/);
  falla({ direccion: 'baldioslab' }, /sitio\.txt.*direccion/);
  falla({ foto: 'no-existe.jpg' }, /no-existe\.jpg/);
  falla({ foto: '../fuera.jpg' }, /sitio\.txt.*foto/);
});

test('si no hay sitio.txt lo dice claro', () => {
  assert.throws(() => cargarContenido(carpeta()), /sitio\.txt/);
});

test('acepta una foto que existe', () => {
  const dir = carpeta({ 'sitio.txt': sitioCon({ foto: 'foto.jpg' }), 'foto.jpg': 'x' });
  assert.equal(cargarContenido(dir).sitio.foto, 'foto.jpg');
});
