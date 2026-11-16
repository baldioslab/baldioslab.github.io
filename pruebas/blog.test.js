const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cargarContenido } = require('../src/contenido.js');
const { pagina, portada, menuDe, blogIndice, entrada, noEncontrado, fechaLarga } = require('../src/plantillas.js');
const { feed } = require('../src/feed.js');
const { construir } = require('../src/sitio.js');
const textos = require('../src/textos.es.json');
const { SITIO, carpeta, sitioCon } = require('./ayuda.js');

const PRIMERA = `titulo: Primera entrada
fecha: 2026-11-15
---
Hola, **mundo**.
`;

function base(extra = {}) {
  return carpeta({
    'sitio.txt': SITIO,
    'blog/2026-11-15-primera-entrada.md': PRIMERA,
    ...extra,
  });
}

function falla(extra, patron) {
  assert.throws(() => cargarContenido(base(extra)), patron);
}

// ---- contenido ----

test('lee una entrada', () => {
  const { entradas } = cargarContenido(base());
  assert.equal(entradas.length, 1);
  assert.deepEqual(entradas[0], {
    titulo: 'Primera entrada',
    fecha: '2026-11-15',
    slug: 'primera-entrada',
    html: '<p>Hola, <strong>mundo</strong>.</p>',
    cuerpo: 'Hola, **mundo**.',
    archivo: 'blog/2026-11-15-primera-entrada.md',
  });
});

test('la fecha puede venir solo en el nombre del archivo, y la de la cabecera manda', () => {
  const { entradas } = cargarContenido(
    base({
      'blog/2025-01-02-sin-fecha.md': 'titulo: Sin fecha\n---\nx',
      'blog/2020-01-01-con-otra.md': 'titulo: Con otra\nfecha: 2027-03-04\n---\nx',
    })
  );
  assert.deepEqual(
    entradas.map((e) => [e.slug, e.fecha]),
    [
      ['con-otra', '2027-03-04'],
      ['primera-entrada', '2026-11-15'],
      ['sin-fecha', '2025-01-02'],
    ]
  );
});

test('los borradores no aparecen', () => {
  const { entradas } = cargarContenido(
    base({
      'blog/2026-12-01-a.md': 'titulo: A\nborrador: si\n---\nx',
      'blog/2026-12-02-b.md': 'titulo: B\nborrador: Sí\n---\nx',
      'blog/2026-12-03-c.md': 'titulo: C\nborrador: no\n---\nx',
    })
  );
  assert.deepEqual(entradas.map((e) => e.titulo), ['C', 'Primera entrada']);
});

test('el slug sale del nombre del archivo, sin tildes ni espacios', () => {
  const { entradas } = cargarContenido(
    carpeta({ 'sitio.txt': SITIO, 'blog/2026-11-15-Canción Ñandú.md': 'titulo: X\n---\nx' })
  );
  assert.equal(entradas[0].slug, 'cancion-nandu');
});

test('solo se leen los archivos .md', () => {
  const { entradas } = cargarContenido(base({ 'blog/notas.txt': 'cualquier cosa' }));
  assert.equal(entradas.length, 1);
});

test('errores de entrada: nombran el archivo y el dato', () => {
  falla({ 'blog/2026-01-01-x.md': 'fecha: 2026-01-01\n---\nx' }, /blog\/2026-01-01-x\.md.*titulo/);
  falla({ 'blog/x.md': 'titulo: X\n---\nx' }, /blog\/x\.md.*fecha/);
  falla({ 'blog/x.md': 'titulo: X\nfecha: 2026-02-30\n---\nx' }, /blog\/x\.md.*fecha/);
  falla({ 'blog/x.md': 'titulo: X\nfecha: mañana\n---\nx' }, /blog\/x\.md.*fecha/);
  falla({ 'blog/x.md': 'titulo: X\nfecha: 15-11-2026\n---\nx' }, /blog\/x\.md.*fecha/);
  falla({ 'blog/2026-01-01-¿¡.md': 'titulo: X\n---\nx' }, /blog\/2026-01-01-¿¡\.md/);
  falla({ 'blog/2026-01-01-x.md': 'titulo: X\n---\n![a](falta.jpg)' }, /blog\/2026-01-01-x\.md.*falta\.jpg/);
});

test('dos entradas con la misma dirección: el error nombra las dos', () => {
  assert.throws(
    () => cargarContenido(base({ 'blog/2025-05-05-Primera Entrada.md': 'titulo: Otra\n---\nx' })),
    (error) =>
      error.message.includes('2026-11-15-primera-entrada.md') &&
      error.message.includes('2025-05-05-Primera Entrada.md')
  );
});

