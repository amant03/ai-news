import seed from '@/data/aa-models.json';
import { modelMatchesSlug } from './model-slug';
import type { AAModelEntry } from './aa-scraper';

type SeedFile = { models?: unknown };

const MODELS: AAModelEntry[] = Array.isArray((seed as SeedFile).models)
  ? ((seed as SeedFile).models as AAModelEntry[])
  : [];

export function readAACatalogSync(): AAModelEntry[] {
  return MODELS;
}

export function findAAModel(slug: string): AAModelEntry | undefined {
  return MODELS.find(m => m.slug === slug || modelMatchesSlug({ name: m.name, aaSlug: m.slug }, slug));
}
