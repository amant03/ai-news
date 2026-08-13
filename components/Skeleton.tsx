export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="glass rounded-2xl overflow-hidden">
          <div className="h-0.5 w-full skeleton" />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="skeleton w-5 h-5 rounded-md" />
              <div className="skeleton h-3 w-28 rounded" />
            </div>
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="pt-3 border-t border-[var(--color-line)] flex items-center gap-3">
              <div className="skeleton h-4 w-16 rounded-full" />
              <div className="skeleton h-3 w-12 rounded" />
              <div className="skeleton h-3 w-12 rounded ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}