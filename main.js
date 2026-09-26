import * as THREE from './vendor/three.module.js';

// ============================================================
//  Pink Moon — escena viva basada en la portada del disco.
//  La portada fue separada en capas (fondo, luna, objetos)
//  y aquí se recompone con profundidad, parallax y deriva.
//  Los objetos se pueden arrastrar con el dedo o el mouse y
//  siguen flotando solos alrededor de donde los dejes; con
//  doble clic / doble toque vuelven a su lugar en la portada.
// ============================================================

// Cada canción de Pink Moon (1972), en orden, con su video de YouTube.
const TRACKS = [
  { title: 'Pink Moon',            id: 'ZgHdUeMHTwc' },
  { title: 'Place to Be',          id: 'jvLtyyBRITo' },
  { title: 'Road',                 id: 'jpk32L8Bb4c' },
  { title: 'Which Will',           id: '1gYtqGgSTuo' },
  { title: 'Horn',                 id: '9absJQoPCX8' },
  { title: 'Things Behind the Sun',id: 'j14PgxHghjQ' },
  { title: 'Know',                 id: 'LmqKVhtN50E' },
  { title: 'Parasite',             id: 'qQlMBqdKWb4' },
  { title: 'Free Ride',            id: 'y4CvAejW-jI' },
  { title: 'Harvest Breed',        id: '7d87RHPn8kI' },
  { title: 'From the Morning',     id: 'xPe5ZQx0OpQ' },
];

const ART = 640; // la portada vive en un espacio de 640x640 (y hacia abajo)
const BG_W = 1760, BG_H = 1760; // fondo extendido para pantallas anchas/altas

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
// en pantallas táctiles el movimiento autónomo es más notorio
const MOTION = reduceMotion ? 0.25 : (coarse ? 1.6 : 1);

// altura de viewport visible real (evita saltos al aparecer/ocultarse
// la barra de Safari en iOS, que dispara resize con valores intermedios)
const vv = window.visualViewport;

// offset (x,y desde arriba-izquierda de la portada), tamaño y profundidad z
const LAYERS = {
  bg:     { url: 'assets/bg.jpg',     x: (ART - BG_W) / 2, y: (ART - BG_H) / 2, w: BG_W, h: BG_H, z: -60 },
  sphere: { url: 'assets/sphere.png', x: 143, y: 110, w: 339, h: 432, z: -30, drag: true },
  shell:  { url: 'assets/shell.png',  x: 15,  y: 496, w: 68,  h: 62,  z: -16, drag: true, shadow: true },
  leaf:   { url: 'assets/leaf.png',   x: 117, y: 85,  w: 136, h: 105, z: -12, drag: true, shadow: true },
  stamp:  { url: 'assets/stamp.png',  x: 259, y: 215, w: 84,  h: 116, z: -10, drag: true, shadow: true },
  teacup: { url: 'assets/teacup.png', x: 87,  y: 206, w: 148, h: 126, z: -8,  drag: true, shadow: true },
  face:   { url: 'assets/face.png',   x: 421, y: 51,  w: 162, h: 218, z: -6,  drag: true, shadow: true },
};

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1626');

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
camera.position.z = 10;

function resize() {
  const vw = window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  renderer.setSize(vw, vh);
  // "contain": la portada (640x640) siempre entra completa en pantalla,
  // nunca se recorta; el fondo extendido rellena el resto a los costados.
  const s = 0.94 * Math.min(vw, vh) / ART;
  const halfW = vw / s / 2, halfH = vh / s / 2;
  camera.left = -halfW; camera.right = halfW;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
if (vv) vv.addEventListener('resize', resize); // barra de Safari mostrándose/ocultándose
resize();

// coordenadas de portada (y hacia abajo) -> mundo (origen al centro, y hacia arriba)
const wx = (x) => x - ART / 2;
const wy = (y) => ART / 2 - y;

// la escena aparece suavemente cuando todas las capas están listas
const manager = new THREE.LoadingManager();
let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  canvas.classList.add('ready');
  showHint();
}
manager.onLoad = reveal;
setTimeout(reveal, 5000); // por si alguna textura tarda demasiado

