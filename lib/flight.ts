/**
 * Shared helpers for parsing Next.js flight payloads embedded in
 * server-rendered pages (free, no keys — plain HTML fetch + parse).
 */

/** Concatenate all unescaped flight string payloads on the page. */
export function unescapeFlightPayloads(html: string): string {
  const out: string[] = [];
  const re = /self\.__next_f\.push\(\[1,"(.*?)"\]\)<\/script>/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      out.push(JSON.parse(`"${m[1]}"`));
    } catch {
      /* skip malformed chunk */
    }
  }
  return out.join('');
}

/**
 * Brace-matching extraction of the first `"key":[...]` (or `{...}`) value.
 * Returns the parsed JSON or null when absent/malformed.
 */
export function extractKeyedValue<T = unknown>(text: string, key: string): T | null {
  const anchor = `"${key}":`;
  const i = text.indexOf(anchor);
  if (i < 0) return null;
  const start = i + anchor.length;
  const open = text[start];
  if (open !== '[' && open !== '{') return null;
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
    } else if (c === '[' || c === '{') {
      depth += 1;
    } else if (c === ']' || c === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, j + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
