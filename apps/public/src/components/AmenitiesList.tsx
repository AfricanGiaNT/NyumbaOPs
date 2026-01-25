export function AmenitiesList({ amenities }: { amenities: string[] }) {
  if (!amenities.length) {
    return <p className="text-sm text-[var(--muted)]">Amenities coming soon.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {amenities.map((amenity) => (
        <li
          key={amenity}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs"
        >
          {amenity}
        </li>
      ))}
    </ul>
  );
}
