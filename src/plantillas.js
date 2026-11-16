// Las páginas, como funciones que devuelven HTML. Todo texto que viene de
// los archivos de contenido pasa por escapar() antes de entrar a la página.

const { escapar } = require('./html.js');
const { aHtml } = require('./markdown.js');

// Solo se cargan recursos del propio sitio (la misma política de Nodos).
const CSP =
  "default-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";

// Secciones de trabajos: qué tipo muestra cada una, su ruta y su clave de texto.
const SECCIONES = [
  { tipo: 'musica', ruta: 'musica/', clave: 'musica' },
  { tipo: 'juego', ruta: 'juegos/', clave: 'juegos' },
  { tipo: 'proyecto', ruta: 'proyectos/', clave: 'proyectos' },
];
const MAX_ESCUCHA_PORTADA = 3;
const MAX_FICHAS_PORTADA = 6;
const MAX_ENTRADAS_PORTADA = 3;
const RUTA_BLOG = 'blog/';
const RUTA_FEED = 'blog/feed.xml';

// El menú: solo aparecen las secciones que tienen algo.
function menuDe({ textos, trabajos, entradas }) {
  const menu = [{ texto: textos.menu.inicio, ruta: '' }];
  for (const s of SECCIONES) {
    if (trabajos.some((t) => t.tipo === s.tipo)) {
      menu.push({ texto: textos.menu[s.clave], ruta: s.ruta });
    }
  }
  if (entradas.length) menu.push({ texto: textos.menu.blog, ruta: RUTA_BLOG });
  return menu;
}

// Dirección de un archivo propio (imagen, audio, foto) dentro del sitio.
function rutaArchivo(sitio, carpeta, nombre) {
  return escapar(sitio.raiz + carpeta + encodeURIComponent(nombre));
}

// Una ficha: toda ella es un enlace al sitio donde vive el trabajo.
function ficha(trabajo, { sitio, textos }) {
  const imagen = trabajo.imagen
    ? `<img src="${rutaArchivo(sitio, 'imagenes/', trabajo.imagen)}" alt="" loading="lazy" width="200" height="200">`
    : '';
  return (
    `<a class="ficha" href="${escapar(trabajo.enlace)}" rel="noopener">${imagen}` +
    `<b>${escapar(trabajo.titulo)}</b>` +
    `<span class="hint">${escapar(textos.tipos[trabajo.tipo])} · ${trabajo.año}</span></a>`
  );
}

function fichas(trabajos, contexto) {
  if (!trabajos.length) return '';
  return `<ul class="fichas">\n${trabajos
    .map((t) => `<li>${ficha(t, contexto)}</li>`)
    .join('\n')}\n</ul>`;
}

// Las canciones que suenan en la página, con el reproductor del navegador.
// preload="none": no se descarga nada hasta que el visitante le da play.
function escucha(trabajos, { sitio, textos }, maximo = Infinity) {
  const conAudio = trabajos.filter((t) => t.audio).slice(0, maximo);
  if (!conAudio.length) return '';
  return `<h2>${escapar(textos.titulos.escucha)}</h2>
<ul class="escucha">
${conAudio
  .map(
    (t) =>
      `<li><span class="cancion">${escapar(t.titulo)}</span>` +
      `<audio controls preload="none" src="${rutaArchivo(sitio, 'audio/', t.audio)}"></audio></li>`
  )
  .join('\n')}
</ul>`;
}

// Cuerpo de la página de una sección (música, juegos o proyectos).
function seccion({ sitio, textos, tipo, trabajos }) {
  const s = SECCIONES.find((x) => x.tipo === tipo);
  const propios = trabajos.filter((t) => t.tipo === tipo);
  return [
    `<h1>${escapar(textos.titulos[s.clave])}</h1>`,
    escucha(propios, { sitio, textos }),
    fichas(propios, { sitio, textos }),
  ]
    .filter(Boolean)
    .join('\n');
}

