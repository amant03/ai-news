import type { MetadataRoute } from 'next';
import { readStore } from '@/lib/db';
import { siteUrl } from '@/lib/site';
import { readSlimModelDatabase } from '@/lib/model-registry';
import { preferredSlug } from '@/lib/model-slug';

export default function sitemap(): MetadataRoute.Sitemap {
  const store = readStore();
  const last = store.meta?.lastUpdated ? new Date(store.meta.lastUpdated) : new Date();
  const base = siteUrl();

  const staticRoutes = [
    '/',
    '/models',
    '/leaderboards',
    '/coding-agents',
    '/trends',
    '/chat',
    '/changelog',
    '/speech-to-text',
    '/text-to-speech',
    '/speech-image-video',
    '/image/leaderboard/text-to-image',
    '/image/leaderboard/editing',
    '/video/leaderboard/text-to-video',
    '/video/leaderboard/image-to-video',
    '/video/leaderboard/video-editing',
  ];

  // Dynamic model detail URLs for every model in the committed slim catalog.
  let modelUrls: MetadataRoute.Sitemap = [];
  try {
    const slim = readSlimModelDatabase();
    if (slim?.models?.length) {
      modelUrls = slim.models
        .map(m => preferredSlug({ name: m.name, aaSlug: m.aaSlug, id: m.id }))
        .filter(Boolean)
        .map(slug => ({
          url: `${base}/models/${slug}`,
          lastModified: last,
          changeFrequency: 'daily' as const,
          priority: 0.7,
        }));
    }
  } catch {
    /* sitemap stays static-only */
  }

  return [
    {
      url: base,
      lastModified: last,
      changeFrequency: 'hourly',
      priority: 1,
    },
    ...staticRoutes.slice(1).map(
      (path): MetadataRoute.Sitemap[number] => ({
        url: `${base}${path}`,
        lastModified: last,
        changeFrequency: 'daily',
        priority: 0.8,
      })
    ),
    ...modelUrls,
  ];
}
