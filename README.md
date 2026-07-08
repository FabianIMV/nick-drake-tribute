# Nick Drake · Pink Moon — Living Tribute

**This is a living web tribute made to spread the music and art of Nick Drake.**
It exists purely so more people discover *Pink Moon* (1972) — a fan project,
not affiliated with Island Records or the Drake estate. If you're new to Nick
Drake: he was an English singer-songwriter (1948–1974) whose quiet,
intricately-fingerpicked folk songs went largely unheard in his lifetime and
have since become deeply influential. This page brings his last album's cover
art to life and makes it easy to listen to the whole record, track by track.

Una página-tributo **viva** basada en la portada de *Pink Moon* (1972) de Nick Drake.

La portada original fue separada en capas (fondo, luna, taza, hoja, estampilla,
cara, caracol) y se recompone en el navegador con **Three.js**: cada elemento
flota con su propio movimiento, se puede **arrastrar con el mouse o el dedo**
y sigue flotando desde su nueva posición, hay parallax (mouse, giroscopio o
deriva automática si nadie interactúa), estrellas que titilan, luciérnagas y
un halo rosa que respira alrededor de la luna. Desde la tracklist se puede
escuchar cualquier canción, o el álbum completo en orden, con reproductores
de YouTube embebidos.

## Ver en local

No necesita build. Solo un servidor estático:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Publicar en GitHub Pages

Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
URL pública: https://fabianimv.github.io/nick-drake-tribute/

## Música

En `main.js` está el arreglo `TRACKS`, con las 11 canciones de *Pink Moon* y
su video de YouTube correspondiente. Click en una canción de la tracklist la
reproduce; el botón **♪ escuchar el álbum** reproduce las 11 en orden.

## SEO / GEO

El sitio incluye lo necesario para que buscadores tradicionales y motores de
respuesta con IA (ChatGPT, Perplexity, Google AI Overviews, etc.) puedan
indexarlo y citarlo correctamente:

- `robots.txt` — permite explícitamente a los crawlers de IA conocidos
  (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.)
- `sitemap.xml`
- `llms.txt` — resumen del sitio en texto plano pensado para LLMs (estándar emergente)
- Open Graph, Twitter Card, `<link rel="canonical">` y JSON-LD (`MusicAlbum`,
  `WebPage`) en `index.html`
- `assets/og-image.png` — imagen de vista previa para redes sociales
- `googlef0cd8a4a76148386.html` — archivo de verificación de Google Search Console

## Estructura

- `index.html` / `style.css` — título, tracklist, créditos, SEO
- `main.js` — la escena Three.js (capas, animaciones, parallax, arrastre, reproductor)
- `assets/` — las capas recortadas de la portada + fondo reconstruido + og-image
- `vendor/three.module.js` — Three.js r160 vendoreado (sin CDN)
- `robots.txt`, `sitemap.xml`, `llms.txt` — SEO/GEO

---

Tributo hecho por fans. *Pink Moon* © Island Records, 1972.
Arte original de la portada: **Michael Trevithick**.
