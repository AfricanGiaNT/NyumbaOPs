"use client";

import { useEffect, useState } from "react";
import { PropertyActionButton } from "./PropertyActionButtons";
import type { ResolvedButton } from "@/lib/propertyButtons";

type StickyCheckAvailabilityProps = {
  price: string;
  showPerNight?: boolean;
  availability: ResolvedButton;
  contact: ResolvedButton;
  onCheckAvailability: () => void;
};

export function StickyCheckAvailability({
  price,
  showPerNight = true,
  availability,
  contact,
  onCheckAvailability,
}: StickyCheckAvailabilityProps) {
  const [bottomOffset, setBottomOffset] = useState(0);
  const [inquiryVisible, setInquiryVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.visualViewport) {
          const offsetTop = window.visualViewport.offsetTop;
          const layoutHeight = window.innerHeight;
          const visualHeight = window.visualViewport.height;
          setBottomOffset(Math.max(0, layoutHeight - visualHeight - offsetTop));
        }
      }, 50);
    };

    handleResize();

    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);

    return () => {
      clearTimeout(timer);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  useEffect(() => {
    const inquiry = document.getElementById("inquiry");
    if (!inquiry) return;

    const observer = new IntersectionObserver(([entry]) => {
      setInquiryVisible(entry.isIntersecting);
    });
    observer.observe(inquiry);
    return () => observer.disconnect();
  }, []);

  if (inquiryVisible) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 flex flex-col gap-2 border-t border-zinc-200/80 bg-white/95 px-4 pt-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:hidden"
      style={{
        bottom: `${bottomOffset}px`,
        paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))",
        transition: "bottom 0.2s ease-out"
      }}
    >
      <div className="flex min-w-0 items-baseline gap-1.5 sm:flex-col sm:gap-0">
        <span className="truncate text-sm font-semibold text-zinc-900">{price}</span>
        {showPerNight ? <span className="text-xs text-zinc-600">per night</span> : null}
      </div>

      <div className="grid grid-cols-[1fr_1.35fr] gap-2 sm:flex sm:shrink-0">
        <PropertyActionButton
          button={contact}
          variant="secondary"
          icon="chat"
          className="min-w-0 px-3 sm:px-4"
        />
        <PropertyActionButton
          button={availability}
          variant="primary"
          onClick={onCheckAvailability}
          className="min-w-0 px-3 sm:px-5"
        />
      </div>
    </div>
  );
}
