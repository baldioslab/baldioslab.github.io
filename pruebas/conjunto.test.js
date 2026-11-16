// Prueba de conjunto: arma el contenido real del repositorio y revisa que
// todas las páginas cumplan lo acordado en el diseño.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { construir } = require('../src/sitio.js');
const { resolver } = require('../ver.js');
const { CSP } = require('../src/plantillas.js');
const { TEMAS } = require('../src/contenido.js');
const { carpeta } = require('./ayuda.js');

const salida = path.join(carpeta(), 'salida');
const { paginas } = construir(path.join(__dirname, '..', 'contenido'), salida);
const htmls = paginas.filter((p) => p.endsWith('.html'));

function atributos(html, nombre) {
  return [...html.matchAll(new RegExp(`\\s${nombre}="([^"]*)"`, 'g'))].map((m) => m[1]);
}

test('el contenido real se arma y tiene portada y página de no encontrado', () => {
  assert.ok(htmls.includes('index.html'));
  assert.ok(htmls.includes('404.html'));
});

for (const p of htmls) {
  const html = fs.readFileSync(path.join(salida, p), 'utf8');

  test(`${p}: liviana, sin scripts y con política de seguridad`, () => {
    assert.ok(Buffer.byteLength(html) < 50000, 'pesa más de 50 KB');
    assert.ok(!/<script/i.test(html), 'tiene un script');
    assert.ok(!/\son[a-z]+=/i.test(html), 'tiene un manejador de eventos');
    assert.ok(!/<(iframe|embed|object|form)\b/i.test(html), 'tiene algo incrustado');
    assert.ok(!/\sstyle=/i.test(html), 'tiene estilos en línea, que la política bloquea');
    assert.ok(html.includes(`content="${CSP}"`), 'falta la política de seguridad');
    assert.ok(html.includes('<html lang="es">'));
  });

  test(`${p}: no carga nada de otros sitios`, () => {
    for (const src of atributos(html, 'src')) {
      assert.ok(src.startsWith('/') && !src.startsWith('//'), `recurso externo: ${src}`);
    }
    for (const etiqueta of html.match(/<link\b[^>]*>/g) || []) {
      const href = etiqueta.match(/href="([^"]*)"/)[1];
      assert.ok(href.startsWith('/') && !href.startsWith('//'), `recurso externo: ${href}`);
    }
  });

  test(`${p}: todos los enlaces internos y archivos existen`, () => {
    const internos = [...atributos(html, 'href'), ...atributos(html, 'src')].filter((u) => u.startsWith('/'));
    assert.ok(internos.length > 0);
    for (const u of internos) {
      assert.ok(resolver(salida, u.replace(/&amp;/g, '&')), `enlace roto: ${u}`);
    }
  });
}

test('la hoja de temas define los seis temas con todos sus colores', () => {
  const css = fs.readFileSync(path.join(salida, 'estilos', 'temas.css'), 'utf8');
  for (const tema of TEMAS) {
    const regla = css.match(new RegExp(`\\.tema-${tema}\\s*\\{([^}]*)\\}`));
    assert.ok(regla, `falta el tema ${tema}`);
    for (const variable of ['--bg', '--stripe', '--panel', '--fg', '--line', '--muted', '--accent']) {
      assert.ok(regla[1].includes(`${variable}:`), `${tema} no define ${variable}`);
    }
  }
});

test('los estilos no cargan nada de otros sitios', () => {
  for (const nombre of fs.readdirSync(path.join(salida, 'estilos'))) {
    const css = fs.readFileSync(path.join(salida, 'estilos', nombre), 'utf8');
    assert.ok(!/url\(|@import/i.test(css), nombre);
  }
});
