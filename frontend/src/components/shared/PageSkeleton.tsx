
import { useState, useEffect, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  children: ReactNode;
  delay?: number;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-3 w-48 mt-2" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-highest rounded-xl p-5 edge-glow space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-3 w-3 rounded" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-2 w-20" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <Skeleton className="h-3 w-28 mb-4" />
          <div className="flex items-end gap-3 h-[260px] pt-8">
            {[45, 60, 35, 80, 50, 75, 90].map((height, i) => (
              <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow flex items-center justify-center">
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-surface-container-highest rounded-xl p-5 edge-glow space-y-3">
        <Skeleton className="h-3 w-36 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageSkeleton({ children, delay = 600 }: PageSkeletonProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <>{children}</>;
}
