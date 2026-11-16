// Lee y valida la carpeta contenido/. Los errores se lanzan en español,
// nombrando el archivo y el dato, para que se entiendan sin saber programar.

const fs = require('node:fs');
const path = require('node:path');
const { leerFicha, uno } = require('./formato.js');
const { enlaceSeguro } = require('./html.js');

const TEMAS = ['claro', 'oscuro', 'papel', 'bosque', 'atardecer', 'neon'];
const TEMA_POR_DEFECTO = 'bosque';

// Un nombre de archivo simple: sin carpetas, sin "..", sin caracteres raros.
function esNombreDeArchivo(nombre) {
  return /^[^\\/:*?"<>|]+$/.test(nombre) && !nombre.startsWith('.') && nombre === nombre.trim();
}

function leerArchivo(dir, nombre) {
  const texto = fs.readFileSync(path.join(dir, nombre), 'utf8');
  try {
    return leerFicha(texto);
  } catch (error) {
    throw new Error(`${nombre}: ${error.message}`);
  }
}

// Deja la dirección terminada en "/" y calcula la raíz de los enlaces internos.
function resolverDireccion(direccion) {
  if (direccion === undefined || direccion === '' || direccion === '/') {
    return { direccion: '/', raiz: '/' };
  }
  if (!enlaceSeguro(direccion)) {
    throw new Error(
      `sitio.txt: «direccion» debe ser una dirección completa, por ejemplo https://baldioslab.github.io/ (dice: «${direccion}»)`
    );
  }
  const url = new URL(direccion);
  let raiz = url.pathname;
  if (!raiz.endsWith('/')) raiz += '/';
  return { direccion: url.origin + raiz, raiz };
}

function cargarSitio(dir, opciones) {
  if (!fs.existsSync(path.join(dir, 'sitio.txt'))) {
    throw new Error('sitio.txt: no existe. Es el archivo con el nombre, el tema y las redes.');
  }
  const { campos, cuerpo } = leerArchivo(dir, 'sitio.txt');

  const nombre = uno(campos, 'nombre');
  if (!nombre) throw new Error('sitio.txt: falta «nombre»');

  const tema = (uno(campos, 'tema') || TEMA_POR_DEFECTO).toLowerCase();
  if (!TEMAS.includes(tema)) {
    throw new Error(`sitio.txt: el «tema» debe ser uno de: ${TEMAS.join(', ')} (dice: «${tema}»)`);
  }

  const redes = (campos.red || []).map((linea) => {
    const corte = linea.indexOf('|');
    const nombreRed = corte < 0 ? '' : linea.slice(0, corte).trim();
    const url = corte < 0 ? '' : linea.slice(corte + 1).trim();
    if (!nombreRed || !enlaceSeguro(url)) {
      throw new Error(
        `sitio.txt: cada «red» va como «nombre | https://…» (dice: «${linea}»)`
      );
    }
    return { nombre: nombreRed, url };
  });

  const foto = uno(campos, 'foto') || undefined;
  if (foto !== undefined) {
    if (!esNombreDeArchivo(foto)) {
      throw new Error(`sitio.txt: «foto» debe ser solo el nombre de un archivo (dice: «${foto}»)`);
    }
    if (!fs.existsSync(path.join(dir, foto))) {
      throw new Error(`sitio.txt: no encuentro la foto «${foto}» en la carpeta de contenido`);
    }
  }

  const direccionDada =
    opciones.direccion !== undefined ? opciones.direccion : uno(campos, 'direccion');

  return {
    nombre,
    lema: uno(campos, 'lema') || '',
    tema,
    ...resolverDireccion(direccionDada),
    foto,
    redes,
    presentacion: cuerpo,
  };
}

function cargarContenido(dir, opciones = {}) {
  const avisos = [];
  const sitio = cargarSitio(dir, opciones);
  return { sitio, trabajos: [], entradas: [], avisos };
}

module.exports = { cargarContenido, esNombreDeArchivo, TEMAS };
