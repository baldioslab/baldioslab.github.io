// Arma la página: lee contenido/ y escribe salida/.
// Uso: node construir.js

const path = require('node:path');
const { construir } = require('./src/sitio.js');

try {
  const { paginas, avisos } = construir(
    path.join(__dirname, 'contenido'),
    path.join(__dirname, 'salida')
  );
  console.log(`Página armada en la carpeta «salida» (${paginas.length} archivos):`);
  for (const p of paginas) console.log(`  ${p}`);
  for (const a of avisos) console.log(`AVISO: ${a}`);
} catch (error) {
  console.error(`No se pudo armar la página.\n${error.message}`);
  process.exit(1);
}
