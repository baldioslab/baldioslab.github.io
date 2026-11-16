// Utilidades de texto: escapar para HTML, validar enlaces y hacer "slugs".

const REEMPLAZOS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Devuelve el texto listo para ponerlo dentro de una página sin que
// ningún carácter se interprete como HTML.
function escapar(texto) {
  if (texto === undefined || texto === null) return '';
  return String(texto).replace(/[&<>"']/g, (c) => REEMPLAZOS[c]);
}

// Solo se aceptan direcciones completas http o https (regla tomada de Nodos).
function enlaceSeguro(url) {
  if (typeof url !== 'string' || url !== url.trim()) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// "Canción Ñandú" -> "cancion-nandu": sirve para direcciones de páginas.
function slug(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { escapar, enlaceSeguro, slug };
