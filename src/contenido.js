// Lee y valida la carpeta contenido/. Los errores se lanzan en español,
// nombrando el archivo y el dato, para que se entiendan sin saber programar.

const fs = require('node:fs');
const path = require('node:path');
const { leerFicha, uno } = require('./formato.js');
const { enlaceSeguro } = require('./html.js');

const TEMAS = ['claro', 'oscuro', 'papel', 'bosque', 'atardecer', 'neon'];
const TEMA_POR_DEFECTO = 'bosque';

// Tipos de trabajo y la ruta de la sección de cada uno.
const TIPOS = { musica: 'musica/', juego: 'juegos/', proyecto: 'proyectos/' };
const ALIAS_TIPO = {
  musica: 'musica',
  juego: 'juego',
  juegos: 'juego',
  proyecto: 'proyecto',
  proyectos: 'proyecto',
};
const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const EXT_AUDIO = ['.mp3', '.ogg', '.m4a', '.wav'];
const LIMITE_IMAGEN = 200000; // bytes; por encima se avisa

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

// Lista ordenada de los archivos de una subcarpeta con cierta extensión.
function listar(dir, subcarpeta, extension) {
  const carpeta = path.join(dir, subcarpeta);
  if (!fs.existsSync(carpeta)) return [];
  return fs
    .readdirSync(carpeta, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(extension))
    .map((e) => e.name)
    .sort();
}

function sinTildes(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Comprueba un archivo adjunto (imagen o audio) nombrado en una ficha.
function adjunto(dir, archivo, clave, valor, subcarpeta, extensiones) {
  if (valor === undefined || valor === '') return undefined;
  if (!esNombreDeArchivo(valor)) {
    throw new Error(`${archivo}: «${clave}» debe ser solo el nombre de un archivo (dice: «${valor}»)`);
  }
  if (!extensiones.includes(path.extname(valor).toLowerCase())) {
    throw new Error(
      `${archivo}: «${clave}» debe terminar en ${extensiones.join(', ')} (dice: «${valor}»)`
    );
  }
  if (!fs.existsSync(path.join(dir, subcarpeta, valor))) {
    throw new Error(`${archivo}: no encuentro «${valor}» en la carpeta ${subcarpeta}/`);
  }
  return valor;
}

function cargarTrabajos(dir, avisos) {
  const trabajos = listar(dir, 'trabajos', '.txt').map((nombre) => {
    const archivo = `trabajos/${nombre}`;
    const { campos } = leerArchivo(dir, archivo);

    const titulo = uno(campos, 'titulo');
    if (!titulo) throw new Error(`${archivo}: falta «titulo»`);

    const tipoEscrito = uno(campos, 'tipo');
    if (!tipoEscrito) {
      throw new Error(`${archivo}: falta «tipo» (${Object.keys(TIPOS).join(', ')})`);
    }
    const tipo = ALIAS_TIPO[sinTildes(tipoEscrito.toLowerCase())];
    if (!tipo) {
      throw new Error(
        `${archivo}: el «tipo» debe ser uno de: ${Object.keys(TIPOS).join(', ')} (dice: «${tipoEscrito}»)`
      );
    }

    const añoEscrito = uno(campos, 'año');
    if (!añoEscrito) throw new Error(`${archivo}: falta «año»`);
    if (!/^\d{4}$/.test(añoEscrito)) {
      throw new Error(`${archivo}: el «año» va con cuatro cifras, como 2025 (dice: «${añoEscrito}»)`);
    }

    const enlace = uno(campos, 'enlace');
    if (!enlace) throw new Error(`${archivo}: falta «enlace»`);
    if (!enlaceSeguro(enlace)) {
      throw new Error(
        `${archivo}: el «enlace» debe empezar con https:// o http:// (dice: «${enlace}»)`
      );
    }

    const imagen = adjunto(dir, archivo, 'imagen', uno(campos, 'imagen'), 'imagenes', EXT_IMAGEN);
    if (imagen) {
      const peso = fs.statSync(path.join(dir, 'imagenes', imagen)).size;
      if (peso > LIMITE_IMAGEN) {
        avisos.push(
          `imagenes/${imagen}: pesa ${Math.round(peso / 1000)} KB; conviene reducirla a menos de 200 KB (la usa ${archivo})`
        );
      }
    }

    if (uno(campos, 'audio') && tipo !== 'musica') {
      throw new Error(`${archivo}: «audio» solo se puede usar en fichas de tipo musica`);
    }
    const audio = adjunto(dir, archivo, 'audio', uno(campos, 'audio'), 'audio', EXT_AUDIO);

    return { titulo, tipo, año: Number(añoEscrito), enlace, imagen, audio, archivo };
  });

  trabajos.sort((a, b) => b.año - a.año || a.titulo.localeCompare(b.titulo, 'es'));
  return trabajos;
}

function cargarContenido(dir, opciones = {}) {
  const avisos = [];
  const sitio = cargarSitio(dir, opciones);
  const trabajos = cargarTrabajos(dir, avisos);
  return { sitio, trabajos, entradas: [], avisos };
}

module.exports = { cargarContenido, esNombreDeArchivo, TEMAS, TIPOS };
