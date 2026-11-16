const test = require('node:test');
const assert = require('node:assert/strict');
const { leerFicha, uno } = require('../src/formato.js');

test('lee un archivo del Bloc de notas: BOM, saltos de Windows, claves repetidas', () => {
  const f = leerFicha(
    '﻿Titulo: Un disco\r\nred: bandcamp | https://a.b\r\nred: itch | https://c.d\r\n# nota\r\n\r\naño: 2025\r\n---\r\nHola: mundo\r\n'
  );
  assert.deepEqual(f.campos.titulo, ['Un disco']);
  assert.deepEqual(f.campos.red, ['bandcamp | https://a.b', 'itch | https://c.d']);
  assert.deepEqual(f.campos['año'], ['2025']);
  assert.equal(f.cuerpo, 'Hola: mundo');
  assert.equal(uno(f.campos, 'titulo'), 'Un disco');
  assert.equal(uno(f.campos, 'nada'), undefined);
});

test('anio y año son la misma clave', () => {
  assert.deepEqual(leerFicha('anio: 2024').campos['año'], ['2024']);
  assert.deepEqual(leerFicha('AÑO: 2024').campos['año'], ['2024']);
});

test('sin separador no hay cuerpo', () => {
  assert.equal(leerFicha('titulo: x').cuerpo, '');
  assert.equal(leerFicha('').cuerpo, '');
  assert.deepEqual(leerFicha('').campos, {});
});

test('el valor conserva los dos puntos que vengan después', () => {
  assert.deepEqual(leerFicha('enlace: https://a.b/c').campos.enlace, ['https://a.b/c']);
});

test('el cuerpo conserva sus líneas y sus propios ---', () => {
  const f = leerFicha('titulo: x\n---\nuno\n\n---\n\ndos\n');
  assert.equal(f.cuerpo, 'uno\n\n---\n\ndos');
});

test('una línea de cabecera sin dos puntos dice en qué línea está', () => {
  assert.throws(() => leerFicha('titulo: x\nesto no tiene dos puntos'), /línea 2/);
});

test('una clave llamada como algo interno de JavaScript no rompe nada', () => {
  const f = leerFicha('constructor: a\n__proto__: b');
  assert.deepEqual(f.campos.constructor, ['a']);
  assert.equal(uno(f.campos, 'toString'), undefined);
});
