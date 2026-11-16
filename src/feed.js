// Canal RSS del blog, para quien quiera seguirlo con un lector.

const { escapar } = require('./html.js');
const { aHtml } = require('./markdown.js');

const MAXIMO = 20;

function feed(sitio, entradas) {
  const base = sitio.direccion; // termina en "/"
  const items = entradas.slice(0, MAXIMO).map((e) => {
    const enlace = escapar(`${base}blog/${e.slug}/`);
    // En el canal las imágenes necesitan la dirección completa.
    const html = aHtml(e.cuerpo, { raizImagenes: `${base}imagenes/` });
    const fecha = new Date(`${e.fecha}T12:00:00Z`).toUTCString();
    return `<item>
<title>${escapar(e.titulo)}</title>
<link>${enlace}</link>
<guid>${enlace}</guid>
<pubDate>${fecha}</pubDate>
<description>${escapar(html)}</description>
</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${escapar(sitio.nombre)}</title>
<link>${escapar(base)}</link>
<description>${escapar(sitio.lema || sitio.nombre)}</description>
<language>es</language>
${items.join('\n')}
</channel>
</rss>
`;
}

module.exports = { feed, MAXIMO };