const loader = new THREE.TextureLoader(manager);
const sprites = {};
const draggables = [];
const shadows = [];

// sombra suave a partir de la silueta del objeto: se dibuja en negro a
// baja resolución y se vuelve a escalar, lo que la difumina en cualquier
// navegador (ctx.filter no está en todos lados)
const SHADOW_PAD = 14;
function shadowTexture(img) {
  const w = img.width + SHADOW_PAD * 2, h = img.height + SHADOW_PAD * 2;
  const sil = document.createElement('canvas');
  sil.width = w; sil.height = h;
  const g = sil.getContext('2d');
  g.drawImage(img, SHADOW_PAD, SHADOW_PAD);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#06080c';
  g.fillRect(0, 0, w, h);
  const small = document.createElement('canvas');
  small.width = Math.max(4, Math.round(w / 6)); small.height = Math.max(4, Math.round(h / 6));
  const gs = small.getContext('2d');
  gs.imageSmoothingQuality = 'high';
  gs.drawImage(sil, 0, 0, small.width, small.height);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const go = out.getContext('2d');
  go.imageSmoothingQuality = 'high';
  go.drawImage(small, 0, 0, w, h);
  const t = new THREE.CanvasTexture(out);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

for (const [name, L] of Object.entries(LAYERS)) {
  const tex = loader.load(L.url, (t) => {
    // mapa de alpha para que el arrastre ignore las zonas transparentes
    if (L.drag && t.image) {
      const c = document.createElement('canvas');
      c.width = t.image.width; c.height = t.image.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(t.image, 0, 0);
      mesh.userData.alpha = g.getImageData(0, 0, c.width, c.height);
    }
    if (L.shadow && t.image) {
      mesh.userData.shadow.material.map = shadowTexture(t.image);
      mesh.userData.shadow.material.needsUpdate = true;
      mesh.userData.shadow.visible = true;
    }
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: name !== 'bg' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), mat);
  const cx = wx(L.x + L.w / 2), cy = wy(L.y + L.h / 2);
  mesh.position.set(cx, cy, L.z);
  mesh.userData = { name, cx, cy, z: L.z, homeX: cx, homeY: cy, lift: 0, returning: false };
  scene.add(mesh);
  sprites[name] = mesh;
  if (L.drag) draggables.push(mesh);
  if (L.shadow) {
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(L.w + SHADOW_PAD * 2, L.h + SHADOW_PAD * 2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false })
    );
    sh.visible = false;
    sh.position.set(cx, cy, L.z - 0.5);
    scene.add(sh);
    mesh.userData.shadow = sh;
    shadows.push(mesh);
  }
}
draggables.sort((a, b) => b.userData.z - a.userData.z); // los de adelante primero

