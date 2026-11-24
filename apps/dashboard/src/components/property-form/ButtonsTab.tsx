"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PropertyFormData } from "@/types/property-form";
import { parseGoogleMapsUrl } from "@/lib/utils/parseGoogleMapsUrl";
import type { TabProps } from "./BasicInfoTab";

export const BUTTON_LINK_PATTERN = /^(https?:\/\/|mailto:|tel:)\S+$/i;

export const DEFAULT_AVAILABILITY_LABEL = "Check availability";
export const DEFAULT_CONTACT_LABEL = "Contact us";

/** Every editable link field in this tab, in the order they appear. */
export const LINK_FIELDS = [
  "availabilityButtonUrl",
  "contactButtonUrl",
  "googleMapsUrl",
  "reviewButtonUrl",
] as const;

type LinkField = (typeof LINK_FIELDS)[number];
type LabelField = "availabilityButtonLabel" | "contactButtonLabel";

/** Returns an error message for an invalid link, or null when it is fine (or empty). */
export function validateButtonLink(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return BUTTON_LINK_PATTERN.test(trimmed)
    ? null
    : "Links must start with https://, mailto: or tel:";
}

function describeDestination(url?: string): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^mailto:/i.test(trimmed)) return "Opens an email";
  if (/^tel:/i.test(trimmed)) return "Starts a phone call";
  try {
    const host = new URL(trimmed).hostname.replace(/^www\./, "");
    if (host.includes("airbnb.")) return "Opens Airbnb in a new tab";
    if (host.includes("booking.com")) return "Opens Booking.com in a new tab";
    if (host === "wa.me" || host.includes("whatsapp")) return "Opens WhatsApp";
    if (host.includes("google.") || host.includes("goo.gl")) return "Opens Google in a new tab";
    return `Opens ${host} in a new tab`;
  } catch {
    return null;
  }
}

type QuickFill = { label: string; url: string };

