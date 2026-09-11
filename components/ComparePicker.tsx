'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ModelRecord } from '@/lib/model-registry';
import { preferredSlug } from '@/lib/model-slug';

export default function ComparePicker({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [other, setOther] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch('/api/models/catalog')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (mounted && Array.isArray(d?.models)) setModels(d.models);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const go = () => {
    if (other) router.push(`/models/${currentSlug}/vs/${other}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="compare-with" className="text-[13px] text-[var(--mut)]">
        Compare with…
      </label>
      <select
        id="compare-with"
        value={other}
        onChange={e => setOther(e.target.value)}
        className="rounded-full border border-[var(--color-line)] bg-[var(--input)] px-3 py-2 text-[13px] max-w-[220px] outline-none focus:border-[var(--accent)]/40"
      >
        <option value="">Pick a model</option>
        {models.slice(0, 300).map(m => {
          const slug = preferredSlug(m);
          if (!slug || slug === currentSlug) return null;
          return (
            <option key={m.id} value={slug}>
              {m.name} · {m.provider}
            </option>
          );
        })}
      </select>
      <button
        onClick={go}
        disabled={!other}
        className="rounded-full bg-[var(--fore)] px-4 py-2 text-[13px] font-medium text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        Compare
      </button>
    </div>
  );
}
