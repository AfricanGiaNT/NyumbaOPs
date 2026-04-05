import Link from "next/link";
import { Property } from "../lib/types";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

const statusStyles: Record<Property["status"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  INACTIVE: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200",
  MAINTENANCE: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
};

type PropertyCardProps = {
  property: Property;
  onEdit?: (property: Property) => void;
  onDelete?: (property: Property) => void;
};

export function PropertyCard({ property, onEdit, onDelete }: PropertyCardProps) {
  const coverImage = property.images?.find(img => img.isCover) ?? property.images?.[0];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Cover Image */}
      {coverImage ? (
        <div className="relative aspect-[16/9] w-full bg-zinc-100">
          <img
            src={coverImage.url}
            alt={coverImage.alt ?? property.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
          <svg className="h-12 w-12 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 leading-tight">
              {property.name}
            </h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              {property.location ?? "No location set"}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[property.status]}`}>
            {property.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-1.5 text-sm text-zinc-600">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
            {property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {property.maxGuests} guests
          </div>
          <div className="flex items-center gap-1.5 font-medium text-zinc-700">
            {property.nightlyRate ? `${property.currency} ${property.nightlyRate.toLocaleString()}/night` : "—"}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); onEdit(property); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); onDelete(property); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}
          <a
            href={`${PUBLIC_SITE_URL}/properties/${property.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Preview
          </a>
          <Link
            href={`/properties/${property.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-200 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