const icons = {
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  chat:
    "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  pin:
    "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  star:
    "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  globe:
    "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18",
};

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function LinkCard({
  title,
  where,
  icon,
  urlField,
  labelField,
  defaultLabel,
  defaultBehaviour,
  urlPlaceholder,
  quickFills,
  onUrlChange,
  note,
  data,
  onChange,
  errors,
}: {
  title: string;
  /** Where on the guest page this link appears */
  where: string;
  icon: string;
  urlField: LinkField;
  labelField?: LabelField;
  defaultLabel?: string;
  defaultBehaviour: string;
  urlPlaceholder: string;
  quickFills?: QuickFill[];
  /** Override how a URL change is applied (e.g. also update the map pin) */
  onUrlChange?: (value: string) => void;
  /** Extra status line shown under the link, overriding the destination hint */
  note?: string | null;
} & TabProps) {
  const url = data[urlField] ?? "";
  const label = labelField ? data[labelField] ?? "" : "";
  const error = errors[urlField] ?? validateButtonLink(url);
  const destination = describeDestination(url);
  const setUrl = onUrlChange ?? ((value: string) => onChange({ [urlField]: value } as Partial<PropertyFormData>));
  const isCustom = !!url.trim();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow focus-within:shadow-md sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon d={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isCustom ? "bg-indigo-50 text-indigo-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {isCustom ? "Custom link" : "Default"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{where}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={urlField}>Link</Label>
            {isCustom && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
              >
                Reset to default
              </button>
            )}
          </div>
          <Input
            id={urlField}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={urlPlaceholder}
            className={error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : undefined}
          />
          {quickFills && !isCustom && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickFills.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setUrl(q.url)}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  + {q.label}
                </button>
              ))}
            </div>
          )}
          <p className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>
            {error ?? note ?? (destination ? `✓ ${destination}` : `Empty: ${defaultBehaviour}`)}
          </p>
        </div>

        {labelField && (
          <div>
            <Label htmlFor={labelField}>Button text</Label>
            <Input
              id={labelField}
              value={label}
              maxLength={40}
              onChange={(e) => onChange({ [labelField]: e.target.value } as Partial<PropertyFormData>)}
              placeholder={defaultLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </h3>
  );
}

const SITE_WIDE_LINKS = [
  { name: "WhatsApp button (top bar & footer)", target: "wa.me/2650990845264" },
  { name: "Terms · Privacy · FAQ (footer)", target: "Site pages" },
  { name: "Back to properties", target: "/properties" },
];

export function ButtonsTab({ data, onChange, errors }: TabProps) {
  const availabilityLabel = data.availabilityButtonLabel?.trim() || DEFAULT_AVAILABILITY_LABEL;
  const contactLabel = data.contactButtonLabel?.trim() || DEFAULT_CONTACT_LABEL;
  const availabilityExternal = !!data.availabilityButtonUrl?.trim();

  // Mirrors the Google Maps field on the Basic Info tab: a full Maps link also moves the map pin.
  const mapsUrl = data.googleMapsUrl?.trim() ?? "";
  const mapsCoords = mapsUrl ? parseGoogleMapsUrl(mapsUrl) : null;
  const handleMapsChange = (value: string) => {
    const parsed = value.trim() ? parseGoogleMapsUrl(value) : null;
    onChange(
      parsed
        ? { googleMapsUrl: value, latitude: parsed.latitude, longitude: parsed.longitude }
        : { googleMapsUrl: value }
    );
  };
  const mapsNote =
    mapsUrl && !validateButtonLink(mapsUrl)
      ? mapsCoords
        ? "✓ Opens Google Maps · map pin updated from this link"
        : "✓ Opens this link · the map pin stays where it is (short links can't move it)"
      : null;

  return (
    <div className="space-y-4 pb-2 sm:space-y-5">
      <p className="text-sm text-zinc-600">
        Every link guests can click on this property&apos;s page. Leave a link empty to keep the
        default.
      </p>

      {/* Live preview */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-gradient-to-br from-zinc-50 to-white p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Guest preview
        </p>
        <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-zinc-900">
              {data.nightlyRate
                ? new Intl.NumberFormat("en-MW", {
                    style: "currency",
                    currency: data.currency || "USD",
                    maximumFractionDigits: 0,
                  }).format(data.nightlyRate)
                : "Price"}
            </span>
            <span className="text-xs text-zinc-500">per night</span>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex flex-1 items-center justify-center gap-1.5 truncate rounded-lg bg-[#FF8F35] px-3 py-2.5 text-sm font-semibold text-white shadow-sm">
              <span className="truncate">{availabilityLabel}</span>
              {availabilityExternal && (
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              )}
            </span>
            <span className="inline-flex flex-1 items-center justify-center truncate rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-800">
              <span className="truncate">{contactLabel}</span>
            </span>
          </div>
        </div>
      </div>

      <SectionHeading>Booking buttons</SectionHeading>

      <LinkCard
        title="Availability button"
        where="Main orange button in the booking card and the phone bottom bar"
        icon={icons.calendar}
        urlField="availabilityButtonUrl"
        labelField="availabilityButtonLabel"
        defaultLabel={DEFAULT_AVAILABILITY_LABEL}
        defaultBehaviour="opens the built-in availability checker"
        urlPlaceholder="https://www.airbnb.com/rooms/…"
        data={data}
        onChange={onChange}
        errors={errors}
      />

      <LinkCard
        title="Contact button"
        where="Next to the availability button"
        icon={icons.chat}
        urlField="contactButtonUrl"
        labelField="contactButtonLabel"
        defaultLabel={DEFAULT_CONTACT_LABEL}
        defaultBehaviour="opens WhatsApp with a message about this property"
        urlPlaceholder="https://wa.me/265…, mailto:… or tel:…"
        quickFills={[
          { label: "WhatsApp", url: "https://wa.me/265" },
          { label: "Email", url: "mailto:" },
          { label: "Phone", url: "tel:+265" },
        ]}
        data={data}
        onChange={onChange}
        errors={errors}
      />

      <SectionHeading>Elsewhere on the page</SectionHeading>

      <LinkCard
        title="Get directions"
        where={`"Where you'll be" section, under the map`}
        icon={icons.pin}
        urlField="googleMapsUrl"
        defaultBehaviour="directions to the map pin (set on the Basic Info tab)"
        urlPlaceholder="https://www.google.com/maps/place/…"
        onUrlChange={handleMapsChange}
        note={mapsNote}
        data={data}
        onChange={onChange}
        errors={errors}
      />

      <LinkCard
        title="Leave a review"
        where="Reviews section"
        icon={icons.star}
        urlField="reviewButtonUrl"
        defaultBehaviour="opens the built-in review form on your site"
        urlPlaceholder="https://www.airbnb.com/rooms/…/reviews or a Google review link"
        data={data}
        onChange={onChange}
        errors={errors}
      />

      <SectionHeading>Same on every page</SectionHeading>

      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-zinc-50/60">
        {SITE_WIDE_LINKS.map((link) => (
          <div key={link.name} className="flex items-center gap-3 px-4 py-3">
            <Icon d={icons.globe} className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">{link.name}</span>
            <span className="shrink-0 truncate text-xs text-zinc-400">{link.target}</span>
          </div>
        ))}
        <p className="px-4 py-2.5 text-xs text-zinc-500">
          These are shared by the whole site, so they aren&apos;t set per property.
        </p>
      </div>
    </div>
  );
}