test('las imágenes de una entrada usan la raíz del sitio y se anotan para copiarlas', () => {
  const dir = carpeta({
    'sitio.txt': sitioCon({ direccion: 'https://ga2991.github.io/baldioslab/' }),
    'blog/2026-01-01-x.md': 'titulo: X\n---\n![a](foto.png)',
    'imagenes/foto.png': 'x',
  });
  const { entradas, imagenes } = cargarContenido(dir);
  assert.ok(entradas[0].html.includes('src="/baldioslab/imagenes/foto.png"'));
  assert.deepEqual(imagenes, ['foto.png']);
});

// ---- plantillas ----

function datos(extra = {}) {
  return { ...cargarContenido(base(extra)), textos };
}

function muchas(n) {
  const extra = {};
  for (let i = 1; i <= n; i++) {
    const dia = String(i).padStart(2, '0');
    extra[`blog/2025-01-${dia}-entrada-${i}.md`] = `titulo: Entrada ${i}\n---\ntexto ${i}`;
  }
  return extra;
}

test('fecha larga en español', () => {
  assert.equal(fechaLarga('2026-11-15', textos), '15 de noviembre de 2026');
  assert.equal(fechaLarga('2026-01-01', textos), '1 de enero de 2026');
});

test('la página de una entrada', () => {
  const { sitio, entradas } = datos();
  const html = entrada({ sitio, textos, entrada: entradas[0] });
  assert.ok(html.includes('<h1>Primera entrada</h1>'));
  assert.ok(html.includes('<time datetime="2026-11-15">15 de noviembre de 2026</time>'));
  assert.ok(html.includes('<p>Hola, <strong>mundo</strong>.</p>'));
  assert.ok(html.includes('<a href="/blog/">'));
});

test('el título de una entrada se escapa en la página, en la lista y en el canal', () => {
  const { sitio, entradas } = datos({ 'blog/2027-01-01-z.md': 'titulo: A & <B>\n---\nx' });
  for (const html of [
    entrada({ sitio, textos, entrada: entradas[0] }),
    blogIndice({ sitio, textos, entradas }),
    feed(sitio, entradas),
  ]) {
    assert.ok(html.includes('A &amp; &lt;B&gt;'));
    assert.ok(!html.includes('<B>'));
  }
});

test('el índice del blog lista todas, de nueva a vieja', () => {
  const { sitio, entradas } = datos(muchas(5));
  const html = blogIndice({ sitio, textos, entradas });
  assert.ok(html.includes('<h1>Blog</h1>'));
  assert.equal(html.match(/<li>/g).length, 6);
  assert.ok(html.includes('<a href="/blog/primera-entrada/">Primera entrada</a>'));
  assert.ok(html.indexOf('Primera entrada') < html.indexOf('Entrada 5'));
  assert.ok(html.indexOf('Entrada 5') < html.indexOf('Entrada 1<'));
});

test('la portada muestra las 3 últimas entradas', () => {
  const { sitio, entradas } = datos(muchas(4));
  const html = portada({ sitio, textos, trabajos: [], entradas });
  assert.ok(html.includes('Del blog'));
  assert.equal(html.match(/<time /g).length, 3);
  assert.ok(html.includes('Primera entrada'));
  assert.ok(!html.includes('Entrada 2<'));
});

test('sin entradas no hay bloque ni menú de blog', () => {
  const { sitio } = datos();
  assert.ok(!portada({ sitio, textos, trabajos: [], entradas: [] }).includes('Del blog'));
  const rutas = (entradas) => menuDe({ sitio, textos, trabajos: [], entradas }).map((m) => m.ruta);
  assert.deepEqual(rutas([]), ['']);
  assert.deepEqual(rutas(datos().entradas), ['', 'blog/']);
});

test('la presentación de la portada admite negritas y enlaces', () => {
  const { sitio } = datos();
  const html = portada({
    sitio: { ...sitio, presentacion: 'Hago **ruido** y [juegos](https://ejemplo.itch.io).' },
    textos,
    trabajos: [],
    entradas: [],
  });
  assert.ok(html.includes('<strong>ruido</strong>'));
  assert.ok(html.includes('<a href="https://ejemplo.itch.io" rel="noopener">juegos</a>'));
});

