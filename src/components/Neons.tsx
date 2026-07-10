import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NEONS, RIGGING } from '../config';

export type NeonMode = 'off' | 'flicker' | 'on';

/**
 * I neon incrociati sopra l'auto — il carattere della scena.
 *
 * Due parti, entrambe necessarie:
 *  1. la MESH emissiva → è ciò che si VEDE (e che il Bloom fa bruciare)
 *  2. una rectAreaLight per tubo → è ciò che ILLUMINA davvero la carrozzeria
 * Un materiale emissivo, da solo, in Three.js NON illumina nulla.
 *
 * Ogni tubo appende anche una staffa + un cavo per estremità, verso l'alto:
 * l'aggancio "fisico" al soffitto della reference (che va fuori campo, coperto
 * da fog/vignette — non serve modellare un vero soffitto).
 *
 * `mode` guida l'accensione per lo stacco video→3D: 'off' = spenti (dietro il
 * nero), 'flicker' = sfarfallio che si stabilizza in NEONS.igniteMs, 'on' =
 * pieni da subito (skip/reduced-motion, niente animazione).
 */
export function Neons({ mode = 'on' }: { mode?: NeonMode }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#000000',
        emissive: new THREE.Color(NEONS.color),
        // >1 fa "bruciare" il tubo: è ciò che innesca il bloom
        emissiveIntensity: mode === 'off' ? 0 : NEONS.emissiveIntensity,
        toneMapped: false, // fondamentale: senza questo il tone mapping lo spegne
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const lightRefs = useRef<(THREE.RectAreaLight | null)[]>([]);
  // sfarfallio: parte solo su off→flicker, ignora eventuali re-render dello stesso mode
  const anim = useRef({ active: false, start: null as number | null, settled: mode !== 'flicker' });

  useEffect(() => {
    if (mode === 'off') {
      anim.current = { active: false, start: null, settled: false };
      mat.emissiveIntensity = 0;
      lightRefs.current.forEach((l) => l && (l.intensity = 0));
    } else if (mode === 'on') {
      anim.current = { active: false, start: null, settled: true };
      mat.emissiveIntensity = NEONS.emissiveIntensity;
      lightRefs.current.forEach((l) => l && (l.intensity = NEONS.lightIntensity));
    } else if (mode === 'flicker' && !anim.current.active) {
      anim.current = { active: true, start: null, settled: false };
    }
  }, [mode, mat]);

  useFrame((state) => {
    if (mode !== 'flicker' || anim.current.settled) return;
    if (anim.current.start === null) anim.current.start = state.clock.elapsedTime;
    const dur = NEONS.igniteMs / 1000;
    const elapsed = state.clock.elapsedTime - anim.current.start;

    if (elapsed >= dur) {
      anim.current.settled = true;
      mat.emissiveIntensity = NEONS.emissiveIntensity;
      lightRefs.current.forEach((l) => l && (l.intensity = NEONS.lightIntensity));
      return;
    }

    // probabilità di un "buco" di luce che decresce verso 0 avvicinandosi alla fine
    const p = elapsed / dur;
    const flickerChance = 0.35 * (1 - p);
    const spike = Math.random() < flickerChance ? 0.15 + Math.random() * 0.5 : 1;
    const factor = THREE.MathUtils.lerp(spike, 1, p * p); // bias verso stabile sul finale

    mat.emissiveIntensity = NEONS.emissiveIntensity * factor;
    lightRefs.current.forEach((l) => l && (l.intensity = NEONS.lightIntensity * factor));
  });

  const cableMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: RIGGING.cableColor, roughness: 0.5, metalness: 0.6 }),
    [],
  );
  const bracketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: RIGGING.bracketColor,
        roughness: RIGGING.bracketRoughness,
        metalness: RIGGING.bracketMetalness,
      }),
    [],
  );

  // per ogni tubo, le due estremità in world space → lì appendiamo staffa + cavo
  const rigs = useMemo(() => {
    const out: { bracketPos: THREE.Vector3; bracketRot: [number, number, number]; cablePos: THREE.Vector3; cableHeight: number }[] = [];
    for (const t of NEONS.tubes) {
      const euler = new THREE.Euler(0, t.rotY, t.tilt);
      for (const sign of [1, -1]) {
        const end = new THREE.Vector3(sign * (t.len / 2), 0, 0)
          .applyEuler(euler)
          .add(new THREE.Vector3(...t.pos));
        out.push({
          bracketPos: end,
          bracketRot: [0, t.rotY, t.tilt],
          cablePos: new THREE.Vector3(end.x, (end.y + RIGGING.ceilingY) / 2, end.z),
          cableHeight: RIGGING.ceilingY - end.y,
        });
      }
    }
    return out;
  }, []);

  return (
    <group>
      {NEONS.tubes.map((t, i) => (
        <group key={i} position={t.pos} rotation={[0, t.rotY, t.tilt]}>
          {/* tubo visibile */}
          <mesh material={mat} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[NEONS.radius, NEONS.radius, t.len, 12]} />
          </mesh>
          {/* la luce vera che scende sull'auto */}
          <rectAreaLight
            ref={(el) => { lightRefs.current[i] = el; }}
            width={t.len}
            height={NEONS.radius * 4}
            intensity={mode === 'off' ? 0 : NEONS.lightIntensity}
            color={NEONS.color}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </group>
      ))}

      {/* staffe + cavi verso il soffitto */}
      {rigs.map((r, i) => (
        <group key={i}>
          <mesh material={bracketMat} position={r.bracketPos} rotation={r.bracketRot}>
            <cylinderGeometry args={[RIGGING.bracketRadius, RIGGING.bracketRadius, RIGGING.bracketLen, 10]} />
          </mesh>
          <mesh material={cableMat} position={r.cablePos}>
            <cylinderGeometry args={[RIGGING.cableRadius, RIGGING.cableRadius, r.cableHeight, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
