import { useEffect } from 'react';

const LINKS = [
  { label: 'Made by', name: 'Luigi Di Loreto', href: 'https://www.luigidiloreto.it/' },
  { label: 'Design inspiration', name: 'Anton Skvortsov', href: 'https://antonskvor.webflow.io/' },
  {
    label: 'Car model',
    name: 'jinjinjin',
    href: 'https://sketchfab.com/3d-models/ford-mustang-1968-5534e9b2d3ff48d3805694c508e680c7',
  },
];

export function CreditsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(90vw,380px)] rounded-2xl border border-white/15 bg-black/90 px-8 py-9 text-white shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-4 top-4 text-white/50 transition hover:text-amber-300"
        >
          ✕
        </button>

        <div className="font-mono2 mb-6 text-[10px] uppercase tracking-[0.3em] text-white/50">
          Credits
        </div>

        <ul className="flex flex-col gap-5">
          {LINKS.map((l) => (
            <li key={l.href}>
              <div className="font-mono2 text-[10px] uppercase tracking-[0.25em] text-white/40">
                {l.label}
              </div>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-xl tracking-wide transition hover:text-amber-300"
              >
                {l.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
