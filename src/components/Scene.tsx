import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ASSETS, BLOOM, HANDOFF, MOOD, PARALLAX } from '../config';
import { Car } from './Car';
import { Cloth } from './Cloth';
import { Floor } from './Floor';
import { Neons, type NeonMode } from './Neons';
import { Rain } from './Rain';
import { useAssetAvailable } from '../hooks/useAssetAvailable';

RectAreaLightUniformsLib.init();

/**
 * Il tunnel della reference, ricostruito in R3F.
 *
 * Ricetta:
 *  - HDRI (interno) → luce ambientale + riflessi sulla carrozzeria, MA non
 *    visibile come sfondo (l'ambiente resta buio + nebbia).
 *  - Neon emissivi → il carattere. Con Bloom bruciano come nella reference.
 *  - Asfalto bagnato riflettente → l'altra metà dell'atmosfera.
 *  - Taglio di luce caldo da destra → la profondità.
 */
export function Scene({ interactive, neonMode = 'on' }: { interactive: boolean; neonMode?: NeonMode }) {
  const hdrOk = useAssetAvailable(ASSETS.hdr);
  const carOk = useAssetAvailable(ASSETS.car);
  const clothOk = useAssetAvailable(ASSETS.cloth);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ position: HANDOFF.cameraPosition, fov: HANDOFF.fov }}
      onCreated={({ gl, camera, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = MOOD.exposure;
        scene.background = new THREE.Color(MOOD.bg);
        camera.lookAt(...HANDOFF.target);
        // pioggia su layer a parte: la vede solo la camera principale, non le
        // camere interne di reflector/contact-shadows (altrimenti sporcano i loro buffer)
        camera.layers.enable(1);
      }}
    >
      <fog attach="fog" args={[MOOD.bg, MOOD.fogNear, MOOD.fogFar]} />

      {/* HDRI: illumina e riflette. `background` solo per debug. */}
      {hdrOk === true && (
        <Environment
          files={ASSETS.hdr}
          environmentIntensity={MOOD.envIntensity}
          background={MOOD.showEnvBackground}
          backgroundBlurriness={0.5}
        />
      )}
      {hdrOk === false && (
        <Environment preset="warehouse" environmentIntensity={MOOD.envIntensity} />
      )}

      {/* i neon fanno il grosso; qui solo riempimenti */}
      <ambientLight intensity={0.06} />
      <Neons mode={neonMode} />
      {/* taglio caldo da destra, come l'apertura della reference */}
      <spotLight
        position={[8, 2.2, -1]}
        angle={0.75}
        penumbra={1}
        intensity={45}
        color="#c8a05e"
        distance={22}
      />
      {/* key fredda per staccare il tetto dell'auto dal fondo */}
      <directionalLight position={[-3, 6, 3]} intensity={0.5} color="#cfe0ff" castShadow shadow-mapSize={[2048, 2048]} />

      <Car available={carOk} />
      <Cloth available={clothOk} />
      <Floor />
      <Rain />
      <ContactShadows position={[0, 0.004, 0]} opacity={1} blur={1.3} scale={10} far={10} resolution={1024} />

      <CameraParallax enabled={interactive} />

      <EffectComposer>
        <Bloom
          intensity={BLOOM.intensity}
          luminanceThreshold={BLOOM.luminanceThreshold}
          luminanceSmoothing={BLOOM.luminanceSmoothing}
          mipmapBlur={BLOOM.mipmapBlur}
        />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}

/**
 * Niente drag/zoom: la camera resta ferma sulla posa di HANDOFF ma "respira"
 * verso il cursore — offset morbido, non un vero orbit.
 */
function CameraParallax({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;
    current.current.x += (mouse.current.x - current.current.x) * PARALLAX.ease;
    current.current.y += (mouse.current.y - current.current.y) * PARALLAX.ease;
    camera.position.set(
      HANDOFF.cameraPosition[0] + current.current.x * PARALLAX.strengthX,
      HANDOFF.cameraPosition[1] - current.current.y * PARALLAX.strengthY,
      HANDOFF.cameraPosition[2],
    );
    camera.lookAt(...HANDOFF.target);
  });

  return null;
}
