const test = require('node:test');
const assert = require('node:assert/strict');
const { pagina, portada, menuDe } = require('../src/plantillas.js');
const textos = require('../src/textos.es.json');

const CSP =
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'">`;

function sitioDe(cambios = {}) {
  return {
    nombre: 'baldíos lab',
    lema: 'música · videojuegos · software',
    tema: 'bosque',
    direccion: 'https://baldioslab.github.io/',
    raiz: '/',
    foto: undefined,
    redes: [
      { nombre: 'bandcamp', url: 'https://ejemplo.bandcamp.com' },
      { nombre: 'soundcloud', url: 'https://soundcloud.com/ejemplo' },
      { nombre: 'itch.io', url: 'https://ejemplo.itch.io' },
      { nombre: 'github', url: 'https://github.com/GA2991' },
    ],
    presentacion: 'Un párrafo corto.',
    ...cambios,
  };
}

function paginaDe(sitio, extra = {}) {
  return pagina({
    sitio,
    textos,
    titulo: '',
    ruta: '',
    menu: menuDe({ sitio, textos, trabajos: [], entradas: [] }),
    cuerpo: '<p>hola</p>',
    ...extra,
  });
}

test('la página base lleva tema, idioma, política de seguridad y ningún script', () => {
  const html = paginaDe(sitioDe());
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('<html lang="es">'));
  assert.ok(html.includes('class="tema-bosque"'));
  assert.ok(html.includes(CSP));
  assert.ok(!html.includes('<script'));
  assert.ok(html.includes('<title>baldíos lab</title>'));
  assert.ok(html.includes('href="/estilos/temas.css"'));
  assert.ok(html.includes('href="/estilos/base.css"'));
  assert.ok(html.includes('<p>hola</p>'));
});

test('el título de las páginas interiores va antes del nombre', () => {
  const html = paginaDe(sitioDe(), { titulo: 'Blog', ruta: 'blog/' });
  assert.ok(html.includes('<title>Blog · baldíos lab</title>'));
});

test('los enlaces internos respetan la raíz', () => {
  const html = paginaDe(sitioDe({ raiz: '/baldioslab/' }));
  assert.ok(html.includes('href="/baldioslab/estilos/base.css"'));
  assert.ok(html.includes('<a class="brand" href="/baldioslab/"'));
});

test('el nombre del sitio se escapa', () => {
  const html = paginaDe(sitioDe({ nombre: 'A <b> & C' }));
  assert.ok(html.includes('A &lt;b&gt; &amp; C'));
  assert.ok(!html.includes('<b>'));
});

test('la portada muestra presentación, lema y redes', () => {
  const sitio = sitioDe();
  const html = portada({ sitio, textos, trabajos: [], entradas: [] });
  assert.ok(html.includes('Un párrafo corto.'));
  assert.ok(html.includes('música · videojuegos · software'));
  for (const red of sitio.redes) {
    assert.ok(html.includes(`<a href="${red.url}" rel="me noopener">${red.nombre}</a>`), red.nombre);
  }
  assert.ok(!html.includes('<img'));
});

test('la portada escapa la presentación y muestra la foto si hay', () => {
  const html = portada({
    sitio: sitioDe({ presentacion: 'Tom & <Jerry>', foto: 'foto.jpg', raiz: '/x/' }),
    textos,
    trabajos: [],
    entradas: [],
  });
  assert.ok(html.includes('Tom &amp; &lt;Jerry&gt;'));
  assert.ok(html.includes('<img class="photo" src="/x/foto.jpg"'));
});

test('con el sitio vacío el menú solo tiene inicio', () => {
  const menu = menuDe({ sitio: sitioDe(), textos, trabajos: [], entradas: [] });
  assert.deepEqual(menu, [{ texto: 'inicio', ruta: '' }]);
});
