import Link from "next/link";
import Image from "next/image";
import { Property } from "@/lib/dashboard/types";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

const statusStyles: Record<Property["status"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-zinc-200 text-zinc-700",
  MAINTENANCE: "bg-amber-100 text-amber-800",
};

type PropertyCardProps = {
  property: Property;
  onEdit?: (property: Property) => void;
};

export function PropertyCard({ property, onEdit }: PropertyCardProps) {
  const coverImage = property.images?.find(img => img.isCover) ?? property.images?.[0];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      {/* Cover Image */}
      {coverImage && (
        <div className="relative aspect-[16/9] w-full bg-zinc-100">
          <Image
            src={coverImage.url}
            alt={coverImage.alt ?? property.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {property.name}
            </h3>
            <p className="text-sm text-zinc-500">
              {property.location ?? "No location set"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[property.status]}`}
          >
            {property.status}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-600">
          <div>Bedrooms: {property.bedrooms}</div>
          <div>Bathrooms: {property.bathrooms}</div>
          <div>Max Guests: {property.maxGuests}</div>
          <div>
            Nightly Rate:{" "}
            {property.nightlyRate
              ? `${property.currency} ${property.nightlyRate}`
              : "N/A"}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {onEdit && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onEdit(property);
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Edit →
            </button>
          )}
          <a
            href={`${PUBLIC_SITE_URL}/properties/${property.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            Preview →
          </a>
          <Link
            href={`/dashboard/properties/${property.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View details →
          </Link>
        </div>
      </div>
    </div>
  );
}

