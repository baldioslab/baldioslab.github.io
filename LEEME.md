# baldíos lab — cómo usar esta página

Todo lo que publicas vive en la carpeta `contenido/`, en archivos de texto que
puedes editar con el Bloc de notas. Un programita arma la página a partir de
ellos. No hay contraseñas, base de datos ni nada que instalar.

## Lo esencial

| Quiero… | Qué hago |
|---|---|
| Cambiar nombre, presentación, redes o tema | Edito `contenido/sitio.txt` |
| Agregar un trabajo | Creo un archivo `.txt` en `contenido/trabajos/` |
| Escribir en el blog | Creo un archivo `.md` en `contenido/blog/` |
| Ver cómo queda antes de publicar | Corro `node ver.js` |

## Los archivos tienen todos la misma forma

Arriba, líneas `clave: valor`. Si hay texto largo, va debajo de una línea con
tres guiones `---`. Las líneas que empiezan con `#` en la parte de arriba son
notas para ti y no se publican.

## Datos generales: `contenido/sitio.txt`

```
nombre: baldíos lab
lema: música · videojuegos · software
tema: bosque
direccion: https://baldioslab.github.io/
foto: foto.jpg
red: bandcamp | https://tunombre.bandcamp.com
red: itch.io | https://tunombre.itch.io
---
Tu presentación. Admite **negrita**, *cursiva* y [enlaces](https://ejemplo.com).
```

- **Temas:** `claro`, `oscuro`, `papel`, `bosque`, `atardecer`, `neon`. Para
  cambiar, edita la palabra después de `tema:`.
- **Foto:** opcional. Pon el archivo dentro de `contenido/` y escribe su nombre.
- **Redes:** una línea `red:` por cada una, como `nombre | dirección`.

## Agregar un trabajo

Crea un archivo en `contenido/trabajos/`, por ejemplo `mi-disco.txt`:

```
titulo: Mi disco
tipo: musica
año: 2025
enlace: https://tunombre.bandcamp.com/album/mi-disco
imagen: portada-disco.jpg
audio: cancion.mp3
```

- `tipo` es `musica`, `juego` o `proyecto`. Decide en qué sección aparece.
- `enlace` es adonde lleva la ficha. Tiene que empezar con `https://`.
- `imagen` es opcional. El archivo va en `contenido/imagenes/`.
- `audio` es opcional y solo para música. El archivo va en `contenido/audio/`.
  Las fichas con audio son las que suenan en la portada (hasta tres) y en la
  página de música.

Los trabajos se ordenan solos, del año más nuevo al más viejo. La portada
muestra los seis más recientes.

## Escribir en el blog

Crea un archivo en `contenido/blog/`. El nombre empieza con la fecha y termina
en `.md`, por ejemplo `2026-11-20-un-dia-de-estudio.md`:

```
titulo: Un día de estudio
---
Aquí va el texto.
```

- El nombre del archivo decide la dirección de la entrada:
  `/blog/un-dia-de-estudio/`. Si después lo cambias, la dirección cambia.
- Si prefieres otra fecha que la del nombre, agrega `fecha: 2026-11-20`.
- Para guardar algo sin publicarlo, agrega la línea `borrador: si`.

### Cómo dar formato al texto

| Escribes | Se ve |
|---|---|
| `**importante**` | **importante** |
| `*suave*` | *suave* |
| `[texto](https://ejemplo.com)` | un enlace |
| `## Subtítulo` | un subtítulo |
| `- cosa` | una lista con puntos |
| `1. cosa` | una lista numerada |
| `> frase` | una cita |
| `![descripción](foto.jpg)` | una imagen de `contenido/imagenes/` |
| `---` (sola en una línea) | una línea divisoria |

Deja una línea en blanco entre párrafos. No se admite HTML: si lo escribes,
aparece tal cual como texto.

## Ver la página en tu computador

```
node ver.js
```

Abre `http://127.0.0.1:8080/` en el navegador. Solo se ve desde tu equipo. El
visor queda encendido hasta que lo detengas con **Ctrl+C**.

Si cambias algo mientras está encendido, abre otra terminal y corre:

```
node construir.js
```

y recarga el navegador.

## Si algo sale mal

El programita se detiene y te dice qué archivo y qué dato tiene el problema,
por ejemplo:

```
No se pudo armar la página.
trabajos/mi-disco.txt: falta «titulo»
```

Corrige ese archivo y vuelve a correr el comando. Mientras haya un error, la
página anterior no se toca.

Los **avisos** no detienen nada; solo recomiendan algo:

- *"pesa X KB; conviene reducirla"*: una imagen pasa de 200 KB. La página
  funciona, pero cargará lento. Redúcela con cualquier editor de imágenes
  (unos 800 píxeles de ancho bastan) y vuelve a guardarla.
- *"la página pesa X KB"*: una entrada es muy larga. Considera partirla en dos.

## Límites que conviene saber

- Los archivos de audio van tal cual: usa MP3 y solo unas pocas canciones. El
  alojamiento gratuito admite hasta 100 MB por archivo y 1 GB en total.
- No hay estadísticas de visitas, a propósito: la página no rastrea a nadie.
- La página no carga nada de otros sitios. Para mostrar algo de Bandcamp o
  YouTube, se enlaza; no se incrusta.

## Para quien toque el código

- `construir.js` arma la página; `ver.js` la muestra en local.
- `src/` tiene el programita; `estilos/` los colores y la forma.
- `pruebas/` se corren con `node --test pruebas/`. Tienen que pasar todas
  antes de publicar.
- Al subir cambios a GitHub, `.github/workflows/publicar.yml` corre las pruebas,
  arma la página y la publica.
