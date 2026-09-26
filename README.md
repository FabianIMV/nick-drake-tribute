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
(se "levanta" y proyecta una sombra suave) y sigue flotando desde su nueva
posición; con **doble clic o doble toque** vuelve a su lugar en la portada.
Hay parallax (mouse, giroscopio o deriva automática si nadie interactúa),
estrellas que titilan, alguna estrella fugaz, luciérnagas y un halo rosa que
respira alrededor de la luna. Desde la tracklist se puede escuchar cualquier
canción, o el álbum completo en orden, con un reproductor de YouTube que
muestra qué canción suena.

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
su video de YouTube correspondiente. Al entrar, el álbum arranca solo en
silencio (los navegadores no permiten autoplay con sonido) y el botón
**activar sonido** lo destapa sin reiniciar la canción. El reproductor usa la
API de YouTube para mostrar la canción actual, pasar a la anterior/siguiente,
pausar y marcar el progreso; la tracklist sigue a la canción que suena. Si la
API no carga (bloqueadores, red), cae a un iframe simple.

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
- `assets/og-image.jpg` — imagen de vista previa para redes sociales
- `googlef0cd8a4a76148386.html` — archivo de verificación de Google Search Console

## Estructura

- `index.html` / `style.css` — título, tracklist, créditos, SEO
- `main.js` — la escena Three.js (capas, animaciones, parallax, arrastre, reproductor)
- `assets/` — las capas recortadas de la portada (PNG con transparencia),
  el fondo reconstruido y extendido (`bg.jpg`, 1760×1760) y la og-image

### Sobre los recortes

Las capas se recortaron desde una reconstrucción de la portada completa:
la estampilla incluye la llama entera del cohete (antes quedaba partida con
la luna), la taza tiene el asa hueca, la hoja no arrastra halo oscuro, y lo
que quedaba escondido detrás de cada objeto (en la luna y en el cielo) se
rellenó con un degradado continuo con grano de pintura, para que al mover
los objetos no aparezcan manchas. El fondo se extiende hacia los lados con
acantilados de silueta natural en lugar de franjas estiradas.
- `vendor/three.module.js` — Three.js r160 vendoreado (sin CDN)
- `robots.txt`, `sitemap.xml`, `llms.txt` — SEO/GEO

---

Tributo hecho por fans. *Pink Moon* © Island Records, 1972.
Arte original de la portada: **Michael Trevithick**.
