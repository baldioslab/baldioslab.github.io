// Orquesta el armado: lee contenido/, aplica las plantillas y escribe salida/.

const fs = require('node:fs');
const path = require('node:path');
const { cargarContenido } = require('./contenido.js');
const { pagina, portada, menuDe, seccion, SECCIONES } = require('./plantillas.js');
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

  const { sitio, trabajos, entradas, avisos } = cargarContenido(dirContenido, opciones);
  const menu = menuDe({ sitio, textos, trabajos, entradas });
  const paginas = [];

  fs.rmSync(dirSalida, { recursive: true, force: true });
  fs.mkdirSync(dirSalida, { recursive: true });

  function escribir(ruta, texto) {
    const destino = path.join(dirSalida, ruta);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, texto);
    paginas.push(ruta);
    if (ruta.endsWith('.html') && Buffer.byteLength(texto) > LIMITE_PAGINA) {
      avisos.push(`${ruta}: pesa más de 50 KB (${Buffer.byteLength(texto)} bytes)`);
    }
  }

  escribir(
    'index.html',
    pagina({
      sitio,
      textos,
      titulo: '',
      ruta: '',
      menu,
      cuerpo: portada({ sitio, textos, trabajos, entradas }),
    })
  );

  for (const s of SECCIONES) {
    if (!trabajos.some((t) => t.tipo === s.tipo)) continue;
    escribir(
      `${s.ruta}index.html`,
      pagina({
        sitio,
        textos,
        titulo: textos.titulos[s.clave],
        ruta: s.ruta,
        menu,
        cuerpo: seccion({ sitio, textos, tipo: s.tipo, trabajos }),
      })
    );
  }

  // Solo se copian los archivos que alguna ficha usa.
  for (const t of trabajos) {
    for (const [carpeta, nombre] of [['imagenes', t.imagen], ['audio', t.audio]]) {
      if (!nombre) continue;
      fs.mkdirSync(path.join(dirSalida, carpeta), { recursive: true });
      fs.copyFileSync(path.join(dirContenido, carpeta, nombre), path.join(dirSalida, carpeta, nombre));
    }
  }

  fs.cpSync(DIR_ESTILOS, path.join(dirSalida, 'estilos'), { recursive: true });
  if (sitio.foto) {
    fs.copyFileSync(path.join(dirContenido, sitio.foto), path.join(dirSalida, sitio.foto));
  }

  return { paginas, avisos };
}

module.exports = { construir, LIMITE_PAGINA };
