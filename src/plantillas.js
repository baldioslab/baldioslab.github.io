// Las páginas, como funciones que devuelven HTML. Todo texto que viene de
// los archivos de contenido pasa por escapar() antes de entrar a la página.

const { escapar } = require('./html.js');

// Solo se cargan recursos del propio sitio (la misma política de Nodos).
const CSP =
  "default-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'";

// El menú: solo aparecen las secciones que tienen algo.
function menuDe({ textos }) {
  return [{ texto: textos.menu.inicio, ruta: '' }];
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
    ? `<img class="photo" src="${raiz}${escapar(sitio.foto)}" alt="${escapar(textos.frases.fotoAlt)}" width="160" height="160">\n`
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
function portada({ sitio, textos }) {
  return perfil({ sitio, textos });
}

module.exports = { pagina, portada, menuDe, CSP };
