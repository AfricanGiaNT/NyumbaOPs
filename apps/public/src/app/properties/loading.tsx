export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[var(--accent)]"></div>
        <p className="mt-4 text-sm text-[var(--muted)]">Loading properties...</p>
      </div>
    </div>
  );
}
