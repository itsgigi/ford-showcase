import { useEffect, useState } from 'react';

/**
 * Checks whether a static asset actually exists.
 * Nota: il dev server di Vite risponde 200 con index.html anche per file
 * mancanti (SPA fallback), quindi oltre allo status controlliamo che il
 * content-type non sia HTML.
 */
export function useAssetAvailable(url: string): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        const type = r.headers.get('content-type') ?? '';
        if (alive) setOk(r.ok && !type.includes('text/html'));
      })
      .catch(() => { if (alive) setOk(false); });
    return () => { alive = false; };
  }, [url]);

  return ok;
}
