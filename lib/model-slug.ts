/** URL slug from a display name. */
export function slugOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Drop provider prefixes and parenthetical variants like (batch), (max), (free). */
export function canonicalName(name: string): string {
  return name.replace(/^[^:]+:\s*/, '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Canonical slug used for /models/[slug] and Artificial Analysis matching. */
export function canonicalSlug(name: string): string {
  return slugOf(canonicalName(name));
}

export function allSlugsFor(model: {
  id?: string;
  name?: string;
  aaSlug?: string;
}): string[] {
  const out = new Set<string>();
  const add = (s?: string) => {
    if (!s) return;
    const v = slugOf(s);
    if (v) out.add(v);
    const c = canonicalSlug(s);
    if (c) out.add(c);
  };
  add(model.name);
  add(model.aaSlug);
  add(model.id);
  if (model.id?.includes('/')) add(model.id.split('/').pop());
  return [...out];
}

export function modelMatchesSlug(
  model: { id?: string; name?: string; aaSlug?: string },
  slug: string
): boolean {
  const want = canonicalSlug(slug);
  if (!want) return false;
  const slugs = allSlugsFor(model);
  if (slugs.includes(want) || slugs.includes(slugOf(slug))) return true;
  const strip = (s: string) => s.replace(/-(batch|free|latest|preview)$/g, '');
  const wantCore = strip(want);
  return slugs.some(s => strip(s) === wantCore && wantCore.length >= 8);
}

export function preferredSlug(model: { id?: string; name?: string; aaSlug?: string }): string {
  if (model.aaSlug) return slugOf(model.aaSlug);
  if (model.name) return canonicalSlug(model.name);
  if (model.id) return canonicalSlug(model.id.split('/').pop() || model.id);
  return '';
}
