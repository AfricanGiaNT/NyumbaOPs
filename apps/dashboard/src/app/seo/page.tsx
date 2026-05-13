"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { Property } from "@/lib/types";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  villa: "Villa",
  cottage: "Cottage",
  studio: "Studio",
  cabin: "Cabin",
  bungalow: "Bungalow",
  townhouse: "Townhouse",
  guesthouse: "Guesthouse",
  lodge: "Lodge",
  resort: "Resort",
};

// Amenity IDs worth surfacing as keywords / in descriptions
const HIGHLIGHT_AMENITIES = [
  "pool",
  "hot_tub",
  "garden",
  "bbq_grill",
  "balcony",
  "patio",
  "wifi",
  "kitchen",
  "parking",
  "air_conditioning",
  "workspace",
];

const AMENITY_LABELS: Record<string, string> = {
  pool: "pool",
  hot_tub: "hot tub",
  garden: "garden",
  bbq_grill: "BBQ",
  balcony: "balcony",
  patio: "patio",
  wifi: "WiFi",
  kitchen: "kitchen",
  parking: "free parking",
  air_conditioning: "air conditioning",
  workspace: "workspace",
};

function generateSeoContent(p: Property): SeoFields {
  const typeLabel =
    PROPERTY_TYPE_LABELS[p.propertyType?.toLowerCase() ?? ""] || "Property";
  const location = p.location ?? "";
  const amenities = (p.amenities ?? []) as string[];

  // ── Title ──────────────────────────────────────────────────────────────────
  const fullTitle = `${p.name} | ${p.bedrooms}-bed ${typeLabel} in ${location}`;
  const seoTitle =
    fullTitle.length <= 60
      ? fullTitle
      : `${p.name} in ${location}`.length <= 60
      ? `${p.name} in ${location}`
      : p.name.slice(0, 60);

  // ── Description ────────────────────────────────────────────────────────────
  let seoDescription = "";

  if (p.description && p.description.trim().length > 20) {
    // Use the property's own description, trimmed to 160 chars at a word boundary
    const trimmed = p.description.trim();
    seoDescription =
      trimmed.length <= 160
        ? trimmed
        : trimmed.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  } else {
    // Generate from structured data
    const guestText = p.maxGuests > 1 ? `${p.maxGuests} guests` : "1 guest";
    const rooms = `${p.bedrooms} bedroom${p.bedrooms !== 1 ? "s" : ""}, ${p.bathrooms} bathroom${p.bathrooms !== 1 ? "s" : ""}`;

    const topAmenities = HIGHLIGHT_AMENITIES.filter((id) =>
      amenities.includes(id)
    )
      .slice(0, 4)
      .map((id) => AMENITY_LABELS[id]);

    const amenityStr =
      topAmenities.length > 0
        ? ` Features: ${topAmenities.join(", ")}.`
        : "";

    seoDescription =
      `Book ${p.name} — a ${typeLabel.toLowerCase()} in ${location}. ${rooms}, sleeps ${guestText}.${amenityStr}`.slice(
        0,
        160
      );
  }

  // ── Keywords ───────────────────────────────────────────────────────────────
  const keywords = new Set<string>();

  if (location) keywords.add(location);
  keywords.add("Malawi");
  keywords.add(typeLabel.toLowerCase());
  keywords.add("short-term rental");
  keywords.add(`${p.bedrooms} bedroom ${typeLabel.toLowerCase()}`);

  HIGHLIGHT_AMENITIES.filter((id) => amenities.includes(id)).forEach((id) =>
    keywords.add(AMENITY_LABELS[id])
  );

  // Add up to 2 highlights as keywords
  (p.highlights ?? []).slice(0, 2).forEach((h) => keywords.add(h));

  // ── Slug ───────────────────────────────────────────────────────────────────
  const slug = p.slug || slugify(p.name);

  return {
    slug,
    seoTitle,
    seoDescription,
    seoKeywords: [...keywords].join(", "),
  };
}

// ─── types ──────────────────────────────────────────────────────────────────

type SeoFields = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
};

// ─── row component ──────────────────────────────────────────────────────────

