import { useState, useEffect } from 'react';
import type { GuidelineDoc } from '../types';

export interface LymphomaDoc extends GuidelineDoc {
  nodeDetails?: Record<string, [string, string]>; // [title, body]
}

export function useGuideline() {
  const [doc, setDoc] = useState<LymphomaDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../data/guidelines/lymphoma.json')
      .then((m) => {
        setDoc(m.default as unknown as LymphomaDoc);
      })
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, []);

  return { doc, loading };
}
