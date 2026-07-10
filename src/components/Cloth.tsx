import { Suspense, Component, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS, CLOTH } from '../config';

/**
 * <Cloth/> — telo spiegazzato a terra a lato dell'auto (wrinkled_fabric_cloth.glb).
 * Solo appoggiato a terra (min.y → 0) + posa da CLOTH; nessun uso ancora,
 * verrà rifinito quando serve davvero nella scena.
 */
export function Cloth({ available }: { available: boolean | null }) {
  if (!available) return null;
  return (
    <ClothErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <GltfCloth />
      </Suspense>
    </ClothErrorBoundary>
  );
}

function GltfCloth() {
  const { scene } = useGLTF(ASSETS.cloth);

  const prepared = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(root);
    root.position.y -= box.min.y; // appoggia a terra

    const group = new THREE.Group();
    group.add(root);
    group.position.set(...CLOTH.position);
    group.rotation.y = CLOTH.rotationY;
    group.scale.setScalar(CLOTH.scale);
    return group;
  }, [scene]);

  return <primitive object={prepared} />;
}

class ClothErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

useGLTF.preload(ASSETS.cloth);
