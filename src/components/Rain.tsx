import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RAIN } from '../config';

/**
 * Pioggia — Points (particelle), non mesh: leggera, migliaia di goccie a costo minimo.
 * Ogni goccia è uno sprite con texture a striscia verticale (streak), non un
 * pallino: da qui l'effetto "riga" della reference invece che neve.
 * Caduta dritta con leggero drift orizzontale (vento); quando esce dal
 * pavimento riparte dall'alto in una x/z nuova (loop infinito, no GC).
 */
export function Rain() {
  const points = useRef<THREE.Points>(null);
  const speeds = useRef<Float32Array>(null!);

  // layer 1: fuori dalla vista delle camere interne di reflector/contact-shadows
  useEffect(() => {
    points.current?.layers.set(1);
  }, []);

  const [geometry, material] = useMemo(() => {
    const { count, area, height } = RAIN;
    const positions = new Float32Array(count * 3);
    speeds.current = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * area;
      positions[i * 3 + 1] = Math.random() * height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * area;
      speeds.current[i] = 0.6 + Math.random() * 0.8; // variazione naturale
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // texture generata: striscia verticale sfumata, non un pallino
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const halfW = canvas.width / 2;
    const lineHalfH = (canvas.height / 2) * RAIN.length;
    const grad = ctx.createLinearGradient(0, halfW - lineHalfH, 0, halfW + lineHalfH);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const map = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      map,
      color: RAIN.color,
      size: RAIN.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: RAIN.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return [geo, mat];
  }, []);

  useFrame((_, delta) => {
    const geo = points.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geo) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const { area, height, fallSpeed, windX } = RAIN;

    for (let i = 0; i < arr.length / 3; i++) {
      const iy = i * 3 + 1;
      arr[iy] -= fallSpeed * speeds.current[i] * delta;
      arr[iy - 1] += windX * delta; // drift x

      if (arr[iy] < 0) {
        arr[iy] = height;
        arr[iy - 1] = (Math.random() - 0.5) * area;
        arr[iy + 1] = (Math.random() - 0.5) * area;
      }
    }
    pos.needsUpdate = true;
  });

  return <points ref={points} geometry={geometry} material={material} />;
}
