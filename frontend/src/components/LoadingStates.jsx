export function Spinner({ size = "md" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <div
      className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-600 border-t-indigo-400`}
    />
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse rounded bg-gray-800 ${className}`} />
  );
}

export function LoadingOverlay({ message = "Analyzing with Claude..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <Spinner size="lg" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 space-y-3">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-5/6" />
      <SkeletonBlock className="h-3 w-4/6" />
    </div>
  );
}
