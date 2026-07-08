import * as THREE from './vendor/three.module.js';

// ============================================================
//  Pink Moon — escena viva basada en la portada del disco.
//  La portada fue separada en capas (fondo, luna, objetos)
//  y aquí se recompone con profundidad, parallax y deriva.
// ============================================================

// Más adelante: pega aquí el ID de un video/playlist de YouTube
// con el álbum completo y aparecerá el botón "escuchar el álbum".
const YOUTUBE_VIDEO_ID = '';

const ART = 640; // la portada vive en un espacio de 640x640 (y hacia abajo)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOTION = reduceMotion ? 0.25 : 1;

// offset (x,y desde arriba-izquierda de la portada), tamaño y profundidad z
// el fondo es una versión extendida a 1600px para pantallas anchas
const BG_W = 1600;
const LAYERS = {
  bg:     { url: 'assets/bg.png',     x: (ART - BG_W) / 2, y: 0, w: BG_W, h: ART, z: -60, scale: 1.04 },
  sphere: { url: 'assets/sphere.png', x: 139, y: 107, w: 346, h: 438, z: -30 },
  shell:  { url: 'assets/shell.png',  x: 0,   y: 486, w: 104, h: 88,  z: -16 },
  leaf:   { url: 'assets/leaf.png',   x: 101, y: 61,  w: 173, h: 139, z: -12 },
  stamp:  { url: 'assets/stamp.png',  x: 245, y: 197, w: 115, h: 158, z: -10 },
  teacup: { url: 'assets/teacup.png', x: 60,  y: 184, w: 185, h: 164, z: -8  },
  face:   { url: 'assets/face.png',   x: 412, y: 26,  w: 166, h: 286, z: -6  },
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
  const vw = window.innerWidth, vh = window.innerHeight;
  renderer.setSize(vw, vh);
  // la composición completa cabe en alto; el fondo extendido cubre los lados
  const s = Math.max(vh / ART, vw / BG_W);
  const halfW = vw / s / 2, halfH = vh / s / 2;
  camera.left = -halfW; camera.right = halfW;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// coordenadas de portada (y hacia abajo) -> mundo (origen al centro, y hacia arriba)
const wx = (x) => x - ART / 2;
const wy = (y) => ART / 2 - y;

const loader = new THREE.TextureLoader();
const sprites = {};

for (const [name, L] of Object.entries(LAYERS)) {
  const tex = loader.load(L.url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: name !== 'bg' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), mat);
  const cx = wx(L.x + L.w / 2), cy = wy(L.y + L.h / 2);
  mesh.position.set(cx, cy, L.z);
  if (L.scale) mesh.scale.setScalar(L.scale);
  mesh.userData = { cx, cy, z: L.z, baseScale: L.scale || 1 };
  scene.add(mesh);
  sprites[name] = mesh;
}

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

const starsMat = makePoints(70, { x0: 10, x1: 630, y0: 8, y1: 210, z: -55 }, 2.6, '#cfe0ea');
const firefliesMat = makePoints(22, { x0: 20, x1: 620, y0: 400, y1: 620, z: -14 }, 3.4, '#ffd9a0');

// ---------- parallax con mouse / giroscopio ----------
const pointer = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});
window.addEventListener('deviceorientation', (e) => {
  if (e.gamma == null) return;
  pointer.x = THREE.MathUtils.clamp(e.gamma / 25, -1, 1);
  pointer.y = THREE.MathUtils.clamp((e.beta - 45) / 25, -1, 1);
});

// ---------- animación ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const M = MOTION;

  eased.x += (pointer.x - eased.x) * 0.04;
  eased.y += (pointer.y - eased.y) * 0.04;

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

// ---------- youtube (se activa cuando haya un ID) ----------
const playBtn = document.getElementById('playBtn');
const player = document.getElementById('player');
if (YOUTUBE_VIDEO_ID) {
  playBtn.hidden = false;
  playBtn.addEventListener('click', () => {
    if (player.hidden) {
      player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1" title="Pink Moon" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      player.hidden = false;
      playBtn.textContent = '✕ cerrar';
    } else {
      player.hidden = true;
      player.innerHTML = '';
      playBtn.textContent = '♪ escuchar el álbum';
    }
  });
}
