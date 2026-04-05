"use client";

import React, { useState } from "react";

const amenityIcons: Record<string, React.ReactElement> = {
  Kitchen: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {/* Fork */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4.5m0 0C7 8.88 8 9.5 8 11v10M7 7.5C7 8.88 6 9.5 6 11v0M9 3v4.5C9 8.88 8 9.5 8 11" />
      {/* Knife */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3c0 0 2 2.5 2 6h-2v12" />
    </svg>
  ),
  Wifi: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  ),
  Parking: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {/* Car silhouette */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-5l2.5-5h13L21 12v5h-2M5 17a2 2 0 104 0m6 0a2 2 0 104 0M5 17h10" />
    </svg>
  ),
  TV: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  ),
  Workspace: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  ),
  AirConditioning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      {/* Snowflake */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M6.343 6.343l11.314 11.314M17.657 6.343L6.343 17.657" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6l-1.5-1.5M12 6l1.5-1.5M12 18l-1.5 1.5M12 18l1.5 1.5M6 12l-1.5-1.5M6 12l-1.5 1.5M18 12l1.5-1.5M18 12l1.5 1.5" />
    </svg>
  ),
  Washer: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  Dryer: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  Heating: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  ),
  Pool: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  Gym: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
    </svg>
  ),
  Security: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  Generator: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
};

const getAmenityIcon = (amenity: string): React.ReactElement => {
  const n = amenity.toLowerCase().replace(/[_\s-]/g, "");
  if (n.includes("kitchen")) return amenityIcons.Kitchen;
  if (n.includes("wifi") || n.includes("internet")) return amenityIcons.Wifi;
  if (n.includes("parking")) return amenityIcons.Parking;
  if (n.includes("tv") || n.includes("television")) return amenityIcons.TV;
  if (n.includes("workspace") || n.includes("desk") || n.includes("office")) return amenityIcons.Workspace;
  if (n.includes("air") || n.includes("conditioning") || n.includes("ac")) return amenityIcons.AirConditioning;
  if (n.includes("washer") || n.includes("washing")) return amenityIcons.Washer;
  if (n.includes("dryer") || n.includes("drying")) return amenityIcons.Dryer;
  if (n.includes("heat") || n.includes("heating")) return amenityIcons.Heating;
  if (n.includes("pool") || n.includes("swimming")) return amenityIcons.Pool;
  if (n.includes("gym") || n.includes("fitness")) return amenityIcons.Gym;
  if (n.includes("security") || n.includes("alarm")) return amenityIcons.Security;
  if (n.includes("generator") || n.includes("backup") || n.includes("power")) return amenityIcons.Generator;
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

const formatName = (name: string) =>
  name
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

type AmenityItem = { name: string; description?: string | null };

export function AmenitiesList({ amenities }: { amenities: AmenityItem[] }) {
  const [showAll, setShowAll] = useState(false);

  if (!amenities.length) {
    return <p className="text-sm text-zinc-400">Amenities information coming soon.</p>;
  }

  const displayLimit = 8;
  const displayed = showAll ? amenities : amenities.slice(0, displayLimit);
  const hasMore = amenities.length > displayLimit;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {displayed.map((amenity, index) => (
          <div
            key={`${amenity.name}-${index}`}
            className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm"
          >
            {/* Icon */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-zinc-200 text-zinc-500 transition-colors group-hover:text-emerald-700 group-hover:ring-emerald-200">
              {getAmenityIcon(amenity.name)}
            </div>

            {/* Text */}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 leading-tight">
                {formatName(amenity.name)}
              </p>
              {amenity.description && (
                <p className="mt-0.5 text-xs leading-snug text-zinc-400 line-clamp-1">
                  {amenity.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="group inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 active:scale-[0.98]"
        >
          <span>{showAll ? "Show less" : `Show all ${amenities.length} amenities`}</span>
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );
}
