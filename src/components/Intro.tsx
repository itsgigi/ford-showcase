import { useEffect, useRef, useState } from 'react';
import { ASSETS, NEONS, VIDEO_LOOK } from '../config';
import { useAssetAvailable } from '../hooks/useAssetAvailable';
import type { NeonMode } from './Neons';

const EARLY_S = 0.15;    // parte ~150ms PRIMA della fine: nasconde la deriva
                          // finale tipica dei video AI (end-frame quasi esatto)
const BLACK_MS = 500;    // buio secco dopo il video: nasconde lo scarto di posa
const REVEAL_MS = 400;   // dissolvenza del nero mentre i neon iniziano ad accendersi
const IGNITE_MS = NEONS.igniteMs; // durata sfarfallio neon (sincronizzata con Neons.tsx)
const VIDEO_FILTER = `contrast(${VIDEO_LOOK.contrast}) brightness(${VIDEO_LOOK.brightness}) saturate(${VIDEO_LOOK.saturate})`;

type Props = { onDone: () => void; onNeon: (mode: NeonMode) => void };

/** Video intro fullscreen sopra la scena 3D (già montata dietro, neon spenti).
 *  Stacco alla fine (o su skip): buio secco → sfarfallio neon → controllo alla scena. */
const RING_TARGET_SWEEP_DEG = 90;  // un quarto di circonferenza di distanza dal punto di partenza
const RING_START_ANGLE_DEG = 15;   // 0°=ore 3, verso orario. Handle parte poco sotto l'orizzontale
const RING_R = 48;                 // raggio in unità viewBox 0..100 (centro 50,50)

