// Las páginas, como funciones que devuelven HTML. Todo texto que viene de
// los archivos de contenido pasa por escapar() antes de entrar a la página.

const { escapar } = require('./html.js');

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

// El menú: solo aparecen las secciones que tienen algo.
function menuDe({ textos, trabajos }) {
  const menu = [{ texto: textos.menu.inicio, ruta: '' }];
  for (const s of SECCIONES) {
    if (trabajos.some((t) => t.tipo === s.tipo)) {
      menu.push({ texto: textos.menu[s.clave], ruta: s.ruta });
    }
  }
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
      const actual = m.ruta === ruta ? ' aria-current="page"' : '';
      return `<a href="${raiz}${escapar(m.ruta)}"${actual}>${escapar(m.texto)}</a>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${tituloCompleto}</title>
<link rel="stylesheet" href="${raiz}estilos/temas.css">
<link rel="stylesheet" href="${raiz}estilos/base.css">
</head>
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
<footer class="pie">${nombre}</footer>
</body>
</html>
`;
}

// Texto simple a párrafos: una línea en blanco separa párrafos.
function parrafos(texto) {
  return texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapar(p)}</p>`)
    .join('\n');
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
${lema}${parrafos(sitio.presentacion)}
${redes}</div>
</section>`;
}

// Cuerpo de la portada.
function portada({ sitio, textos, trabajos }) {
  const contexto = { sitio, textos };
  const recientes = trabajos.slice(0, MAX_FICHAS_PORTADA);
  return [
    perfil(contexto),
    escucha(trabajos, contexto, MAX_ESCUCHA_PORTADA),
    recientes.length ? `<h2>${escapar(textos.titulos.ultimos)}</h2>` : '',
    fichas(recientes, contexto),
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = { pagina, portada, menuDe, ficha, seccion, SECCIONES, CSP };
