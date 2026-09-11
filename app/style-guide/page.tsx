import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = { robots: { index: false, follow: false } };

const SWATCHES = [
  ['--gray-50', '#fafafa'], ['--gray-100', '#f4f4f5'], ['--gray-200', '#e4e4e7'],
  ['--gray-300', '#d4d4d8'], ['--gray-400', '#a1a1aa'], ['--gray-500', '#71717a'],
  ['--gray-600', '#52525b'], ['--gray-700', '#3f3f46'], ['--gray-800', '#27272a'],
  ['--gray-900', '#18181b'], ['--gray-950', '#09090b'],
];

const CATS = [
  ['--cat-model', '#6366f1', 'Model'], ['--cat-research', '#0ea5e9', 'Research'],
  ['--cat-product', '#10b981', 'Product'], ['--cat-safety', '#f59e0b', 'Safety'],
  ['--cat-policy', '#f43f5e', 'Policy'], ['--cat-other', '#71717a', 'Other'],
];

export default function StyleGuide() {
  return (
    <main className="max-w-[1000px] mx-auto px-5 py-12">
      <p className="section-label">Internal · Style guide</p>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">Design tokens</h1>
      <p className="mt-2 text-sm text-[var(--mut)] max-w-[60ch] leading-relaxed">
        Living reference for the Linear/Vercel clean-SaaS direction. Not linked in nav.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Gray scale</h2>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SWATCHES.map(([name, hex]) => (
          <div key={name} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3">
            <div className="h-8 rounded-[var(--radius-sm)]" style={{ background: hex }} />
            <p className="mt-2 font-mono text-xs">{name}</p>
            <p className="font-mono text-[11px] text-[var(--mut)]">{hex}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Accent + category dots</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {CATS.map(([name, hex, label]) => (
          <span key={name} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs">
            <span className="dot" style={{ background: hex }} />
            {label} <span className="font-mono text-[var(--mut)]">{hex}</span>
          </span>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Type scale</h2>
      <div className="mt-3 space-y-3 border border-[var(--color-line)] rounded-[var(--radius-lg)] p-5">
        <p className="text-3xl md:text-4xl font-semibold tracking-tight">Page title</p>
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--mut)]">Section label</p>
        <p className="text-sm md:text-base font-medium leading-snug">Card title — two-line clamp example</p>
        <p className="text-sm text-[var(--mut)] leading-relaxed">Body copy in muted gray, relaxed leading.</p>
        <p className="font-mono text-sm tabular-nums">12,481 · 98.2% · elo 1,402</p>
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Components</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
      <div className="mt-3">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Everyone</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="tech">Technical</TabsTrigger>
            <TabsTrigger value="research">Research</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="mt-3 space-y-2 max-w-sm">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
      </div>
    </main>
  );
}
