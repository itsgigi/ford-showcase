import { useTexture, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';
import { FLOOR } from '../config';

const T = `${import.meta.env.BASE_URL}textures/`;

/**
 * Asfalto bagnato.
 * MeshReflectorMaterial deriva da MeshStandardMaterial → accetta map/normalMap/
 * roughnessMap. Così abbiamo IL RIFLESSO REALE dell'auto (che una texture non
 * può dare) + il dettaglio PBR della superficie.
 *
 * Le mappe sono derivate dal displacement ambientCG. Per il set completo
 * (Color/NormalGL/Roughness veri) scarica da ambientCG e sostituisci i file
 * in public/textures/ mantenendo i nomi.
 */
export function Floor() {
  const [color, normal, rough] = useTexture([
    `${T}asphalt_color.webp`,
    `${T}asphalt_normal.webp`,
    `${T}asphalt_rough.webp`,
  ]);

  useMemo(() => {
    for (const t of [color, normal, rough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(FLOOR.repeat, FLOOR.repeat);
      t.anisotropy = 8;
    }
    color.colorSpace = THREE.SRGBColorSpace; // solo la color map è sRGB
  }, [color, normal, rough]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[70, 70]} />
      <MeshReflectorMaterial
        map={color}
        normalMap={normal}
        roughnessMap={rough}
        normalScale={new THREE.Vector2(FLOOR.normalScale, FLOOR.normalScale)}
        color="#ffffff"
        metalness={FLOOR.metalness}
        roughness={FLOOR.roughness}
        /* la "bagnatura": più mirror + meno roughness = più specchio */
        mirror={FLOOR.mirror}
        blur={[400, 120]}
        mixBlur={1.1}
        mixStrength={FLOOR.reflectionStrength}
        resolution={640}
        depthScale={0.7}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.3}
        depthToBlurRatioBias={0.25}
      />
    </mesh>
  );
}

useTexture.preload([`${T}asphalt_color.webp`, `${T}asphalt_normal.webp`, `${T}asphalt_rough.webp`]);
