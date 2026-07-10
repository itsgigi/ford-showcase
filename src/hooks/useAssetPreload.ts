import { useEffect, useState } from 'react';

/**
 * Precarica una lista di file (video, in pratica) leggendo lo stream a mano
 * per avere un progresso byte-accurato — GLTFLoader/RGBELoader/TextureLoader
 * passano invece da useProgress (drei), che traccia il THREE.LoadingManager.
 * Nota: la seconda richiesta (quando <video src> punta allo stesso URL) si
 * aspetta di trovare la risposta in cache HTTP del browser, non riusa il blob.
 */
export function useAssetPreload(urls: string[]) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (urls.length === 0) { setReady(true); return; }

    const loaded = new Array(urls.length).fill(0);
    const total = new Array(urls.length).fill(0);
    const report = () => {
      if (cancelled) return;
      const l = loaded.reduce((a, b) => a + b, 0);
      const t = total.reduce((a, b) => a + b, 0);
      setProgress(t > 0 ? l / t : 0);
    };

    Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url);
        total[i] = Number(res.headers.get('content-length') ?? 0) || 1;
        if (!res.body) { loaded[i] = total[i]; report(); return; }
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          loaded[i] += value.byteLength;
          report();
        }
      }),
    )
      .catch(() => {}) // asset mancante: non blocchiamo il sito per sempre
      .finally(() => { if (!cancelled) setReady(true); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join('|')]);

  return { progress, ready };
}
