export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-[var(--color-line)] bg-[#0b1220]">
          <div className="h-40 skeleton" />
          <div className="p-4 space-y-2">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
