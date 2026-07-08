import * as THREE from './vendor/three.module.js';

// ============================================================
//  Pink Moon — escena viva basada en la portada del disco.
//  La portada fue separada en capas (fondo, luna, objetos)
//  y aquí se recompone con profundidad, parallax y deriva.
//  Los objetos se pueden arrastrar con el dedo o el mouse y
//  siguen flotando solos alrededor de donde los dejes.
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
const BG_W = 1760, BG_H = 1440; // fondo extendido para pantallas anchas/altas

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;
// en pantallas táctiles el movimiento autónomo es más notorio
const MOTION = reduceMotion ? 0.25 : (coarse ? 1.6 : 1);

// altura de viewport visible real (evita saltos al aparecer/ocultarse
// la barra de Safari en iOS, que dispara resize con valores intermedios)
const vv = window.visualViewport;

// offset (x,y desde arriba-izquierda de la portada), tamaño y profundidad z
const LAYERS = {
  bg:     { url: 'assets/bg.png',     x: (ART - BG_W) / 2, y: (ART - BG_H) / 2, w: BG_W, h: BG_H, z: -60 },
  sphere: { url: 'assets/sphere.png', x: 139, y: 107, w: 346, h: 438, z: -30, drag: true },
  shell:  { url: 'assets/shell.png',  x: 0,   y: 486, w: 104, h: 88,  z: -16, drag: true },
  leaf:   { url: 'assets/leaf.png',   x: 101, y: 61,  w: 173, h: 139, z: -12, drag: true },
  stamp:  { url: 'assets/stamp.png',  x: 245, y: 197, w: 115, h: 158, z: -10, drag: true },
  teacup: { url: 'assets/teacup.png', x: 60,  y: 184, w: 185, h: 164, z: -8,  drag: true },
  face:   { url: 'assets/face.png',   x: 406, y: 18,  w: 196, h: 298, z: -6,  drag: true },
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

const loader = new THREE.TextureLoader();
const sprites = {};
const draggables = [];

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
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: name !== 'bg' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), mat);
  const cx = wx(L.x + L.w / 2), cy = wy(L.y + L.h / 2);
  mesh.position.set(cx, cy, L.z);
  mesh.userData = { name, cx, cy, z: L.z };
  scene.add(mesh);
  sprites[name] = mesh;
  if (L.drag) draggables.push(mesh);
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

canvas.addEventListener('pointerdown', (e) => {
  const mesh = pick(e.clientX, e.clientY);
  setPointer(e.clientX, e.clientY);
  if (!mesh) return;
  e.preventDefault(); // evita que iOS interprete el toque como gesto/selección
  const w = pointerToWorld(e.clientX, e.clientY);
  dragging = {
    mesh,
    dx: w.x - mesh.userData.cx,
    dy: w.y - mesh.userData.cy,
  };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
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
    const { cx, cy, z } = mesh.userData;
    // capas más cercanas (z mayor) se desplazan más
    const depth = (z + 60) / 60; // 0 fondo … ~0.9 frente
    mesh.position.x = cx - eased.x * (4 + depth * 22) * M;
    mesh.position.y = cy + eased.y * (3 + depth * 16) * M;
  }

  const S = sprites;
  // la luna respira
  const sph = S.sphere;
  sph.scale.setScalar(1 + 0.007 * Math.sin(t * 0.5) * M);
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

  // halo pulsante
  glow.material.opacity = 0.55 + 0.3 * Math.sin(t * 0.4);
  glow.scale.setScalar(1 + 0.04 * Math.sin(t * 0.33));
  glow.position.x = sph.position.x;
  glow.position.y = sph.position.y + 25;

  starsMat.uniforms.uTime.value = t;
  firefliesMat.uniforms.uTime.value = t * 0.6;

  renderer.render(scene, camera);
}
animate();

// ---------- tracklist ----------
const tracksBtn = document.getElementById('tracksBtn');
const tracks = document.getElementById('tracks');
tracksBtn.addEventListener('click', () => {
  const open = tracks.hidden;
  tracks.hidden = !open;
  tracksBtn.setAttribute('aria-expanded', String(open));
});

// ---------- youtube: reproducir el álbum completo o una canción ----------
// Autoplay con sonido está bloqueado por los navegadores sin interacción
// previa, así que arrancamos silenciados apenas se entra al sitio y el
// mismo botón sirve para activar el sonido con un toque.
const playBtn = document.getElementById('playBtn');
const player = document.getElementById('player');
const trackItems = document.querySelectorAll('#tracks li');
let muted = true;

function showPlayer(src, isMuted) {
  const sep = src.includes('?') ? '&' : '?';
  const url = `${src}${sep}autoplay=1&playsinline=1${isMuted ? '&mute=1' : ''}`;
  player.innerHTML = `<iframe src="${url}" title="Pink Moon" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  player.hidden = false;
  muted = isMuted;
  playBtn.textContent = isMuted ? '🔊 activar sonido' : '✕ cerrar';
}

function closePlayer() {
  player.hidden = true;
  player.innerHTML = '';
  playBtn.textContent = '♪ escuchar el álbum';
  trackItems.forEach((li) => li.classList.remove('playing'));
}

function playAlbum(isMuted) {
  const rest = TRACKS.slice(1).map((t) => t.id).join(',');
  showPlayer(`https://www.youtube-nocookie.com/embed/${TRACKS[0].id}?playlist=${rest}`, isMuted);
  trackItems.forEach((li, i) => li.classList.toggle('playing', i === 0));
}

function playTrack(i, isMuted = false) {
  const track = TRACKS[i];
  showPlayer(`https://www.youtube-nocookie.com/embed/${track.id}`, isMuted);
  trackItems.forEach((li, j) => li.classList.toggle('playing', j === i));
}

playBtn.addEventListener('click', () => {
  if (player.hidden) {
    playAlbum(false); // gesto del usuario: se puede pedir con sonido
  } else if (muted) {
    // reintenta el mismo punto de la canción, ahora con sonido
    const active = document.querySelector('#tracks li.playing');
    const i = active ? [...trackItems].indexOf(active) : 0;
    i === 0 ? playAlbum(false) : playTrack(i, false);
  } else {
    closePlayer();
  }
});

trackItems.forEach((li, i) => {
  li.addEventListener('click', () => playTrack(i, false)); // gesto del usuario: con sonido
});

// apenas se entra al sitio, arranca el álbum solo (silenciado, por las
// políticas de autoplay de los navegadores) tanto en desktop como en móvil
window.addEventListener('load', () => playAlbum(true));
