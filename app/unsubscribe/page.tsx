'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function UnsubscribeBody() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [error, setError] = useState('');

  useEffect(() => {
    const email = params.get('email') || '';
    const token = params.get('token') || '';
    if (!email || !token) {
      setStatus('error');
      setError('This unsubscribe link is incomplete. Use the link from your digest email.');
      return;
    }
    fetch('/api/newsletter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    })
      .then(async res => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && data.error) || 'Unsubscribe failed.');
        setStatus('done');
      })
      .catch(err => {
        setStatus('error');
        setError(err instanceof Error && err.message ? err.message : 'Unsubscribe failed.');
      });
  }, [params]);

  return (
    <main className="max-w-[640px] mx-auto px-5 pt-16 pb-24 text-center">
      {status === 'working' && <p className="text-sm text-[var(--mut)]">Unsubscribing…</p>}
      {status === 'done' && (
        <>
          <h1 className="font-display text-2xl font-semibold tracking-tight">You&apos;re unsubscribed.</h1>
          <p className="mt-2 text-sm text-[var(--mut)]">No more daily digests. Come back anytime.</p>
          <a href="/" className="mt-6 inline-block text-sm underline underline-offset-4">Back to front page</a>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Couldn&apos;t unsubscribe</h1>
          <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>
        </>
      )}
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Suspense fallback={<main className="max-w-[640px] mx-auto px-5 pt-16 pb-24 text-center text-sm text-[var(--mut)]">Unsubscribing…</main>}>
        <UnsubscribeBody />
      </Suspense>
      <Footer />
    </div>
  );
}
