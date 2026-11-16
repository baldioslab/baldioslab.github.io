// Lee y valida la carpeta contenido/. Los errores se lanzan en español,
// nombrando el archivo y el dato, para que se entiendan sin saber programar.

const fs = require('node:fs');
const path = require('node:path');
const { leerFicha, uno } = require('./formato.js');
const { enlaceSeguro, slug } = require('./html.js');
const { aHtml } = require('./markdown.js');

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

// Comprueba que un archivo exista con ese nombre exacto. En Windows
// «Foto.JPG» y «foto.jpg» son el mismo archivo, pero en GitHub (donde se
// arma la página publicada) no: por eso se exige que coincidan.
function exigirArchivo(carpeta, nombre, origen, lugar) {
  const nombres = fs.existsSync(carpeta) ? fs.readdirSync(carpeta) : [];
  if (nombres.includes(nombre)) return;
  const parecido = nombres.find((n) => n.toLowerCase() === nombre.toLowerCase());
  if (parecido) {
    throw new Error(
      `${origen}: dice «${nombre}» pero el archivo se llama «${parecido}». Las mayúsculas y minúsculas tienen que coincidir`
    );
  }
  throw new Error(`${origen}: no encuentro «${nombre}» en ${lugar}`);
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
    exigirArchivo(dir, foto, 'sitio.txt', 'la carpeta de contenido');
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
  exigirArchivo(path.join(dir, subcarpeta), valor, archivo, `la carpeta ${subcarpeta}/`);
  return valor;
}

// Una imagen pesada no detiene el armado: solo deja un aviso (uno por imagen).
function avisarSiPesa(dir, imagen, archivo, avisos) {
  const peso = fs.statSync(path.join(dir, 'imagenes', imagen)).size;
  const inicio = `imagenes/${imagen}: `;
  if (peso > LIMITE_IMAGEN && !avisos.some((a) => a.startsWith(inicio))) {
    avisos.push(
      `${inicio}pesa ${Math.round(peso / 1000)} KB; conviene reducirla a menos de 200 KB (la usa ${archivo})`
    );
  }
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
    if (imagen) avisarSiPesa(dir, imagen, archivo, avisos);

    if (uno(campos, 'audio') && tipo !== 'musica') {
      throw new Error(`${archivo}: «audio» solo se puede usar en fichas de tipo musica`);
    }
    const audio = adjunto(dir, archivo, 'audio', uno(campos, 'audio'), 'audio', EXT_AUDIO);

    return { titulo, tipo, año: Number(añoEscrito), enlace, imagen, audio, archivo };
  });

  trabajos.sort((a, b) => b.año - a.año || a.titulo.localeCompare(b.titulo, 'es'));
  return trabajos;
}

// Convierte un texto en Markdown y comprueba que sus imágenes existan.
// Las imágenes usadas se anotan en "imagenes" para copiarlas a la salida.
function convertir(dir, archivo, texto, raizImagenes, imagenes, avisos) {
  const usadas = [];
  const html = aHtml(texto, { raizImagenes, imagenes: usadas });
  for (const nombre of usadas) {
    exigirArchivo(path.join(dir, 'imagenes'), nombre, archivo, 'la carpeta imagenes/');
    avisarSiPesa(dir, nombre, archivo, avisos);
    if (!imagenes.includes(nombre)) imagenes.push(nombre);
  }
  return html;
}

// Una fecha AAAA-MM-DD que exista de verdad (no 30 de febrero).
function esFecha(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function cargarEntradas(dir, sitio, imagenes, avisos) {
  const porSlug = new Map();
  const entradas = [];
  for (const nombre of listar(dir, 'blog', '.md')) {
    const archivo = `blog/${nombre}`;
    const { campos, cuerpo } = leerArchivo(dir, archivo);

    const titulo = uno(campos, 'titulo');
    if (!titulo) throw new Error(`${archivo}: falta «titulo»`);

    const sinExtension = nombre.slice(0, -'.md'.length);
    const prefijo = sinExtension.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    const fecha = uno(campos, 'fecha') || (prefijo ? prefijo[1] : undefined);
    if (!fecha) {
      throw new Error(
        `${archivo}: falta la «fecha». Va como «fecha: 2026-11-15», o al inicio del nombre del archivo (2026-11-15-titulo.md)`
      );
    }
    if (!esFecha(fecha)) {
      throw new Error(
        `${archivo}: la «fecha» debe ser un día real escrito como año-mes-día, por ejemplo 2026-11-15 (dice: «${fecha}»)`
      );
    }

    const direccion = slug(prefijo ? prefijo[2] : sinExtension);
    if (!direccion) {
      throw new Error(`${archivo}: el nombre del archivo necesita al menos una letra o un número`);
    }
    if (porSlug.has(direccion)) {
      throw new Error(
        `${archivo}: tendría la misma dirección (blog/${direccion}/) que ${porSlug.get(direccion)}. Cambia el nombre de uno de los dos archivos`
      );
    }
    porSlug.set(direccion, archivo);

    const borrador = sinTildes((uno(campos, 'borrador') || '').toLowerCase());
    if (['si', 'yes', 'true', '1'].includes(borrador)) continue;

    const html = convertir(dir, archivo, cuerpo, `${sitio.raiz}imagenes/`, imagenes, avisos);
    entradas.push({ titulo, fecha, slug: direccion, html, cuerpo, archivo });
  }
  entradas.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.titulo.localeCompare(b.titulo, 'es'));
  return entradas;
}

function cargarContenido(dir, opciones = {}) {
  const avisos = [];
  const imagenes = [];
  const sitio = cargarSitio(dir, opciones);
  const trabajos = cargarTrabajos(dir, avisos);
  for (const t of trabajos) {
    if (t.imagen && !imagenes.includes(t.imagen)) imagenes.push(t.imagen);
  }
  convertir(dir, 'sitio.txt', sitio.presentacion, `${sitio.raiz}imagenes/`, imagenes, avisos);
  const entradas = cargarEntradas(dir, sitio, imagenes, avisos);
  return { sitio, trabajos, entradas, avisos, imagenes };
}

module.exports = { cargarContenido, esNombreDeArchivo, TEMAS, TIPOS };
