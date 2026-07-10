import { Suspense, Component, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS, CAR_MATERIAL, MODEL } from '../config';

/**
 * <Car/> — carica ford_mustang_1968.glb se presente, altrimenti segnaposto.
 * Normalizzazione robusta:
 *  - misura il bbox SOLO delle mesh visibili (dopo aver nascosto MODEL.hideNodes)
 *  - centra, appoggia a terra, scala a ~4.6m
 *  - applica MODEL.yOffset / rotationY / scaleMul dal config
 *  - logga in console il min.y per-mesh per scovare geometrie vaganti che
 *    fanno "fluttuare" l'auto (piani ombra, piedistalli nel GLB)
 */
export function Car({ available }: { available: boolean | null }) {
  if (available === null) return null;
  if (!available) return <PlaceholderCar />;
  return (
    <CarErrorBoundary fallback={<PlaceholderCar />}>
      <Suspense fallback={<PlaceholderCar ghost />}>
        <GltfCar />
      </Suspense>
    </CarErrorBoundary>
  );
}

/** Alza il contrasto di un materiale del GLB: highlight più netti, neri più profondi, colori meno lavati. */
function boostContrast(mat: THREE.Material): THREE.Material {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
  mat.roughness = THREE.MathUtils.clamp(mat.roughness * CAR_MATERIAL.roughnessMul, 0, 1);
  mat.envMapIntensity = (mat.envMapIntensity ?? 1) * CAR_MATERIAL.envMapIntensityMul;
  const hsl = { h: 0, s: 0, l: 0 };
  mat.color.getHSL(hsl);
  mat.color.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s * CAR_MATERIAL.saturationBoost, 0, 1), hsl.l);
  return mat;
}

function GltfCar() {
  const { scene } = useGLTF(ASSETS.car);

  // normalizza UNA volta per scena caricata (clone per non mutare la cache)
  const prepared = useMemo(() => {
    const root = scene.clone(true);

    // nascondi nodi indesiderati (match parziale sul nome, case-insensitive)
    const hide = MODEL.hideNodes.map((n) => n.toLowerCase());
    root.traverse((o) => {
      const name = o.name.toLowerCase();
      if (hide.some((h) => name.includes(h))) o.visible = false;
    });

    // debug: min.y per mesh, per individuare geometrie sotto le ruote
    const rows: { name: string; minY: string; maxY: string }[] = [];
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.visible) {
        const b = new THREE.Box3().setFromObject(m);
        rows.push({ name: m.name || '(senza nome)', minY: b.min.y.toFixed(3), maxY: b.max.y.toFixed(3) });
        m.castShadow = true;
        m.receiveShadow = true;

        // clona (la cache di useGLTF è condivisa tra mount) + contrasto su
        m.material = Array.isArray(m.material)
          ? m.material.map((mm) => boostContrast(mm.clone()))
          : boostContrast(m.material.clone());
      }
    });
    rows.sort((a, b) => parseFloat(a.minY) - parseFloat(b.minY));
    // eslint-disable-next-line no-console
    console.table(rows.slice(0, 12));
    // eslint-disable-next-line no-console
    console.info('[Car] mesh più basse ↑ — se una è molto sotto le altre, aggiungila a MODEL.hideNodes o compensa con MODEL.yOffset');

    // bbox solo di ciò che è visibile
    const box = new THREE.Box3();
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.visible) box.expandByObject(m);
    });
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetLength = 4.6;
    const s = (targetLength / Math.max(size.x, size.z)) * MODEL.scaleMul;

    const group = new THREE.Group();
    group.add(root);
    root.position.set(-center.x, -box.min.y, -center.z);
    group.scale.setScalar(s);
    group.rotation.y = MODEL.rotationY;
    group.position.y = MODEL.yOffset;
    return group;
  }, [scene]);

  return <primitive object={prepared} />;
}

/** Segnaposto: silhouette fastback stilizzata, per lavorare senza il GLB. */
function PlaceholderCar({ ghost = false }: { ghost?: boolean }) {
  const body = new THREE.MeshStandardMaterial({
    color: '#151312', metalness: 0.9, roughness: 0.32,
    transparent: ghost, opacity: ghost ? 0.35 : 1,
  });
  const trim = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 1, roughness: 0.25 });
  const glassM = new THREE.MeshStandardMaterial({ color: '#0a0f14', metalness: 1, roughness: 0.08 });
  const tire = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.9 });

  const wheel = (x: number, z: number) => (
    <group position={[x, 0.34, z]} rotation={[0, 0, Math.PI / 2]} key={`${x}${z}`}>
      <mesh material={tire} castShadow><cylinderGeometry args={[0.34, 0.34, 0.26, 24]} /></mesh>
      <mesh material={trim}><cylinderGeometry args={[0.14, 0.14, 0.27, 16]} /></mesh>
    </group>
  );

  return (
    <group rotation={[0, MODEL.rotationY, 0]}>
      <mesh material={body} position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[4.5, 0.55, 1.8]} />
      </mesh>
      <mesh material={glassM} position={[-0.35, 0.95, 0]} rotation={[0, 0, -0.09]} castShadow>
        <boxGeometry args={[2.1, 0.5, 1.55]} />
      </mesh>
      <mesh material={body} position={[1.85, 0.62, 0]} castShadow>
        <boxGeometry args={[0.9, 0.32, 1.7]} />
      </mesh>
      <mesh material={trim} position={[0, 0.36, 0.905]}>
        <boxGeometry args={[4.2, 0.06, 0.01]} />
      </mesh>
      <mesh material={trim} position={[0, 0.36, -0.905]}>
        <boxGeometry args={[4.2, 0.06, 0.01]} />
      </mesh>
      {wheel(1.55, 0.85)}{wheel(1.55, -0.85)}{wheel(-1.5, 0.85)}{wheel(-1.5, -0.85)}
    </group>
  );
}

class CarErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

useGLTF.preload(ASSETS.car);
