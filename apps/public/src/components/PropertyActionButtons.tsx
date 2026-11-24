"use client";

import type { ResolvedButton } from "@/lib/propertyButtons";

type IconName = "calendar" | "chat";

const icons: Record<IconName, React.ReactNode> = {
  calendar: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  ),
  chat: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  ),
};

const variants = {
  primary:
    "bg-[#FF8F35] text-white shadow-[0_4px_14px_-4px_rgba(255,143,53,0.6)] hover:bg-[#ed7c22] hover:shadow-[0_6px_18px_-4px_rgba(255,143,53,0.7)] focus-visible:ring-[#FF8F35]",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:border-zinc-900 hover:bg-zinc-50 focus-visible:ring-zinc-400",
};

type PropertyActionButtonProps = {
  button: ResolvedButton;
  variant: keyof typeof variants;
  icon?: IconName;
  /** Used when the button has no link (in-page action) */
  onClick?: () => void;
  className?: string;
};

export function PropertyActionButton({
  button,
  variant,
  icon,
  onClick,
  className = "",
}: PropertyActionButtonProps) {
  const classes = `group inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] ${variants[variant]} ${className}`;

  const content = (
    <>
      {icon ? (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          {icons[icon]}
        </svg>
      ) : null}
      <span className="truncate">{button.label}</span>
      {button.external ? (
        <svg
          className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 max-[379px]:hidden"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8M17 7v9" />
        </svg>
      ) : null}
    </>
  );

  if (button.href) {
    return (
      <a
        href={button.href}
        className={classes}
        {...(button.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        aria-label={button.external ? `${button.label} (opens in a new tab)` : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
