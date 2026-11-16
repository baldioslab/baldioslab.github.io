const test = require('node:test');
const assert = require('node:assert/strict');
const { escapar, enlaceSeguro, slug } = require('../src/html.js');

test('escapar cambia los caracteres que romperían la página', () => {
  assert.equal(
    escapar(`<a href="x">Tom & 'Jerry'</a>`),
    '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;'
  );
  assert.equal(escapar(''), '');
  assert.equal(escapar(undefined), '');
  assert.equal(escapar(2025), '2025');
});

test('enlaceSeguro solo acepta http y https', () => {
  assert.equal(enlaceSeguro('https://ejemplo.bandcamp.com/album/x'), true);
  assert.equal(enlaceSeguro('http://ejemplo.com'), true);
  assert.equal(enlaceSeguro('javascript:alert(1)'), false);
  assert.equal(enlaceSeguro('ejemplo.com'), false);
  assert.equal(enlaceSeguro(''), false);
  assert.equal(enlaceSeguro(undefined), false);
  assert.equal(enlaceSeguro('  https://ejemplo.com'), false);
});

test('slug deja solo letras, números y guiones', () => {
  assert.equal(slug('  Canción Ñandú — vol. 2!  '), 'cancion-nandu-vol-2');
  assert.equal(slug('primera-entrada'), 'primera-entrada');
  assert.equal(slug('¿¡!?'), '');
});
