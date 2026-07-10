import { ASSETS } from '../config';

/** Copre il sito finché GLB/HDR/texture (THREE) e i due video non sono
 *  scaricati: si apre solo a esperienza pronta, niente buffering a metà drag. */
export function LoadingScreen({ progress, fading }: { progress: number; fading: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black transition-opacity duration-500 ${fading ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <img src={ASSETS.fordLogo} alt="Ford" className="h-9 w-auto opacity-90" />

      <div className="flex w-56 flex-col items-center gap-3">
        <div className="h-px w-full overflow-hidden bg-white/15">
          <div
            className="h-full bg-amber-300 transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="font-mono2 text-[10px] uppercase tracking-[0.35em] text-white/50">
          Loading {progress}%
        </div>
      </div>
    </div>
  );
}
