"use client";

type SkeletonBlockProps = {
  className?: string;
};

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={joinClasses("skeleton-shimmer rounded-2xl", className)} aria-hidden="true" />;
}

export function HomeFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-[34px] border border-gray-200 bg-white shadow-xl dark:border-white/5 dark:bg-[#17181f]"
          aria-hidden="true"
        >
          <SkeletonBlock className="h-48 w-full rounded-none" />
          <div className="space-y-3 p-3.5">
            <div className="mx-auto flex w-fit gap-2">
              <SkeletonBlock className="h-6 w-20 rounded-full" />
              <SkeletonBlock className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="mx-auto h-8 w-40 max-w-full" />
            <SkeletonBlock className="mx-auto h-4 w-28" />
            <div className="grid grid-cols-3 gap-2">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SkeletonBlock className="h-[72px]" />
              <SkeletonBlock className="h-[72px]" />
              <SkeletonBlock className="h-[72px]" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PlaceDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#101114] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <SkeletonBlock className="h-12 w-28 rounded-full" />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SkeletonBlock className="min-h-[380px] w-full rounded-[32px]" />
          <div className="space-y-4 rounded-[32px] border border-white/8 bg-white/5 p-6">
            <SkeletonBlock className="h-8 w-40" />
            <SkeletonBlock className="h-5 w-24" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 w-20 rounded-full" />
              <SkeletonBlock className="h-8 w-24 rounded-full" />
              <SkeletonBlock className="h-8 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="h-24 w-full" />
            <div className="grid grid-cols-3 gap-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
            <SkeletonBlock className="h-14 w-full" />
            <div className="grid grid-cols-3 gap-3">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  isArmed,
}: {
  pullDistance: number;
  isRefreshing: boolean;
  isArmed: boolean;
}) {
  const visible = isRefreshing || pullDistance > 0;
  const translateY = visible ? Math.max(12, pullDistance - 18) : -64;
  const label = isRefreshing ? "Refreshing" : isArmed ? "Release to refresh" : "Pull to refresh";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${translateY}px)`,
        opacity: visible ? 1 : 0,
        transition: isRefreshing || pullDistance > 0 ? "none" : "transform 180ms ease, opacity 180ms ease",
      }}
      aria-hidden="true"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-700 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#17181f]/90 dark:text-slate-100">
        <span className={`material-symbols-outlined text-base ${isRefreshing ? "animate-spin" : ""}`}>
          {isRefreshing ? "progress_activity" : "south"}
        </span>
        <span>{label}</span>
      </div>
    </div>
  );
}
