const test = require('node:test');
const assert = require('node:assert/strict');
const { aHtml } = require('../src/markdown.js');

test('párrafos, negrita y cursiva', () => {
  assert.equal(aHtml('Hola **mundo** y *más*.'), '<p>Hola <strong>mundo</strong> y <em>más</em>.</p>');
  assert.equal(aHtml('uno\n\ndos'), '<p>uno</p>\n<p>dos</p>');
  assert.equal(aHtml('uno\ndos'), '<p>uno\ndos</p>');
  assert.equal(aHtml(''), '');
  assert.equal(aHtml('\n\n  \n'), '');
  assert.equal(aHtml('a\r\n\r\nb'), '<p>a</p>\n<p>b</p>');
  assert.equal(aHtml('2 * 3 * 4 = 24'), '<p>2 * 3 * 4 = 24</p>');
});

test('subtítulos: bajan un nivel porque el h1 es el título de la entrada', () => {
  assert.equal(aHtml('# Título'), '<h2>Título</h2>');
  assert.equal(aHtml('## Título'), '<h3>Título</h3>');
  assert.equal(aHtml('### Título'), '<h4>Título</h4>');
  assert.equal(aHtml('#sin espacio'), '<p>#sin espacio</p>');
  assert.equal(aHtml('texto\n## Título\nmás'), '<p>texto</p>\n<h3>Título</h3>\n<p>más</p>');
});

test('listas', () => {
  assert.equal(aHtml('- a\n- b'), '<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
  assert.equal(aHtml('* a\n* **b**'), '<ul>\n<li>a</li>\n<li><strong>b</strong></li>\n</ul>');
  assert.equal(aHtml('1. a\n2. b'), '<ol>\n<li>a</li>\n<li>b</li>\n</ol>');
  assert.equal(aHtml('antes\n- a\n\ndespués'), '<p>antes</p>\n<ul>\n<li>a</li>\n</ul>\n<p>después</p>');
});

test('citas, líneas y bloques de código', () => {
  assert.equal(aHtml('> cita'), '<blockquote><p>cita</p></blockquote>');
  assert.equal(aHtml('> uno\n> dos'), '<blockquote><p>uno\ndos</p></blockquote>');
  assert.equal(aHtml('a\n\n---\n\nb'), '<p>a</p>\n<hr>\n<p>b</p>');
  assert.equal(aHtml('```\n<b> **no**\n```'), '<pre><code>&lt;b&gt; **no**</code></pre>');
  assert.equal(aHtml('```js\nlet a = 1;\n\nlet b = 2;\n```'), '<pre><code>let a = 1;\n\nlet b = 2;</code></pre>');
  assert.equal(aHtml('```\nsin cerrar'), '<pre><code>sin cerrar</code></pre>');
  assert.equal(aHtml('`a < b` y `**no**`'), '<p><code>a &lt; b</code> y <code>**no**</code></p>');
});

test('enlaces: solo http y https', () => {
  assert.equal(
    aHtml('[x](https://a.b/c?d=1&e=2)'),
    '<p><a href="https://a.b/c?d=1&amp;e=2" rel="noopener">x</a></p>'
  );
  assert.equal(aHtml('[**x**](http://a.b)'), '<p><a href="http://a.b" rel="noopener"><strong>x</strong></a></p>');
  assert.equal(aHtml('[x](javascript:alert(1))').includes('<a'), false);
  assert.equal(aHtml('[x](ejemplo.com)'), '<p>x</p>');
  assert.equal(aHtml('[x](https://a.b/"onclick="y)').includes('"onclick'), false);
});

test('nunca deja pasar HTML escrito en el archivo', () => {
  assert.equal(aHtml('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(aHtml('# <b>x</b>'), '<h2>&lt;b&gt;x&lt;/b&gt;</h2>');
  assert.equal(aHtml('- <i>x</i>'), '<ul>\n<li>&lt;i&gt;x&lt;/i&gt;</li>\n</ul>');
  assert.equal(aHtml('[<b>](https://a.b)'), '<p><a href="https://a.b" rel="noopener">&lt;b&gt;</a></p>');
  assert.equal(aHtml('Tom & "Jerry"'), '<p>Tom &amp; &quot;Jerry&quot;</p>');
  assert.equal(aHtml('a\u0000b\u00001\u0000'), '<p>ab1</p>');
});

test('imágenes: solo archivos propios de la carpeta imagenes', () => {
  assert.equal(
    aHtml('![foto](x.jpg)', { raizImagenes: '/imagenes/' }),
    '<p><img src="/imagenes/x.jpg" alt="foto" loading="lazy"></p>'
  );
  assert.equal(
    aHtml('![a "b"](mi-foto ñ.png)', { raizImagenes: '/r/imagenes/' }),
    '<p><img src="/r/imagenes/mi-foto%20%C3%B1.png" alt="a &quot;b&quot;" loading="lazy"></p>'
  );
  assert.equal(aHtml('![x](https://otro.sitio/a.jpg)').includes('<img'), false);
  assert.equal(aHtml('![x](../secreto.jpg)').includes('<img'), false);
  assert.equal(aHtml('![x](programa.exe)').includes('<img'), false);
  assert.equal(aHtml('![x](../secreto.jpg)'), '<p>![x](../secreto.jpg)</p>');
});

test('avisa qué imágenes usó el texto', () => {
  const imagenes = [];
  aHtml('![a](uno.jpg)\n\n- ![b](dos.png)\n\n![c](https://x.y/z.jpg)', { imagenes });
  assert.deepEqual(imagenes, ['uno.jpg', 'dos.png']);
});
