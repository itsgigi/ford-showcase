import { useState } from 'react';
import { Scene } from './components/Scene';
import { Intro } from './components/Intro';
import { CreditsModal } from './components/CreditsModal';
import type { NeonMode } from './components/Neons';
import { ASSETS } from './config';

export default function App() {
  const [phase, setPhase] = useState<'intro' | 'interactive'>('intro');
  const [neonMode, setNeonMode] = useState<NeonMode>('off');
  const [creditsOpen, setCreditsOpen] = useState(false);
  const interactive = phase === 'interactive';

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white">
      {/* la scena è SEMPRE montata: compila shader e carica il GLB durante l'intro */}
      <div className="absolute inset-0 z-10">
        <Scene interactive={interactive} neonMode={neonMode} />
      </div>

      {phase === 'intro' && (
        <Intro onDone={() => setPhase('interactive')} onNeon={setNeonMode} />
      )}

      {/* ------- UI overlay ------- */}
      <header
        className={`pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between border-y border-white/15 m-6 px-6 py-3 transition-opacity duration-700 md:mx-10 md:px-10 ${interactive ? 'opacity-100' : 'opacity-0'}`}
      >
        <img src={ASSETS.fordLogo} alt="Ford" className="h-7 w-auto" />
        <div className="font-mono2 text-[10px] uppercase tracking-[0.3em] text-white/60">
          Rediscover the Classics
        </div>
        <button
          onClick={() => setCreditsOpen(true)}
          className={`font-mono2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 backdrop-blur transition hover:border-amber-300 hover:text-amber-300 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          CREDITS
        </button>
      </header>

      {creditsOpen && <CreditsModal onClose={() => setCreditsOpen(false)} />}

      <div
        aria-hidden
        className={`pointer-events-none absolute bottom-0 right-2 z-20 select-none font-display text-[24vw] font-bold leading-none text-white/[0.07] transition-opacity duration-700 md:right-8 md:text-[15rem] ${interactive ? 'opacity-100' : 'opacity-0'}`}
      >
        1968
      </div>

      <footer
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between px-6 pb-6 md:px-10 md:pb-8 transition-opacity duration-700 ${interactive ? 'opacity-100' : 'opacity-0'}`}
      >
        <div>
          <h1 className="font-display text-5xl leading-none lg:text-7xl">
            MUSTANG<br /> FASTBACK
          </h1>
          <p className="font-mono2 mt-3 text-2xl lg:text-3xl uppercase tracking-widest text-amber-300/90">
            Looks <i>fast</i> <br /> standing still
          </p>
        </div>
      </footer>
    </div>
  );
}
