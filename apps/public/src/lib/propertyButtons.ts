export const WHATSAPP_NUMBER = "2650990845264";

export type PropertyButtonSettings = {
  availabilityButtonUrl?: string | null;
  availabilityButtonLabel?: string | null;
  contactButtonUrl?: string | null;
  contactButtonLabel?: string | null;
};

export type ResolvedButton = {
  label: string;
  /** null = handled in-page (e.g. open the availability modal) */
  href: string | null;
  /** true when the link leaves the site and should open in a new tab */
  external: boolean;
  /** short note shown under the button, e.g. "You'll finish booking on Airbnb" */
  hint: string | null;
};

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:)\S+$/i;

const clean = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Returns the trimmed link if it is an allowed https/http/mailto/tel URL, otherwise null. */
export const safeLinkHref = (value?: string | null) => {
  const href = clean(value);
  return href && SAFE_LINK.test(href) ? href : null;
};

function siteName(href: string): string | null {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    if (host.includes("airbnb.")) return "Airbnb";
    if (host.includes("booking.com")) return "Booking.com";
    if (host === "wa.me" || host.includes("whatsapp")) return "WhatsApp";
    return host;
  } catch {
    return null;
  }
}

export function resolvePropertyButtons(
  settings: PropertyButtonSettings,
  propertyName: string,
): { availability: ResolvedButton; contact: ResolvedButton } {
  const availabilityHref = safeLinkHref(settings.availabilityButtonUrl);
  const availabilitySite = availabilityHref ? siteName(availabilityHref) : null;

  const customContact = safeLinkHref(settings.contactButtonUrl);
  const contactHref =
    customContact ??
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hi, I'm interested in ${propertyName}.`,
    )}`;

  return {
    availability: {
      label: clean(settings.availabilityButtonLabel) ?? "Check availability",
      href: availabilityHref,
      external: !!availabilityHref && /^https?:/i.test(availabilityHref),
      hint: availabilityHref
        ? availabilitySite
          ? `You'll finish booking on ${availabilitySite}`
          : "Opens in a new tab"
        : "Request a stay after checking your dates",
    },
    contact: {
      label: clean(settings.contactButtonLabel) ?? "Contact us",
      href: contactHref,
      external: /^https?:/i.test(contactHref),
      hint: null,
    },
  };
}