// Documento completo: encabezado con el nombre y el menú, el cuerpo y el pie.
// "ruta" es la de esta página dentro del sitio ('' para la portada, 'blog/'…).
function pagina({ sitio, textos, titulo, ruta, menu, cuerpo }) {
  const raiz = escapar(sitio.raiz);
  const nombre = escapar(sitio.nombre);
  const tituloCompleto = titulo ? `${escapar(titulo)} · ${nombre}` : nombre;
  const enlaces = menu
    .map((m) => {
      const actual =
        m.ruta === ruta || (m.ruta && ruta.startsWith(m.ruta)) ? ' aria-current="page"' : '';
      return `<a href="${raiz}${escapar(m.ruta)}"${actual}>${escapar(m.texto)}</a>`;
    })
    .join('\n');
  const canal = sitio.conFeed
    ? `<link rel="alternate" type="application/rss+xml" title="${nombre}" href="${raiz}${RUTA_FEED}">\n`
    : '';
  const pieCanal = sitio.conFeed
    ? ` · <a href="${raiz}${RUTA_FEED}">${escapar(textos.frases.rss)}</a>`
    : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${tituloCompleto}</title>
<link rel="stylesheet" href="${raiz}estilos/temas.css">
<link rel="stylesheet" href="${raiz}estilos/base.css">
${canal}</head>
<body class="tema-${escapar(sitio.tema)}">
<header class="top">
<a class="brand" href="${raiz}">${nombre}</a>
<nav>
${enlaces}
</nav>
</header>
<main>
${cuerpo}
</main>
<footer class="pie">${nombre}${pieCanal}</footer>
</body>
</html>
`;
}

function perfil({ sitio, textos }) {
  const raiz = escapar(sitio.raiz);
  const foto = sitio.foto
    ? `<img class="photo" src="${rutaArchivo(sitio, '', sitio.foto)}" alt="${escapar(textos.frases.fotoAlt)}" width="160" height="160">\n`
    : '';
  const lema = sitio.lema ? `<p class="lema">${escapar(sitio.lema)}</p>\n` : '';
  const redes = sitio.redes.length
    ? `<ul class="links">\n${sitio.redes
        .map((r) => `<li><a href="${escapar(r.url)}" rel="me noopener">${escapar(r.nombre)}</a></li>`)
        .join('\n')}\n</ul>\n`
    : '';
  return `<section class="perfil">
${foto}<div class="perfil-texto">
${lema}${aHtml(sitio.presentacion, { raizImagenes: `${sitio.raiz}imagenes/` })}
${redes}</div>
</section>`;
}

// Cuerpo de la portada.
// "2026-11-15" -> "15 de noviembre de 2026" (sin depender del idioma del equipo).
function fechaLarga(fecha, textos) {
  const [año, mes, dia] = fecha.split('-').map(Number);
  return `${dia} de ${textos.meses[mes - 1]} de ${año}`;
}

function fechaHtml(fecha, textos) {
  return `<time datetime="${escapar(fecha)}">${escapar(fechaLarga(fecha, textos))}</time>`;
}

function listaEntradas(entradas, { sitio, textos }) {
  if (!entradas.length) return '';
  return `<ul class="entradas">\n${entradas
    .map(
      (e) =>
        `<li>${fechaHtml(e.fecha, textos)} <a href="${escapar(sitio.raiz + RUTA_BLOG + e.slug)}/">${escapar(e.titulo)}</a></li>`
    )
    .join('\n')}\n</ul>`;
}

// Cuerpo de la lista del blog.
function blogIndice({ sitio, textos, entradas }) {
  return `<h1>${escapar(textos.titulos.blog)}</h1>\n${listaEntradas(entradas, { sitio, textos })}`;
}

// Cuerpo de la página de una entrada. El HTML del texto ya viene limpio
// del conversor de Markdown.
function entrada({ sitio, textos, entrada: e }) {
  return `<article class="entrada">
<h1>${escapar(e.titulo)}</h1>
<p class="hint">${fechaHtml(e.fecha, textos)}</p>
${e.html}
</article>
<p class="volver"><a href="${escapar(sitio.raiz + RUTA_BLOG)}">${escapar(textos.frases.volverAlBlog)}</a></p>`;
}

function noEncontrado({ sitio, textos }) {
  return `<h1>${escapar(textos.titulos.noEncontrado)}</h1>
<p>${escapar(textos.frases.noEncontrado)}</p>
<p><a href="${escapar(sitio.raiz)}">${escapar(textos.frases.irAlInicio)}</a></p>`;
}

function portada({ sitio, textos, trabajos, entradas }) {
  const contexto = { sitio, textos };
  const recientes = trabajos.slice(0, MAX_FICHAS_PORTADA);
  return [
    perfil(contexto),
    escucha(trabajos, contexto, MAX_ESCUCHA_PORTADA),
    recientes.length ? `<h2>${escapar(textos.titulos.ultimos)}</h2>` : '',
    fichas(recientes, contexto),
    entradas.length ? `<h2>${escapar(textos.titulos.delBlog)}</h2>` : '',
    listaEntradas(entradas.slice(0, MAX_ENTRADAS_PORTADA), contexto),
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  pagina, portada, menuDe, ficha, seccion, blogIndice, entrada, noEncontrado, fechaLarga,
  SECCIONES, RUTA_BLOG, RUTA_FEED, CSP,
};
