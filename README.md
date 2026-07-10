# Mustang Fastback 1968 — Reveal (video → Three.js handoff)

Ricrea la transizione "video cinematico che diventa scena 3D interattiva":
il video AI gira fullscreen, dietro è già montata la scena R3F con la STESSA
posa di camera; alla fine il video dissolve sulla scena e prendi il controllo.
Stack: Vite + React 18 + TypeScript + Tailwind v4 + React Three Fiber + drei.

## Avvio
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Metti i tuoi asset (2 file)
Copia in `public/`:
- `ford_mustang_1968.glb`   → l'auto (auto-normalizzata: centrata, a terra, ~4.6m)
- `rooftop_night_2k.hdr`    → l'ambiente/luce

Senza di essi il progetto gira comunque: auto segnaposto + preset notturno.
Consigliato comprimere il GLB prima: `npx @gltf-transform/cli optimize in.glb out.glb --compress draco`

## Il flusso di lavoro per il video (si lavora AL CONTRARIO)
1. Sistema la scena finché la posa iniziale ti piace (la posa è in `src/config.ts` → HANDOFF).
2. Metti la finestra del browser a 16:9 e premi **Export handoff** (in alto a destra):
   scarica `handoff_frame.png` renderizzato dalla posa esatta.
3. Genera il video con Kling usando quel PNG come **end frame** (conditioning
   primo+ultimo frame): il video DEVE finire su quel fotogramma.
4. Salva il video come `public/intro_placeholder.mp4` (o cambia il path in
   `src/config.ts` → ASSETS.introVideo). Fine: la cucitura combacia per costruzione.

`intro_placeholder.mp4` incluso è un segnaposto di 3s per testare il flusso.

## Dettagli della cucitura
- Il crossfade parte ~150ms PRIMA della fine del video (`EARLY_S` in Intro.tsx):
  nasconde la piccola deriva finale tipica dei video AI.
- La scena è montata da subito dietro il video → shader compilati e GLB caricato
  durante l'intro, handoff istantaneo.
- Color match: se il grading del video non combacia, aggiusta
  `gl.toneMappingExposure` e le luci in `Scene.tsx` (è più facile adattare la
  scena al video che il contrario).
- `prefers-reduced-motion` o video mancante → si salta direttamente al 3D.

## Struttura
- `src/config.ts`           → HANDOFF (posa camera, fov, aspect), ORBIT, ASSETS
- `src/components/Scene.tsx`→ canvas, HDR/fallback, rig neon, ombre, orbita, exporter
- `src/components/Car.tsx`  → GLB auto-fit + segnaposto procedurale di fallback
- `src/components/Intro.tsx`→ video fullscreen, skip, crossfade anticipato
- `src/App.tsx`             → macchina a stati intro→interactive + UI Tailwind

Concept dimostrativo per portfolio. "Ford"/"Mustang" appartengono ai rispettivi
proprietari; usa modelli con licenza adeguata.


## Tuning posizione modello + look (src/config.ts)
Problemi tipici e dove si risolvono:

**Auto che fluttua** — molti GLB scaricati hanno geometrie vaganti sotto le
ruote (piani ombra, piedistalli): l'auto-ground si aggancia a quelle e solleva
l'auto. Apri la console: `Car.tsx` stampa una tabella con il `min.y` di ogni
mesh — se una è molto più bassa delle altre, o la nascondi
(`MODEL.hideNodes: ['nome']`, match parziale) o compensi con `MODEL.yOffset`
(negativo = abbassa).

**Orientamento / dimensione** — `MODEL.rotationY` (radianti) per il 3/4
anteriore, `MODEL.scaleMul` per micro-correzioni di scala.

**Ambiente scuro (reference)** — l'HDR ora fa SOLO luce/riflessi, non sfondo:
l'ambiente visibile è buio con nebbia (`MOOD.bg/fogNear/fogFar`) e pavimento
bagnato riflettente (MeshReflectorMaterial in `Scene.tsx`). Esposizione
generale: `MOOD.exposure`.

**Camera handoff** — `HANDOFF.cameraPosition/target/fov` (ricordati di
ri-esportare il frame se la cambi).


## Ambiente: HDRI + neon + asfalto (approccio R3F, niente Blender)
La scena della reference è ricostruita interamente in R3F:

- **HDRI** (`public/env.hdr`) → illumina la carrozzeria e le dà i riflessi, ma
  NON si vede: lo sfondo resta buio con nebbia. Scarica un HDRI di **interno**
  (garage, parking, warehouse, tunnel) da Poly Haven (CC0, gratis) — un HDRI
  reale ha il range dinamico vero, quelli generati da AI no.
  Per vedere l'HDRI in debug: `MOOD.showEnvBackground = true`.
  Senza il file, fallback automatico al preset "warehouse".
- **Neon** (`Neons.tsx`) → mesh emissive + rectAreaLight. Servono ENTRAMBE:
  un materiale emissivo in Three.js *non illumina* nulla. `toneMapped: false`
  e `emissiveIntensity > 1` sono ciò che innesca il Bloom.
- **Bloom** (`EffectComposer`) → è ciò che fa "bruciare" i neon. Tara
  `BLOOM.intensity` e `luminanceThreshold` in config.
- **Asfalto bagnato** (`Floor.tsx`) → `MeshReflectorMaterial` (deriva da
  MeshStandardMaterial) con map/normalMap/roughnessMap: riflesso reale
  dell'auto + dettaglio PBR. `FLOOR.mirror` ↑ e `roughness` ↓ = più bagnato.

### Texture
In `public/textures/` ci sono color/normal/roughness **derivate** dal
displacement ambientCG che hai caricato (convertite e ottimizzate: 3 MB → 750 KB).
Per la resa migliore scarica il **set completo** di
`CityStreetAsphaltGenericClean001` da ambientCG (Color, NormalGL, Roughness) e
sostituisci i file mantenendo i nomi.

### Ordine di taratura consigliato
1. `MOOD.envIntensity` — quanta luce dà l'HDRI (0 = solo neon)
2. `NEONS.emissiveIntensity` + `BLOOM.intensity` — il carattere
3. `FLOOR.mirror` / `FLOOR.roughness` — quanto è bagnato
4. `MOOD.fogNear/fogFar` — la profondità