// ---------- halo rosa de la luna ----------
function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const glow = new THREE.Mesh(
  new THREE.PlaneGeometry(560, 560),
  new THREE.MeshBasicMaterial({
    map: radialTexture('rgba(238,130,178,0.55)', 'rgba(238,130,178,0)'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
glow.position.set(wx(312), wy(300), -45);
scene.add(glow);

// ---------- estrellas que titilan en el cielo ----------
function makePoints(n, area, size, color) {
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3]     = wx(area.x0 + Math.random() * (area.x1 - area.x0));
    pos[i * 3 + 1] = wy(area.y0 + Math.random() * (area.y1 - area.y0));
    pos[i * 3 + 2] = area.z;
    phase[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: size }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      attribute float phase;
      varying float vTwinkle;
      uniform float uTime, uSize;
      void main() {
        vTwinkle = 0.45 + 0.55 * sin(uTime * 1.4 + phase * 7.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * (0.7 + 0.6 * sin(phase * 13.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vTwinkle;
      uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * vTwinkle;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return mat;
}

const starsMat = makePoints(70, { x0: -440, x1: 1080, y0: -300, y1: 210, z: -55 }, 2.6, '#cfe0ea');
const firefliesMat = makePoints(26, { x0: -200, x1: 840, y0: 400, y1: 900, z: -14 }, 3.4, '#ffd9a0');

// ---------- una estrella fugaz, de vez en cuando ----------
function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 16;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.85, 'rgba(236,244,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 8); g.lineTo(250, 5); g.arc(250, 8, 3, -Math.PI / 2, Math.PI / 2); g.lineTo(0, 8);
  g.fill();
  return new THREE.CanvasTexture(c);
}
const meteor = new THREE.Mesh(
  new THREE.PlaneGeometry(130, 5),
  new THREE.MeshBasicMaterial({
    map: streakTexture(), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
);
meteor.position.z = -50;
scene.add(meteor);
let meteorStart = -1, nextMeteor = 9 + Math.random() * 8;
const meteorPath = { x: 0, y: 0, dx: 0, dy: 0 };

function launchMeteor(t) {
  meteorStart = t;
  nextMeteor = t + 14 + Math.random() * 18;
  const dir = Math.random() < 0.5 ? -1 : 1;
  const ang = (0.32 + Math.random() * 0.25) * dir; // cae en diagonal
  meteorPath.x = wx(100 + Math.random() * 440) - dir * 120;
  meteorPath.y = wy(-40 + Math.random() * 160);
  meteorPath.dx = Math.cos(ang) * dir * 520;
  meteorPath.dy = -Math.abs(Math.sin(ang)) * 520;
  meteor.rotation.z = Math.atan2(meteorPath.dy, meteorPath.dx);
}

// ---------- parallax: mouse, dedo o giroscopio; deriva sola si nadie toca ----------
const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
let lastInput = -10;
let dragging = null;

function setPointer(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = (clientY / window.innerHeight) * 2 - 1;
  lastInput = clock.getElapsedTime();
}

window.addEventListener('deviceorientation', (e) => {
  if (e.gamma == null || e.beta == null) return;
  pointer.x = THREE.MathUtils.clamp(e.gamma / 25, -1, 1);
  pointer.y = THREE.MathUtils.clamp((e.beta - 45) / 25, -1, 1);
  lastInput = clock.getElapsedTime();
});

// ---------- arrastrar objetos ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function pointerToWorld(clientX, clientY) {
  const x = camera.left + (clientX / window.innerWidth) * (camera.right - camera.left);
  const y = camera.top - (clientY / window.innerHeight) * (camera.top - camera.bottom);
  return { x, y };
}

function pick(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  for (const mesh of draggables) {
    const hit = raycaster.intersectObject(mesh)[0];
    if (!hit || !hit.uv) continue;
    const a = mesh.userData.alpha;
    if (a) {
      const px = Math.floor(hit.uv.x * (a.width - 1));
      const py = Math.floor((1 - hit.uv.y) * (a.height - 1));
      if (a.data[(py * a.width + px) * 4 + 3] < 60) continue; // zona transparente
    }
    return mesh;
  }
  return null;
}

// doble clic / doble toque: el objeto vuelve a su lugar en la portada
function sendHome(mesh) {
  mesh.userData.returning = true;
}
let lastTap = { mesh: null, time: 0 };

canvas.addEventListener('pointerdown', (e) => {
  const mesh = pick(e.clientX, e.clientY);
  setPointer(e.clientX, e.clientY);
  if (!mesh) return;
  e.preventDefault(); // evita que iOS interprete el toque como gesto/selección
  const now = performance.now();
  if (lastTap.mesh === mesh && now - lastTap.time < 350) {
    lastTap.mesh = null;
    sendHome(mesh);
    return;
  }
  lastTap = { mesh, time: now };
  const w = pointerToWorld(e.clientX, e.clientY);
  mesh.userData.returning = false;
  dragging = {
    mesh,
    dx: w.x - mesh.userData.cx,
    dy: w.y - mesh.userData.cy,
  };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
  hideHint();
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (dragging) {
    e.preventDefault();
    const w = pointerToWorld(e.clientX, e.clientY);
    // el objeto sigue al dedo con un poco de elasticidad y sigue respirando
    dragging.mesh.userData.cx += (w.x - dragging.dx - dragging.mesh.userData.cx) * 0.35;
    dragging.mesh.userData.cy += (w.y - dragging.dy - dragging.mesh.userData.cy) * 0.35;
    lastInput = clock.getElapsedTime();
  } else {
    setPointer(e.clientX, e.clientY);
    if (!coarse) canvas.style.cursor = pick(e.clientX, e.clientY) ? 'grab' : 'default';
  }
}, { passive: false });

function endDrag(e) {
  if (!dragging) return;
  dragging = null;
  canvas.style.cursor = 'default';
  if (e.pointerId != null && canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // long-press en iOS

// ---------- pista: cómo jugar con la portada ----------
const hint = document.getElementById('hint');
let hintTimer = 0;
function showHint() {
  if (!hint) return;
  hint.textContent = coarse
    ? 'arrastra los objetos · doble toque para devolverlos'
    : 'arrastra los objetos · doble clic para devolverlos';
  hintTimer = setTimeout(() => {
    hint.classList.add('show');
    hintTimer = setTimeout(hideHint, 6500);
  }, 1800);
}
function hideHint() {
  if (!hint) return;
  clearTimeout(hintTimer);
  hint.classList.remove('show');
}

// ---------- animación ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const M = MOTION;

  // si nadie mueve el mouse ni toca la pantalla, la escena deriva sola
  const idle = THREE.MathUtils.clamp((t - lastInput - 2.5) / 2, 0, 1);
  const tx = THREE.MathUtils.lerp(pointer.x, 0.55 * Math.sin(t * 0.13), idle);
  const ty = THREE.MathUtils.lerp(pointer.y, 0.4 * Math.sin(t * 0.09 + 1.7), idle);
  eased.x += (tx - eased.x) * 0.035;
  eased.y += (ty - eased.y) * 0.035;

  for (const mesh of Object.values(sprites)) {
    const u = mesh.userData;
    if (u.returning) {
      u.cx += (u.homeX - u.cx) * 0.07;
      u.cy += (u.homeY - u.cy) * 0.07;
      if (Math.abs(u.homeX - u.cx) + Math.abs(u.homeY - u.cy) < 0.5) {
        u.cx = u.homeX; u.cy = u.homeY; u.returning = false;
      }
    }
    // al tomarlo, el objeto se "levanta" un poco de la portada
    u.lift += ((dragging && dragging.mesh === mesh ? 1 : 0) - u.lift) * 0.15;
    // capas más cercanas (z mayor) se desplazan más
    const depth = (u.z + 60) / 60; // 0 fondo … ~0.9 frente
    mesh.position.x = u.cx - eased.x * (4 + depth * 22) * M;
    mesh.position.y = u.cy + eased.y * (3 + depth * 16) * M;
    mesh.scale.setScalar(1 + 0.05 * u.lift);
  }

  const S = sprites;
  // la luna respira
  const sph = S.sphere;
  sph.scale.setScalar((1 + 0.007 * Math.sin(t * 0.5) * M) * (1 + 0.03 * sph.userData.lift));
  sph.rotation.z = 0.012 * Math.sin(t * 0.23) * M;
  sph.position.y += 3.5 * Math.sin(t * 0.4) * M;

  // la hoja se mece como cayendo
  S.leaf.rotation.z = 0.14 * Math.sin(t * 0.7) * M;
  S.leaf.position.y += 7 * Math.sin(t * 0.9) * M;
  S.leaf.position.x += 5 * Math.sin(t * 0.43) * M;

  // la taza flota
  S.teacup.rotation.z = 0.055 * Math.sin(t * 0.5 + 1.3) * M;
  S.teacup.position.y += 6 * Math.sin(t * 0.62 + 0.8) * M;

  // la estampilla aletea
  S.stamp.rotation.z = 0.1 * Math.sin(t * 0.85 + 2.1) * M;
  S.stamp.position.y += 8 * Math.sin(t * 0.75 + 1.7) * M;

  // la cara fantasma vaga lentamente
  S.face.position.x += 9 * Math.sin(t * 0.21) * M;
  S.face.position.y += 11 * Math.sin(t * 0.3 + 0.5) * M;
  S.face.rotation.z = 0.035 * Math.sin(t * 0.27 + 3) * M;

  // el caracol apenas se mueve
  S.shell.position.y += 1.6 * Math.sin(t * 0.5 + 2.6) * M;

  // sombras: siguen a su objeto, más lejos y más difusas cuando se levanta
  for (const mesh of shadows) {
    const sh = mesh.userData.shadow, lift = mesh.userData.lift;
    sh.position.x = mesh.position.x + 5 + 9 * lift;
    sh.position.y = mesh.position.y - 7 - 12 * lift;
    sh.rotation.z = mesh.rotation.z;
    sh.scale.setScalar(mesh.scale.x * (1 + 0.06 * lift));
    sh.material.opacity = 0.42 - 0.12 * lift;
  }

  // halo pulsante
  glow.material.opacity = 0.55 + 0.3 * Math.sin(t * 0.4);
  glow.scale.setScalar(1 + 0.04 * Math.sin(t * 0.33));
  glow.position.x = sph.position.x;
  glow.position.y = sph.position.y + 25;

  // estrella fugaz
  if (!reduceMotion && t > nextMeteor) launchMeteor(t);
  if (meteorStart >= 0) {
    const p = (t - meteorStart) / 1.1;
    if (p >= 1) {
      meteorStart = -1;
      meteor.material.opacity = 0;
    } else {
      const e = 1 - (1 - p) * (1 - p);
      meteor.position.x = meteorPath.x + meteorPath.dx * e;
      meteor.position.y = meteorPath.y + meteorPath.dy * e;
      meteor.material.opacity = Math.sin(Math.PI * p) * 0.9;
    }
  }

  starsMat.uniforms.uTime.value = t;
  firefliesMat.uniforms.uTime.value = t * 0.6;

  renderer.render(scene, camera);
}
animate();

// ---------- tracklist ----------
const tracksBtn = document.getElementById('tracksBtn');
const tracks = document.getElementById('tracks');
function setTracks(open) {
  tracks.hidden = !open;
  tracksBtn.setAttribute('aria-expanded', String(open));
}
tracksBtn.addEventListener('click', () => setTracks(tracks.hidden));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !tracks.hidden) { setTracks(false); tracksBtn.focus(); }
});
canvas.addEventListener('pointerdown', () => { if (!tracks.hidden) setTracks(false); });

// ---------- reproductor de YouTube ----------
// Autoplay con sonido está bloqueado por los navegadores sin interacción
// previa, así que el álbum arranca silenciado apenas se entra al sitio y
// "activar sonido" lo destapa sin reiniciar la canción. Con la API de
// YouTube sabemos qué canción suena y la tracklist la sigue.
const playBtn = document.getElementById('playBtn');
const player = document.getElementById('player');
const trackBtns = [...document.querySelectorAll('#tracks button[data-i]')];
const nowNum = document.getElementById('nowNum');
const nowTitle = document.getElementById('nowTitle');
const soundBtn = document.getElementById('soundBtn');
const toggleBtn = document.getElementById('toggleBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const closeBtn = document.getElementById('closeBtn');
const progress = document.getElementById('progress');
const IDS = TRACKS.map((t) => t.id);

let yt = null;          // YT.Player
let ytReady = false;    // la API ya respondió y sus métodos existen
let ytFailed = false;   // si la API no carga (bloqueadores, red), iframe simple
let closed = false;
let current = 0;
let muted = true;
let playing = false;

function setCurrent(i) {
  if (i == null || i < 0 || i >= TRACKS.length) return;
  current = i;
  nowNum.textContent = String(i + 1);
  nowTitle.textContent = TRACKS[i].title;
  trackBtns.forEach((b, j) => {
    b.parentElement.classList.toggle('playing', j === i);
    if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
}

function setMuted(m) {
  muted = m;
  soundBtn.hidden = !m;
}

function setPlaying(p) {
  playing = p;
  toggleBtn.classList.toggle('is-playing', p);
  toggleBtn.setAttribute('aria-label', p ? 'Pausar' : 'Reproducir');
}

function openPlayer() {
  closed = false;
  player.hidden = false;
  playBtn.hidden = true;
}

let ytApi = null;
function loadYouTubeApi() {
  if (ytApi) return ytApi;
  ytApi = new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('timeout')), 8000);
  });
  return ytApi;
}

// respaldo sin API: un iframe con la lista desde la canción i
function fallbackPlay(i, isMuted) {
  ytFailed = true;
  const rest = IDS.slice(i + 1).join(',');
  const params = `autoplay=1&playsinline=1&rel=0${rest ? `&playlist=${rest}` : ''}${isMuted ? '&mute=1' : ''}`;
  document.getElementById('ytmount').outerHTML =
    `<iframe id="ytmount" src="https://www.youtube-nocookie.com/embed/${IDS[i]}?${params}" title="Pink Moon — ${TRACKS[i].title}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  setCurrent(i);
  setMuted(isMuted);
  setPlaying(true);
  player.classList.add('basic'); // sin API no hay pausa/progreso fiables
}

function applyVolume() {
  if (muted) yt.mute(); else { yt.unMute(); yt.setVolume(100); }
}

function play(i, isMuted) {
  openPlayer();
  setCurrent(i);
  setMuted(isMuted);
  if (ytFailed) return fallbackPlay(i, isMuted);
  if (ytReady) {
    applyVolume();
    yt.loadPlaylist(IDS, i);
    return;
  }
  if (yt) return; // todavía cargando: onReady usará current/muted
  loadYouTubeApi().then((YT) => {
    if (yt || ytFailed) return;
    yt = new YT.Player('ytmount', {
      host: 'https://www.youtube-nocookie.com',
      width: '100%', height: '100%',
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
      events: {
        onReady: () => {
          if (ytFailed) return;
          ytReady = true;
          const iframe = yt.getIframe();
          if (iframe) iframe.title = 'Pink Moon — reproductor';
          if (closed) return;
          applyVolume();
          yt.loadPlaylist(IDS, current);
        },
        onStateChange: (e) => {
          if (ytFailed) return;
          const idx = yt.getPlaylistIndex();
          if (idx >= 0 && !closed) setCurrent(idx);
          setPlaying(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
          if (e.data === YT.PlayerState.PLAYING) setMuted(yt.isMuted());
        },
        onError: () => { if (current < IDS.length - 1) yt.nextVideo(); },
      },
    });
    // si el reproductor no responde a tiempo, pasamos al iframe simple
    setTimeout(() => { if (!ytReady && !closed) fallbackPlay(current, muted); }, 10000);
  }).catch(() => { if (!closed) fallbackPlay(current, muted); });
}

function unmute() {
  if (!ytReady || ytFailed) return play(current, false);
  setMuted(false);
  applyVolume();
  if (!playing) yt.playVideo();
}

function step(delta) {
  const i = Math.min(IDS.length - 1, Math.max(0, current + delta));
  if (ytReady && !ytFailed) {
    if (muted) { setMuted(false); applyVolume(); }
    if (delta > 0) yt.nextVideo(); else yt.previousVideo();
    setCurrent(i);
  } else {
    play(i, false);
  }
}

playBtn.addEventListener('click', () => play(0, false)); // gesto del usuario: con sonido
soundBtn.addEventListener('click', unmute);
toggleBtn.addEventListener('click', () => {
  if (!ytReady || ytFailed) return play(current, false);
  if (playing) yt.pauseVideo();
  else if (muted) unmute();
  else yt.playVideo();
});
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(1));
closeBtn.addEventListener('click', () => {
  closed = true;
  try {
    if (ytReady && !ytFailed) yt.stopVideo();
    else if (ytFailed) document.getElementById('ytmount').src = 'about:blank';
  } catch (_) { /* el reproductor se cierra igual */ }
  player.hidden = true;
  playBtn.hidden = false;
  setPlaying(false);
  trackBtns.forEach((b) => { b.parentElement.classList.remove('playing'); b.removeAttribute('aria-current'); });
  playBtn.focus();
});

trackBtns.forEach((b) => {
  b.addEventListener('click', () => play(Number(b.dataset.i), false)); // gesto del usuario: con sonido
});

// barra de progreso de la canción actual
setInterval(() => {
  if (!ytReady || ytFailed || player.hidden) return;
  const d = yt.getDuration(), c = yt.getCurrentTime();
  progress.style.transform = `scaleX(${d > 0 ? Math.min(c / d, 1) : 0})`;
}, 500);

// apenas se entra al sitio, arranca el álbum solo (silenciado, por las
// políticas de autoplay de los navegadores) tanto en desktop como en móvil
window.addEventListener('load', () => play(0, true));