export function Intro({ onDone, onNeon }: Props) {
  const videoOk = useAssetAvailable(ASSETS.revealVideo);
  const loopOk = useAssetAvailable(ASSETS.introLoopVideo);
  const loopRef = useRef<HTMLVideoElement>(null);
  const revealRef = useRef<HTMLVideoElement>(null);
  const [blacked, setBlacked] = useState(false);
  const [fading, setFading] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const done = useRef(false);

  // stacco completo: nero secco, poi sfarfallio neon mentre il nero si dissolve
  const finish = () => {
    if (done.current) return;
    done.current = true;
    setBlacked(true); // video sparisce sul colpo, resta il nero
    setTimeout(() => {
      setFading(true);
      onNeon('flicker');
    }, BLACK_MS);
    setTimeout(onDone, BLACK_MS + IGNITE_MS);
  };

  // niente video (file mancante) o reduced-motion → dritto al 3D, niente teatro
  const finishInstant = () => {
    if (done.current) return;
    done.current = true;
    onNeon('on');
    onDone();
  };

  useEffect(() => {
    if (videoOk === false) finishInstant();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishInstant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoOk]);

  // finish anticipato: parte EARLY_S prima della fine del video di reveal
  useEffect(() => {
    const v = revealRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration && v.currentTime >= v.duration - EARLY_S) finish();
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', finish);
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('ended', finish); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoOk]);

  // drag completato: stacca dal loop d'attesa e parte il video di reveal
  const startVideo = () => {
    if (videoStarted) return;
    setVideoStarted(true);
    loopRef.current?.pause();
    revealRef.current?.play().catch(() => {});
  };

  if (videoOk === null) return <div className="absolute inset-0 z-20 bg-black" />;
  if (videoOk === false) return null;

  return (
    <div
      className={`absolute inset-0 z-20 bg-black transition-opacity ease-out ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ transitionDuration: `${REVEAL_MS}ms` }}
    >
      {!blacked && (
        <video
          ref={revealRef}
          src={ASSETS.revealVideo}
          className={`h-full w-full object-cover ${videoStarted ? '' : 'hidden'}`}
          style={{ filter: VIDEO_FILTER }}
          muted
          playsInline
          preload="auto"
        />
      )}
      {!blacked && !videoStarted && loopOk !== false && (
        <video
          ref={loopRef}
          src={ASSETS.introLoopVideo}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: VIDEO_FILTER }}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />
      )}
      {!blacked && !videoStarted && <DragToStart onStart={startVideo} />}
    </div>
  );
}

function angleDeg(cx: number, cy: number, x: number, y: number) {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI; // 0°=ore 3, orario (y giù)
}
function shortestDelta(a: number, b: number) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}
function pointOnRing(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { left: 50 + RING_R * Math.cos(rad), top: 50 + RING_R * Math.sin(rad) };
}
/** Path SVG dell'arco tra due angoli, nel verso realmente percorso (delta
 *  con segno) — così l'arco segue esattamente dove va l'handle, non solo
 *  in un verso fisso come farebbe strokeDashoffset su un cerchio. */
function describeArc(fromDeg: number, toDeg: number) {
  const a = pointOnRing(fromDeg);
  const b = pointOnRing(toDeg);
  const delta = toDeg - fromDeg;
  const largeArc = Math.abs(delta) > 180 ? 1 : 0;
  const sweep = delta >= 0 ? 1 : 0;
  return `M ${a.left} ${a.top} A ${RING_R} ${RING_R} 0 ${largeArc} ${sweep} ${b.left} ${b.top}`;
}

const TRACK_ARC_START_DEG = 135; // il binario (traccia statica) copre solo 3/4 del cerchio
const TRACK_ARC_SPAN_DEG = 240;  // come reference: apertura di 90° in basso (gap 45°→135°)
const TRACK_ARC_D = describeArc(TRACK_ARC_START_DEG, TRACK_ARC_START_DEG + TRACK_ARC_SPAN_DEG);

/** Anello trascinabile intorno all'auto (come reference): l'handle segue il
 *  dito/mouse lungo la circonferenza e l'arco si disegna esattamente tra
 *  partenza e posizione attuale (stesso verso del drag). Superato 1/4 di
 *  giro dal punto di partenza parte il video; rilascio prima → torna a 0.
 *  Drag imperativo (no re-render per frame) per restare fluido; solo
 *  l'avvio tocca lo state React. */
function DragToStart({ onStart }: { onStart: () => void }) {
  const ringRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const dragging = useRef(false);
  const center = useRef({ x: 0, y: 0 });

  const setHandleAngle = (deg: number) => {
    const p = pointOnRing(deg);
    if (handleRef.current) {
      handleRef.current.style.left = `${p.left}%`;
      handleRef.current.style.top = `${p.top}%`;
    }
  };
  const setArc = (toDeg: number) => {
    if (arcRef.current) arcRef.current.setAttribute('d', describeArc(RING_START_ANGLE_DEG, toDeg));
  };
  const setSnapTransition = (on: boolean) => {
    if (handleRef.current) handleRef.current.style.transition = on ? 'left 250ms ease-out, top 250ms ease-out' : '';
  };

  const reset = () => {
    setSnapTransition(true);
    setHandleAngle(RING_START_ANGLE_DEG);
    setArc(RING_START_ANGLE_DEG);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const a = angleDeg(center.current.x, center.current.y, e.clientX, e.clientY);
    // solo antiorario: gradi crescenti (orario) vengono ignorati, l'handle
    // resta fermo sul punto di partenza finché non si trascina nel verso giusto
    const net = Math.min(0, shortestDelta(RING_START_ANGLE_DEG, a));
    setHandleAngle(RING_START_ANGLE_DEG + net);
    setArc(RING_START_ANGLE_DEG + net);
    if (Math.abs(net) >= RING_TARGET_SWEEP_DEG) {
      dragging.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      onStart();
    }
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    reset();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = ringRef.current!.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    dragging.current = true;
    setSnapTransition(false);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handlePos = pointOnRing(RING_START_ANGLE_DEG);

  return (
    <div
      ref={ringRef}
      className="pointer-events-none absolute left-1/2 top-[58%] z-30 -translate-x-[55%] -translate-y-1/2"
      style={{ width: '78vmin', height: '78vmin' }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible ">
        <path d={TRACK_ARC_D} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
        <path ref={arcRef} fill="none" stroke="#fbbf24" strokeWidth="0.9" strokeLinecap="round" />
      </svg>

      {/* caption fissa sotto l'anello, sempre centrata sulla SUA larghezza (mai
          sulla viewport): con l'handle vicino al bordo destro, una scritta
          agganciata a lui trabocca su qualunque finestra medio-stretta —
          font-size fluido via clamp così resta grande su desktop ampio senza
          mai tagliarsi su viewport più strette. */}
      <span
        className="font-mono2 ml-6 lg:ml-14 text-2xl lg:text-3xl absolute inset-x-0 -bottom-10 lg:bottom-10 whitespace-nowrap text-center uppercase text-white/85"
        style={{ letterSpacing: '0.35em' }}
      >
        Drag to reveal
      </span>

      <div
        ref={handleRef}
        onPointerDown={onPointerDown}
        style={{ left: `${handlePos.left}%`, top: `${handlePos.top}%` }}
        className="pointer-events-auto absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border border-amber-300/80 bg-black/60 backdrop-blur active:cursor-grabbing"
      />
    </div>
  );
}
