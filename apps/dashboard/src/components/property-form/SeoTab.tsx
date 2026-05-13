"use client";

import { useEffect } from "react";
import { PropertyFormData } from "@/types/property-form";

interface SeoTabProps {
  data: PropertyFormData;
  onChange: (updates: Partial<PropertyFormData>) => void;
  errors: Record<string, string>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function SeoTab({ data, onChange, errors }: SeoTabProps) {
  // Auto-generate slug from name when slug is empty
  useEffect(() => {
    if (!data.slug && data.name) {
      onChange({ slug: slugify(data.name) });
    }
  }, [data.name]);

  const seoTitle = data.seoTitle || data.name || "";
  const seoDescription =
    data.seoDescription ||
    (data.description ? data.description.slice(0, 160) : "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nyumbaops.com";
  const previewUrl = `${baseUrl}/properties/${data.slug || "your-property"}`;

  const handleKeywordsChange = (raw: string) => {
    const keywords = raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    onChange({ seoKeywords: keywords });
  };

  return (
    <div className="py-6 space-y-6">
      {/* URL Slug */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          URL Slug
        </label>
        <div className="flex items-center rounded-md border border-zinc-300 dark:border-zinc-600 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
          <span className="px-3 py-2 text-sm text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border-r border-zinc-300 dark:border-zinc-600 select-none whitespace-nowrap">
            /properties/
          </span>
          <input
            type="text"
            value={data.slug || ""}
            onChange={(e) => onChange({ slug: slugify(e.target.value) })}
            placeholder="your-property-name"
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
          />
        </div>
        <p className="text-xs text-zinc-400">
          Auto-generated from property name. Only letters, numbers, and hyphens.
        </p>
      </div>

      {/* SEO Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            SEO Title
          </label>
          <span className={`text-xs ${(data.seoTitle || "").length > 60 ? "text-red-500" : "text-zinc-400"}`}>
            {(data.seoTitle || "").length}/60
          </span>
        </div>
        <input
          type="text"
          value={data.seoTitle || ""}
          onChange={(e) => onChange({ seoTitle: e.target.value })}
          placeholder={data.name || "e.g., Cozy Lakeside Cottage in Mangochi"}
          maxLength={80}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-xs text-zinc-400">
          Shown in browser tabs and search results. Keep under 60 chars.
        </p>
      </div>

      {/* Meta Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Meta Description
          </label>
          <span className={`text-xs ${(data.seoDescription || "").length > 160 ? "text-red-500" : "text-zinc-400"}`}>
            {(data.seoDescription || "").length}/160
          </span>
        </div>
        <textarea
          rows={3}
          value={data.seoDescription || ""}
          onChange={(e) => onChange({ seoDescription: e.target.value })}
          placeholder={
            data.description
              ? data.description.slice(0, 160)
              : "Brief description for search engines and social sharing…"
          }
          maxLength={200}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
        />
        <p className="text-xs text-zinc-400">
          Shown below the title in search results. Aim for 120–160 characters.
        </p>
      </div>

      {/* Keywords */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Keywords
        </label>
        <input
          type="text"
          value={(data.seoKeywords || []).join(", ")}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          placeholder="lake view, Malawi, short-term rental, villa"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-xs text-zinc-400">Comma-separated. Optional hint for search engines.</p>
        {(data.seoKeywords || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(data.seoKeywords || []).map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
              >
                {kw}
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      seoKeywords: (data.seoKeywords || []).filter((k) => k !== kw),
                    })
                  }
                  className="text-indigo-400 hover:text-indigo-600"
                  aria-label={`Remove ${kw}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Google Search Preview */}
      <div className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Search Preview
        </p>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 truncate">
            {seoTitle || data.name || "Your Property Title"}
          </p>
          <p className="text-xs text-green-700 dark:text-green-500 truncate">{previewUrl}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
            {seoDescription || "Add a meta description to appear here in search results."}
          </p>
        </div>
      </div>

      {errors.seo && (
        <p className="text-sm text-red-500">{errors.seo}</p>
      )}
    </div>
  );
}
