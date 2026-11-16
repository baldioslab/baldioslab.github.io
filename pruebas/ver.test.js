const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { resolver } = require('../ver.js');
const { carpeta } = require('./ayuda.js');

const salida = carpeta({
  'index.html': 'portada',
  'blog/index.html': 'blog',
  'estilos/base.css': 'css',
});
// Un archivo fuera de la carpeta servida, que nunca debe poder leerse.
carpeta({ 'secreto.txt': 'x' });

test('resuelve archivos y carpetas', () => {
  assert.equal(resolver(salida, '/'), path.join(salida, 'index.html'));
  assert.equal(resolver(salida, '/blog/'), path.join(salida, 'blog', 'index.html'));
  assert.equal(resolver(salida, '/blog'), path.join(salida, 'blog', 'index.html'));
  assert.equal(resolver(salida, '/estilos/base.css?x=1'), path.join(salida, 'estilos', 'base.css'));
});

test('lo que no existe devuelve null', () => {
  assert.equal(resolver(salida, '/nada.html'), null);
  assert.equal(resolver(salida, '/%zz'), null);
});

test('no deja salir de la carpeta', () => {
  assert.equal(resolver(salida, '/../construir.js'), null);
  assert.equal(resolver(salida, '/%2e%2e/construir.js'), null);
  assert.equal(resolver(salida, '/..%5c..%5cconstruir.js'), null);
  assert.equal(resolver(salida, '/blog/../../construir.js'), null);
  assert.equal(resolver(path.join(salida, 'blog'), '/../index.html'), null);
});
