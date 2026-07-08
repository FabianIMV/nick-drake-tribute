# Nick Drake · Pink Moon — Tributo

Una página-tributo **viva** basada en la portada de *Pink Moon* (1972) de Nick Drake.

La portada original fue separada en capas (fondo, luna, taza, hoja, estampilla,
cara, caracol) y se recompone en el navegador con **Three.js**: cada elemento
flota con su propio movimiento, hay parallax con el mouse (o giroscopio en el
teléfono), estrellas que titilan, luciérnagas y un halo rosa que respira
alrededor de la luna.

## Ver en local

No necesita build. Solo un servidor estático:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Publicar en GitHub Pages

Settings → Pages → *Deploy from a branch* → rama `main` (o esta rama), carpeta `/ (root)`.

## Música (próximamente)

En `main.js`, al inicio, hay una constante:

```js
const YOUTUBE_VIDEO_ID = '';
```

Al pegar ahí el ID de un video o playlist de YouTube con el álbum, aparece el
botón **♪ escuchar el álbum** con un reproductor embebido.

## Estructura

- `index.html` / `style.css` — título, tracklist, créditos
- `main.js` — la escena Three.js (capas, animaciones, parallax)
- `assets/` — las capas recortadas de la portada + fondo reconstruido
- `vendor/three.module.js` — Three.js r160 vendoreado (sin CDN)

---

Tributo hecho por fans. *Pink Moon* © Island Records, 1972.
Arte original de la portada: **Michael Trevithick**.
