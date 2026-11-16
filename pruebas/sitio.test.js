const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { construir } = require('../src/sitio.js');
const { SITIO, carpeta, sitioCon } = require('./ayuda.js');

test('arma la portada y copia los estilos', () => {
  const contenido = carpeta({ 'sitio.txt': SITIO });
  const salida = path.join(carpeta(), 'salida');
  const r = construir(contenido, salida);
  assert.ok(r.paginas.includes('index.html'));
  assert.deepEqual(r.avisos, []);
  const html = fs.readFileSync(path.join(salida, 'index.html'), 'utf8');
  assert.ok(html.includes('baldíos lab'));
  assert.ok(Buffer.byteLength(html) < 50000);
  assert.ok(fs.existsSync(path.join(salida, 'estilos', 'base.css')));
  assert.ok(fs.existsSync(path.join(salida, 'estilos', 'temas.css')));
});

test('copia la foto', () => {
  const contenido = carpeta({ 'sitio.txt': sitioCon({ foto: 'foto.jpg' }), 'foto.jpg': 'x' });
  const salida = path.join(carpeta(), 'salida');
  construir(contenido, salida);
  assert.equal(fs.readFileSync(path.join(salida, 'foto.jpg'), 'utf8'), 'x');
});

test('borra lo que había antes en la salida', () => {
  const contenido = carpeta({ 'sitio.txt': SITIO });
  const salida = path.join(carpeta(), 'salida');
  fs.mkdirSync(salida);
  fs.writeFileSync(path.join(salida, 'viejo.html'), 'x');
  construir(contenido, salida);
  assert.ok(!fs.existsSync(path.join(salida, 'viejo.html')));
});

test('se niega a borrar una carpeta que no se llame salida', () => {
  const contenido = carpeta({ 'sitio.txt': SITIO });
  const otra = carpeta({ 'importante.txt': 'x' });
  assert.throws(() => construir(contenido, otra), /salida/);
  assert.ok(fs.existsSync(path.join(otra, 'importante.txt')));
});

test('la opción direccion reemplaza la de sitio.txt', () => {
  const contenido = carpeta({
    'sitio.txt': sitioCon({ direccion: 'https://ga2991.github.io/baldioslab/' }),
  });
  const salida = path.join(carpeta(), 'salida');
  construir(contenido, salida, { direccion: 'http://127.0.0.1:8080/' });
  const html = fs.readFileSync(path.join(salida, 'index.html'), 'utf8');
  assert.ok(html.includes('href="/estilos/base.css"'));
});
