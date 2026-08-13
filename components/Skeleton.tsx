export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-[var(--color-line)] min-h-[220px] relative">
          <div className="absolute inset-0 skeleton" />
          <div className="absolute bottom-0 inset-x-0 p-4 space-y-2">
            <div className="skeleton h-4 w-4/5 rounded bg-white/10" />
            <div className="skeleton h-4 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
