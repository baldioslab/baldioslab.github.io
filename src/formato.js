// Lee el formato de los archivos de contenido:
//
//   clave: valor
//   otra: valor
//   ---
//   texto libre
//
// Las claves repetidas se acumulan. Las líneas vacías y las que empiezan
// con # en la cabecera se ignoran.

const ALIAS = { anio: 'año' };

function leerFicha(texto) {
  const lineas = String(texto).replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const campos = {};
  let i = 0;
  for (; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (linea === '---') {
      i++;
      break;
    }
    if (linea === '' || linea.startsWith('#')) continue;
    const corte = linea.indexOf(':');
    if (corte < 1) {
      throw new Error(`línea ${i + 1}: falta «clave: valor» (dice: «${linea}»)`);
    }
    let clave = linea.slice(0, corte).trim().toLowerCase();
    if (Object.hasOwn(ALIAS, clave)) clave = ALIAS[clave];
    const valor = linea.slice(corte + 1).trim();
    if (Object.hasOwn(campos, clave)) {
      campos[clave].push(valor);
    } else {
      // defineProperty evita sorpresas con claves como "__proto__".
      Object.defineProperty(campos, clave, {
        value: [valor],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  const cuerpo = lineas.slice(i).join('\n').trim();
  return { campos, cuerpo };
}

// Primer valor de una clave, o undefined si no está.
function uno(campos, clave) {
  return Object.hasOwn(campos, clave) ? campos[clave][0] : undefined;
}

module.exports = { leerFicha, uno };