function SeoEditorRow({
  property,
  onSaved,
}: {
  property: Property;
  onSaved: (updated: Property) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<SeoFields>({
    slug: property.slug ?? slugify(property.name),
    seoTitle: property.seoTitle ?? "",
    seoDescription: property.seoDescription ?? "",
    seoKeywords: (property.seoKeywords ?? []).join(", "),
  });

  const isFilled = !!(
    property.slug ||
    property.seoTitle ||
    property.seoDescription
  );

  // Auto-generate on first expand if nothing is configured yet
  const handleToggle = () => {
    if (!expanded && !isFilled) {
      setFields(generateSeoContent(property));
    }
    setExpanded((v) => !v);
  };

  const handleAutoFill = () => {
    setFields(generateSeoContent(property));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const keywords = fields.seoKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const updated = await apiPatch<Property>(`/properties/${property.id}`, {
        slug: fields.slug || slugify(property.name),
        seoTitle: fields.seoTitle || undefined,
        seoDescription: fields.seoDescription || undefined,
        seoKeywords: keywords,
      });
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setExpanded(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://nyumbaops.com";
  const previewTitle = fields.seoTitle || property.name;
  const previewDesc = fields.seoDescription || property.description || "";
  const previewUrl = `${baseUrl}/properties/${fields.slug || slugify(property.name)}`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
      {/* Row header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${
              isFilled ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {property.name}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
              {property.slug
                ? `/${property.slug}`
                : `/${slugify(property.name)} (auto)`}
              {property.location ? ` · ${property.location}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {saved && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Saved!
            </span>
          )}
          {!isFilled && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              Not configured
            </span>
          )}
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform duration-150 ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Editor */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-5 space-y-5">
          {/* Auto-fill banner */}
          <div className="flex items-center justify-between rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-4 py-3">
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Fields are auto-generated from your property data. Edit them freely before saving.
            </p>
            <button
              type="button"
              onClick={handleAutoFill}
              className="ml-3 flex-shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              ✨ Regenerate
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Left: fields */}
            <div className="space-y-4">
              {/* Slug */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  URL Slug
                </label>
                <div className="flex items-center rounded-md border border-zinc-300 dark:border-zinc-600 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <span className="px-3 py-2 text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border-r border-zinc-300 dark:border-zinc-600 whitespace-nowrap select-none">
                    /properties/
                  </span>
                  <input
                    type="text"
                    value={fields.slug}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, slug: slugify(e.target.value) }))
                    }
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>

              {/* SEO Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    SEO Title
                  </label>
                  <span
                    className={`text-xs ${
                      fields.seoTitle.length > 60
                        ? "text-red-500"
                        : "text-zinc-400"
                    }`}
                  >
                    {fields.seoTitle.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  value={fields.seoTitle}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, seoTitle: e.target.value }))
                  }
                  maxLength={80}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Meta Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Meta Description
                  </label>
                  <span
                    className={`text-xs ${
                      fields.seoDescription.length > 160
                        ? "text-red-500"
                        : "text-zinc-400"
                    }`}
                  >
                    {fields.seoDescription.length}/160
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={fields.seoDescription}
                  onChange={(e) =>
                    setFields((f) => ({
                      ...f,
                      seoDescription: e.target.value,
                    }))
                  }
                  maxLength={200}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Keywords
                </label>
                <input
                  type="text"
                  value={fields.seoKeywords}
                  onChange={(e) =>
                    setFields((f) => ({ ...f, seoKeywords: e.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-400">Comma-separated</p>
                {/* Keyword chips */}
                {fields.seoKeywords && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {fields.seoKeywords
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean)
                      .map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-600 dark:text-zinc-400"
                        >
                          {kw}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving…" : "Save SEO"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="rounded-md border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Right: preview + OG image */}
            <div className="space-y-4">
              {/* Google preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Search Preview
                </p>
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 space-y-1">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">
                    {previewTitle}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-500 truncate">
                    {previewUrl}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                    {previewDesc || "Add a meta description to appear here."}
                  </p>
                </div>
              </div>

              {/* OG image */}
              {property.images && property.images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    OG Image (cover photo)
                  </p>
                  {(() => {
                    const cover =
                      property.images!.find((i) => i.isCover) ??
                      property.images![0];
                    return (
                      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={cover.url}
                          alt={cover.alt ?? property.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })()}
                  <p className="text-xs text-zinc-400">
                    Change the cover photo in the property's Photos tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function SeoPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Property[]>("/properties")
      .then((data) => setProperties(data))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (updated: Property) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const configured = properties.filter(
    (p) => p.slug || p.seoTitle || p.seoDescription
  ).length;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              SEO
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Optimize your property listings for search engines and social
              sharing.
            </p>
          </header>

          {/* Progress */}
          {!loading && properties.length > 0 && (
            <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {configured} of {properties.length} properties configured
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-indigo-600 transition-all"
                    style={{
                      width: `${(configured / properties.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {Math.round((configured / properties.length) * 100)}%
              </span>
            </div>
          )}

          {loading && <LoadingSkeleton rows={4} />}
          {!loading && properties.length === 0 && (
            <EmptyState
              title="No properties yet"
              message="Add a property first, then configure its SEO settings here."
            />
          )}
          {!loading && properties.length > 0 && (
            <div className="space-y-3">
              {properties.map((property) => (
                <SeoEditorRow
                  key={property.id}
                  property={property}
                  onSaved={handleSaved}
                />
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
