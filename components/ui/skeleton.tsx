import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('skeleton h-4 w-full', className)}
      {...props}
    />
  );
}

export { Skeleton };
