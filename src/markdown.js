// Conversor de Markdown básico a HTML, propio y pequeño.
//
// Admite: párrafos, subtítulos (#, ##, ###), listas (- y 1.), citas (>),
// bloques de código (```), línea (---), **negrita**, *cursiva*, `código`,
// [enlaces](https://…) e ![imágenes](archivo.jpg).
//
// Regla de seguridad: todo el texto se escapa. Nunca pasa HTML escrito en
// el archivo; los enlaces solo pueden ser http/https y las imágenes solo
// archivos de la carpeta imagenes/.

const path = require('node:path');
const { escapar, enlaceSeguro } = require('./html.js');

const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const ES_TITULO = /^(#{1,3})\s+(.+)$/;
const ES_LINEA = /^(-{3,}|\*{3,})$/;
const ES_VALLA = /^```/;
const ES_CITA = /^>/;
const ES_VIÑETA = /^[-*]\s+(.*)$/;
const ES_NUMERO = /^\d+[.)]\s+(.*)$/;

function esImagenPropia(nombre) {
  return (
    /^[^\\/:*?"<>|]+$/.test(nombre) &&
    !nombre.startsWith('.') &&
    nombre === nombre.trim() &&
    EXT_IMAGEN.includes(path.extname(nombre).toLowerCase())
  );
}

// Negrita y cursiva, sobre texto ya escapado. Los asteriscos sueltos
// ("2 * 3") no cuentan: tienen que ir pegados al texto que encierran.
function enfasis(texto) {
  return texto
    .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '<em>$1</em>');
}

// Formato dentro de una línea. Lo que ya se convirtió se guarda aparte en
// "huecos" (marcados con el carácter nulo, que se quitó del texto al
// empezar) para que nada lo vuelva a tocar.
function enLinea(texto, opciones) {
  const huecos = [];
  const guardar = (html) => `\0${huecos.push(html) - 1}\0`;

  let t = texto.replace(/`([^`]+)`/g, (_, codigo) => guardar(`<code>${escapar(codigo)}</code>`));

  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (todo, alt, archivo) => {
    if (!esImagenPropia(archivo)) return guardar(escapar(todo));
    if (opciones.imagenes) opciones.imagenes.push(archivo);
    const src = escapar((opciones.raizImagenes || '') + encodeURIComponent(archivo));
    return guardar(`<img src="${src}" alt="${escapar(alt)}" loading="lazy">`);
  });

  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (todo, etiqueta, url) => {
    if (!enlaceSeguro(url)) return etiqueta;
    return guardar(`<a href="${escapar(url)}" rel="noopener">${enfasis(escapar(etiqueta))}</a>`);
  });

  t = enfasis(escapar(t));
  while (/\0\d+\0/.test(t)) t = t.replace(/\0(\d+)\0/g, (_, n) => huecos[n]);
  return t;
}

function empiezaBloque(linea) {
  const l = linea.trim();
  return (
    ES_TITULO.test(l) || ES_LINEA.test(l) || ES_VALLA.test(l) || ES_CITA.test(l) ||
    ES_VIÑETA.test(l) || ES_NUMERO.test(l)
  );
}

function aHtml(md, opciones = {}) {
  const lineas = String(md).replace(/\0/g, '').replace(/\r\n?/g, '\n').split('\n');
  const bloques = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i].trim();

    if (linea === '') {
      i++;
      continue;
    }

    if (ES_VALLA.test(linea)) {
      const codigo = [];
      i++;
      while (i < lineas.length && lineas[i].trim() !== '```') codigo.push(lineas[i++]);
      i++; // la valla de cierre, si la hay
      bloques.push(`<pre><code>${escapar(codigo.join('\n'))}</code></pre>`);
      continue;
    }

    const titulo = linea.match(ES_TITULO);
    if (titulo) {
      const nivel = titulo[1].length + 1; // el h1 es el título de la entrada
      bloques.push(`<h${nivel}>${enLinea(titulo[2], opciones)}</h${nivel}>`);
      i++;
      continue;
    }

    if (ES_LINEA.test(linea)) {
      bloques.push('<hr>');
      i++;
      continue;
    }

    if (ES_CITA.test(linea)) {
      const cita = [];
      while (i < lineas.length && ES_CITA.test(lineas[i].trim())) {
        cita.push(lineas[i++].trim().replace(/^>\s?/, ''));
      }
      bloques.push(`<blockquote>${aHtml(cita.join('\n'), opciones)}</blockquote>`);
      continue;
    }

    const patron = ES_VIÑETA.test(linea) ? ES_VIÑETA : ES_NUMERO.test(linea) ? ES_NUMERO : null;
    if (patron) {
      const etiqueta = patron === ES_VIÑETA ? 'ul' : 'ol';
      const items = [];
      while (i < lineas.length) {
        const item = lineas[i].trim().match(patron);
        if (item) {
          items.push(item[1]);
        } else if (items.length && /^\s+\S/.test(lineas[i]) && !empiezaBloque(lineas[i])) {
          items[items.length - 1] += '\n' + lineas[i].trim(); // línea que continúa el punto
        } else {
          break;
        }
        i++;
      }
      bloques.push(
        `<${etiqueta}>\n${items.map((x) => `<li>${enLinea(x, opciones)}</li>`).join('\n')}\n</${etiqueta}>`
      );
      continue;
    }

    const parrafo = [];
    while (i < lineas.length && lineas[i].trim() !== '' && !(parrafo.length && empiezaBloque(lineas[i]))) {
      parrafo.push(lineas[i++].trim());
    }
    bloques.push(`<p>${enLinea(parrafo.join('\n'), opciones)}</p>`);
  }

  return bloques.join('\n');
}

module.exports = { aHtml };
