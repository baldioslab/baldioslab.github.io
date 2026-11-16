// Orquesta el armado: lee contenido/, aplica las plantillas y escribe salida/.

const fs = require('node:fs');
const path = require('node:path');
const { cargarContenido } = require('./contenido.js');
const {
  pagina, portada, menuDe, seccion, blogIndice, entrada, noEncontrado,
  SECCIONES, RUTA_BLOG, RUTA_FEED,
} = require('./plantillas.js');
const { feed } = require('./feed.js');
const textos = require('./textos.es.json');

const DIR_ESTILOS = path.join(__dirname, '..', 'estilos');
const LIMITE_PAGINA = 50000; // bytes por página, sin fotos ni audio

// Arma el sitio. Devuelve la lista de archivos escritos y los avisos.
// opciones.direccion reemplaza la de sitio.txt (la usa el visor local).
function construir(dirContenido, dirSalida, opciones = {}) {
  // Esta carpeta se borra entera en cada armado: solo se acepta "salida".
  if (path.basename(path.resolve(dirSalida)) !== 'salida') {
    throw new Error(`La carpeta de salida debe llamarse «salida» (dice: «${dirSalida}»)`);
  }

  // Primero se lee y valida todo: si hay un error, la salida anterior no se toca.
  const { sitio, trabajos, entradas, avisos, imagenes } = cargarContenido(dirContenido, opciones);
  const menu = menuDe({ sitio, textos, trabajos, entradas });
  const paginas = [];

  // El canal RSS necesita la dirección pública completa para sus enlaces.
  const direccionCompleta = sitio.direccion !== '/';
  sitio.conFeed = entradas.length > 0 && direccionCompleta;
  if (entradas.length > 0 && !direccionCompleta) {
    avisos.push('sitio.txt: falta «direccion», así que no se generó el canal RSS del blog');
  }

  fs.rmSync(dirSalida, { recursive: true, force: true });
  fs.mkdirSync(dirSalida, { recursive: true });

  function escribir(ruta, texto) {
    const destino = path.join(dirSalida, ruta);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, texto);
    paginas.push(ruta);
    const peso = Buffer.byteLength(texto);
    if (ruta.endsWith('.html') && peso > LIMITE_PAGINA) {
      avisos.push(`${ruta}: la página pesa ${Math.round(peso / 1000)} KB; el límite acordado es 50 KB`);
    }
  }

  function escribirPagina(ruta, titulo, cuerpo, archivo = `${ruta}index.html`) {
    escribir(archivo, pagina({ sitio, textos, titulo, ruta, menu, cuerpo }));
  }

  escribirPagina('', '', portada({ sitio, textos, trabajos, entradas }));

  for (const s of SECCIONES) {
    if (!trabajos.some((t) => t.tipo === s.tipo)) continue;
    escribirPagina(s.ruta, textos.titulos[s.clave], seccion({ sitio, textos, tipo: s.tipo, trabajos }));
  }

  if (entradas.length) {
    escribirPagina(RUTA_BLOG, textos.titulos.blog, blogIndice({ sitio, textos, entradas }));
    for (const e of entradas) {
      escribirPagina(`${RUTA_BLOG}${e.slug}/`, e.titulo, entrada({ sitio, textos, entrada: e }));
    }
    if (sitio.conFeed) escribir(RUTA_FEED, feed(sitio, entradas));
  }

  // GitHub Pages muestra 404.html cuando alguien pide una dirección que no existe.
  escribirPagina('404', textos.titulos.noEncontrado, noEncontrado({ sitio, textos }), '404.html');

  // Solo se copian los archivos que el contenido usa.
  function copiar(carpeta, nombre) {
    fs.mkdirSync(path.join(dirSalida, carpeta), { recursive: true });
    fs.copyFileSync(path.join(dirContenido, carpeta, nombre), path.join(dirSalida, carpeta, nombre));
  }
  for (const nombre of imagenes) copiar('imagenes', nombre);
  for (const t of trabajos) if (t.audio) copiar('audio', t.audio);

  fs.cpSync(DIR_ESTILOS, path.join(dirSalida, 'estilos'), { recursive: true });
  if (sitio.foto) {
    fs.copyFileSync(path.join(dirContenido, sitio.foto), path.join(dirSalida, sitio.foto));
  }

  return { paginas, avisos };
}

module.exports = { construir, LIMITE_PAGINA };