test('la página de no encontrado enlaza al inicio respetando la raíz', () => {
  const { sitio } = datos();
  const html = noEncontrado({ sitio: { ...sitio, raiz: '/baldioslab/' }, textos });
  assert.ok(html.includes('<a href="/baldioslab/">'));
});

test('la página anuncia el canal RSS solo si existe', () => {
  const { sitio } = datos();
  const con = pagina({ sitio: { ...sitio, conFeed: true }, textos, titulo: '', ruta: '', menu: [], cuerpo: '' });
  assert.ok(
    con.includes('<link rel="alternate" type="application/rss+xml" title="baldíos lab" href="/blog/feed.xml">')
  );
  const sin = pagina({ sitio, textos, titulo: '', ruta: '', menu: [], cuerpo: '' });
  assert.ok(!sin.includes('rss'));
});

// ---- canal RSS ----

test('el canal RSS', () => {
  const { sitio, entradas } = datos();
  const xml = feed(sitio, entradas);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<rss version="2.0">'));
  assert.ok(xml.includes('<title>baldíos lab</title>'));
  assert.ok(xml.includes('<link>https://baldioslab.github.io/blog/primera-entrada/</link>'));
  assert.ok(xml.includes('<guid>https://baldioslab.github.io/blog/primera-entrada/</guid>'));
  assert.ok(xml.includes('<pubDate>Sun, 15 Nov 2026 12:00:00 GMT</pubDate>'));
  assert.ok(xml.includes('&lt;p&gt;Hola, &lt;strong&gt;mundo&lt;/strong&gt;.&lt;/p&gt;'));
});

test('el canal trae como máximo 20 entradas y las imágenes con dirección completa', () => {
  const dir = base({ ...muchas(24), 'blog/2027-01-01-foto.md': 'titulo: Foto\n---\n![a](foto.png)', 'imagenes/foto.png': 'x' });
  const { sitio, entradas } = cargarContenido(dir);
  assert.equal(entradas.length, 26);
  const xml = feed(sitio, entradas);
  assert.equal(xml.match(/<item>/g).length, 20);
  assert.ok(xml.includes('src=&quot;https://baldioslab.github.io/imagenes/foto.png&quot;'));
});

// ---- armado ----

test('construir genera el blog, el canal y la página de no encontrado', () => {
  const salida = path.join(carpeta(), 'salida');
  const dir = base({ 'blog/2026-01-01-foto.md': 'titulo: Foto\n---\n![a](foto.png)', 'imagenes/foto.png': 'x' });
  const { paginas, avisos } = construir(dir, salida);
  assert.deepEqual(avisos, []);
  for (const p of ['index.html', 'blog/index.html', 'blog/primera-entrada/index.html', 'blog/feed.xml', '404.html']) {
    assert.ok(paginas.includes(p), p);
    assert.ok(fs.statSync(path.join(salida, p)).size < 50000, p);
  }
  assert.ok(fs.existsSync(path.join(salida, 'imagenes', 'foto.png')));
  const html = fs.readFileSync(path.join(salida, 'blog', 'primera-entrada', 'index.html'), 'utf8');
  assert.ok(html.includes('<title>Primera entrada · baldíos lab</title>'));
  assert.ok(html.includes('application/rss+xml'));
  assert.ok(html.includes('<a href="/blog/" aria-current="page">'));
});

test('sin entradas no hay blog ni canal, pero sí página de no encontrado', () => {
  const salida = path.join(carpeta(), 'salida');
  const { paginas } = construir(carpeta({ 'sitio.txt': SITIO }), salida);
  assert.deepEqual(paginas.sort(), ['404.html', 'index.html']);
  assert.ok(!fs.readFileSync(path.join(salida, 'index.html'), 'utf8').includes('rss'));
});

test('sin dirección completa no hay canal y se avisa', () => {
  const salida = path.join(carpeta(), 'salida');
  const dir = carpeta({ 'sitio.txt': sitioCon({ direccion: null }), 'blog/2026-11-15-a.md': PRIMERA });
  const { paginas, avisos } = construir(dir, salida);
  assert.ok(!paginas.includes('blog/feed.xml'));
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /direccion/);
});

test('una entrada enorme produce un aviso que la nombra', () => {
  const salida = path.join(carpeta(), 'salida');
  const dir = base({ 'blog/2026-01-01-larga.md': 'titulo: Larga\n---\n' + 'palabra '.repeat(8000) });
  const { avisos } = construir(dir, salida);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /blog\/larga\/index\.html/);
});
