// Arma la página y la muestra en este computador, en http://127.0.0.1:8080/
// Solo se ve desde este equipo. Se detiene con Ctrl+C.
// Uso: node ver.js

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PUERTO = 8080;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
};

// Devuelve el archivo que corresponde a una dirección pedida, o null si no
// existe o si la dirección intenta salir de la carpeta servida.
function resolver(dirSalida, rutaUrl) {
  let ruta;
  try {
    ruta = decodeURIComponent(String(rutaUrl).split(/[?#]/)[0]);
  } catch {
    return null;
  }
  if (ruta.includes('\0') || ruta.includes('\\')) return null;
  const base = path.resolve(dirSalida);
  let archivo = path.resolve(base, '.' + path.posix.normalize('/' + ruta));
  if (archivo !== base && !archivo.startsWith(base + path.sep)) return null;
  // Tampoco se sirve nada si la dirección pedía subir de carpeta.
  if (ruta.split('/').includes('..')) return null;
  try {
    if (fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, 'index.html');
    return fs.statSync(archivo).isFile() ? archivo : null;
  } catch {
    return null;
  }
}

function servir(dirSalida) {
  return http.createServer((pedido, respuesta) => {
    if (pedido.method !== 'GET' && pedido.method !== 'HEAD') {
      respuesta.writeHead(405).end();
      return;
    }
    let archivo = resolver(dirSalida, pedido.url);
    let estado = 200;
    if (!archivo) {
      estado = 404;
      archivo = resolver(dirSalida, '/404.html');
    }
    if (!archivo) {
      respuesta.writeHead(404, { 'Content-Type': TIPOS['.txt'] }).end('No encontrado');
      return;
    }
    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
    respuesta.writeHead(estado, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
    if (pedido.method === 'HEAD') respuesta.end();
    else fs.createReadStream(archivo).pipe(respuesta);
  });
}

if (require.main === module) {
  const { construir } = require('./src/sitio.js');
  const dirSalida = path.join(__dirname, 'salida');
  try {
    const { avisos } = construir(path.join(__dirname, 'contenido'), dirSalida, {
      direccion: `http://127.0.0.1:${PUERTO}/`,
    });
    for (const a of avisos) console.log(`AVISO: ${a}`);
  } catch (error) {
    console.error(`No se pudo armar la página.\n${error.message}`);
    process.exit(1);
  }
  const servidor = servir(dirSalida);
  servidor.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${PUERTO} ya está en uso. ¿Hay otro visor abierto? Ciérralo con Ctrl+C.`);
    } else {
      console.error(`No se pudo abrir el visor: ${error.message}`);
    }
    process.exit(1);
  });
  servidor.listen(PUERTO, '127.0.0.1', () => {
    console.log(`Página lista en http://127.0.0.1:${PUERTO}/`);
    console.log('Solo se ve desde este computador. Para detener el visor: Ctrl+C.');
    console.log('Si cambias algo en contenido/, detén el visor y vuelve a correrlo.');
  });
}

module.exports = { resolver, servir, PUERTO };
