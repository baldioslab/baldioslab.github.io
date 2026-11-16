// Ayudas para las pruebas: crear carpetas de contenido temporales.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SITIO = `nombre: baldíos lab
lema: música · videojuegos · software
tema: bosque
direccion: https://baldioslab.github.io/
red: bandcamp | https://ejemplo.bandcamp.com
red: soundcloud | https://soundcloud.com/ejemplo
red: itch.io | https://ejemplo.itch.io
red: github | https://github.com/GA2991
---
Un párrafo corto sobre quién eres y qué haces.
`;

// Crea una carpeta temporal con los archivos indicados
// ({ 'sitio.txt': '...', 'trabajos/x.txt': '...' }) y devuelve su ruta.
function carpeta(archivos = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baldios-'));
  for (const [nombre, texto] of Object.entries(archivos)) {
    const destino = path.join(dir, nombre);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, texto);
  }
  return dir;
}

// sitio.txt de ejemplo con algunas líneas cambiadas o quitadas.
function sitioCon(cambios = {}) {
  let texto = SITIO;
  for (const [clave, valor] of Object.entries(cambios)) {
    const patron = new RegExp(`^${clave}:.*\\n`, 'm');
    if (valor === null) texto = texto.replace(patron, '');
    else if (patron.test(texto)) texto = texto.replace(patron, `${clave}: ${valor}\n`);
    else texto = `${clave}: ${valor}\n` + texto;
  }
  return texto;
}

module.exports = { SITIO, carpeta, sitioCon };
