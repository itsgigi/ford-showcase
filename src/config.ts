// ---------------------------------------------------------------------------
// HANDOFF — unica fonte di verità per la "cucitura" video → 3D.
// Se cambi la posa, ri-esporta il frame di handoff e rigenera il video.
// ---------------------------------------------------------------------------
export const HANDOFF = {
  cameraPosition: [-2, 1.25, 12.6] as [number, number, number],
  target: [0, 0.95, 0] as [number, number, number],  // alzato: fa entrare i neon in quadro
  fov: 32,
  videoAspect: 16 / 9,
};

// ---------------------------------------------------------------------------
// PARALLAX — niente drag/zoom: la camera segue leggermente il cursore.
// strength = quanto si sposta la camera (world units); ease = 0..1, quanto
// insegue morbido il target (più basso = più "lag").
// ---------------------------------------------------------------------------
export const PARALLAX = {
  strengthX: 0.5,
  strengthY: 0.25,
  ease: 0.06,
};

// ---------------------------------------------------------------------------
// MODELLO — se l'auto "fluttua", il GLB ha geometrie vaganti sotto le ruote.
// La console stampa il min.y di ogni mesh: nascondile o compensa con yOffset.
// ---------------------------------------------------------------------------
export const MODEL = {
  yOffset: -1.075,
  rotationY: 0.85 + Math.PI,
  scaleMul: 1,
  hideNodes: [] as string[],
};

// ---------------------------------------------------------------------------
// CAR_MATERIAL — contrasto dei materiali originali del GLB.
// roughnessMul <1 = più lucido → highlight più netti (più contrasto).
// envMapIntensityMul > 1 = riflessi HDRI più marcati (neri più profondi).
// saturationBoost > 1 = colori meno "lavati".
// ---------------------------------------------------------------------------
export const CAR_MATERIAL = {
  roughnessMul: 0.7,
  envMapIntensityMul: 1.5,
  saturationBoost: 1.2,
};

// ---------------------------------------------------------------------------
// MOOD — l'ambiente scuro della reference.
// L'HDRI illumina e riflette, ma NON si vede: lo sfondo è nebbia scura.
// ---------------------------------------------------------------------------
export const MOOD = {
  bg: '#0a0908',
  fogNear: 8,
  fogFar: 30,
  exposure: 1.0,
  envIntensity: 0.55,   // quanto l'HDRI illumina (0 = solo neon)
  showEnvBackground: false, // true per DEBUG: vedi l'HDRI dietro
};

// ---------------------------------------------------------------------------
// PAVIMENTO — il riflesso bagnato è metà dell'atmosfera.
// mirror ↑ e roughness ↓ = più specchio (più bagnato).
// ---------------------------------------------------------------------------
export const FLOOR = {
  repeat: 14,
  normalScale: 0.55,
  metalness: 0.42,
  roughness: 0.42,
  mirror: 0.62,
  reflectionStrength: 2.2,
};

// ---------------------------------------------------------------------------
// NEON — mesh emissiva (si vede, fa bloom) + rectAreaLight (illumina davvero).
// I tubi devono stare sotto z≈3.0 per restare nell'inquadratura.
// ---------------------------------------------------------------------------
export const NEONS = {
  color: '#eaf2ff',
  emissiveIntensity: 4.2,   // >1 innesca il bloom
  lightIntensity: 7,
  radius: 0.035,
  igniteMs: 1000,           // durata dello sfarfallio di accensione (stacco video→3D)
  tubes: [
    { pos: [-0.6, 2.85, 0.4] as [number, number, number], len: 7.5, rotY: 0.18, tilt: 0.04 },
    { pos: [0.9, 2.95, -0.9] as [number, number, number], len: 6.8, rotY: -0.62, tilt: -0.05 },
    { pos: [-1.2, 2.7, -1.8] as [number, number, number], len: 6.2, rotY: 1.05, tilt: 0.03 },
    { pos: [1.6, 2.78, 1.1] as [number, number, number], len: 5.6, rotY: -1.22, tilt: 0.06 },
    { pos: [0.1, 2.9, -2.6] as [number, number, number], len: 7.0, rotY: 0.42, tilt: -0.03 },
  ],
};

// ---------------------------------------------------------------------------
// RIGGING — staffe + cavi che appendono i neon al soffitto (fuori campo).
// Ogni tubo ha 2 attacchi (un'estremità per lato) → 1 staffa + 1 cavo ciascuno.
// ---------------------------------------------------------------------------
export const RIGGING = {
  ceilingY: 9.5,          // dove "spariscono" i cavi (fog/vignette li copre)
  cableColor: '#0d0e10',
  cableRadius: 0.014,
  bracketColor: '#1c1d20',
  bracketMetalness: 0.85,
  bracketRoughness: 0.35,
  bracketRadius: 0.075,
  bracketLen: 0.16,
};

// ---------------------------------------------------------------------------
// BLOOM — è quello che fa "bruciare" i neon come nella reference.
// ---------------------------------------------------------------------------
export const BLOOM = {
  intensity: 0.85,
  luminanceThreshold: 1.0,  // sopra 1 = solo ciò che è più luminoso del bianco
  luminanceSmoothing: 0.3,
  mipmapBlur: true,
};

// ---------------------------------------------------------------------------
// RAIN — pioggia della reference, fatta con Points (particelle).
// area = larghezza/profondità del volume che ricade; height = da dove parte.
// ---------------------------------------------------------------------------
export const RAIN = {
  count: 1000,
  area: 22,
  height: 24,
  fallSpeed: 5,
  windX: 0.4,
  length: 5,   // stretch verticale della streak (0 = goccia tonda)
  size: 0.03,
  opacity: 0.22,
  color: '#cfe0ff',
};

// ---------------------------------------------------------------------------
// CLOTH — telo spiegazzato a terra a lato dell'auto (segnaposto per dopo).
// ---------------------------------------------------------------------------
export const CLOTH = {
  position: [3.3, 0, -1.5] as [number, number, number],
  rotationY: 0.4,
  scale: 4,
};

// ---------------------------------------------------------------------------
// VIDEO_LOOK — color grading via CSS filter sui video dell'intro (loop +
// reveal). Applicato lato client: non tocca i file sorgente.
// ---------------------------------------------------------------------------
export const VIDEO_LOOK = {
  contrast: 1.02,
  brightness: 1,
  saturate: 1,
};

export const ASSETS = {
  fordLogo: `${import.meta.env.BASE_URL}images/Ford_logo_flat.svg`,
  car: `${import.meta.env.BASE_URL}ford_mustang_1968.glb`,
  // HDRI di un INTERNO (garage/parking/warehouse). Poly Haven, CC0.
  hdr: `${import.meta.env.BASE_URL}env.hdr`,
  introLoopVideo: `${import.meta.env.BASE_URL}intro.mp4`,  // loop d'attesa prima del drag
  revealVideo: `${import.meta.env.BASE_URL}reveal.mp4`,     // parte al drag, finisce sulla posa di HANDOFF
  cloth: `${import.meta.env.BASE_URL}wrinkled_fabric_cloth.glb`,
};
