import type { MetadataRoute } from 'next';
import { readStore } from '@/lib/db';
import { siteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const store = readStore();
  const last = store.meta?.lastUpdated ? new Date(store.meta.lastUpdated) : new Date();
  return [
    {
      url: siteUrl(),
      lastModified: last,
      changeFrequency: 'hourly',
      priority: 1,
    },
  ];
}
