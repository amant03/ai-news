import type { Metadata } from 'next';
import Home from '@/components/Home';
import { readStore } from '@/lib/db';
import { sortByRank } from '@/lib/rank';
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Live AI News & Model Leaderboard`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

export default function Page() {
  const store = readStore();
  const top = sortByRank(store.items || []).slice(0, 12);
  const url = siteUrl();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${url}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'ItemList',
        name: 'Top AI stories',
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: top.length,
        itemListElement: top.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: item.url,
          name: item.title,
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <noscript>
        <section className="max-w-3xl mx-auto px-4 py-8 text-[var(--fore)]">
          <h1 className="font-display text-2xl mb-4">AI Pulse — live AI news and model leaderboard</h1>
          <p className="text-sm text-[var(--mut)] mb-6">{SITE_DESCRIPTION}</p>
          <ol className="space-y-3">
            {top.map(item => (
              <li key={item.url}>
                <a href={item.url} className="text-[var(--accent)] underline">
                  {item.title}
                </a>
                <span className="block text-xs text-[var(--dim)]">{item.source_label || item.source}</span>
              </li>
            ))}
          </ol>
        </section>
      </noscript>
      <Home />
    </>
  );
}
