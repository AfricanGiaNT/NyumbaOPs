export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="animate-pulse space-y-8">
        {/* Image gallery skeleton */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="aspect-[4/3] rounded-2xl bg-gray-200"></div>
          <div className="aspect-[4/3] rounded-2xl bg-gray-200"></div>
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200"></div>
          <div className="h-4 w-1/2 rounded bg-gray-200"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}
