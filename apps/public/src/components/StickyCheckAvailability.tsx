"use client";

import { useEffect, useState } from "react";

type StickyCheckAvailabilityProps = {
  price: string;
  onCheckAvailability: () => void;
};

export function StickyCheckAvailability({ 
  price, 
  onCheckAvailability 
}: StickyCheckAvailabilityProps) {
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const offsetTop = window.visualViewport.offsetTop;
        const layoutHeight = window.innerHeight;
        const visualHeight = window.visualViewport.height;
        
        // Calculate how much the viewport has been pushed up by browser chrome
        const offset = Math.max(0, layoutHeight - visualHeight - offsetTop);
        setBottomOffset(offset);
      }
    };

    handleResize();
    
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  return (
    <div 
      className="fixed left-0 right-0 z-50 bg-white border-t border-zinc-200 shadow-[0_-2px_8px_rgba(0,0,0,0.1)] px-4 py-4 flex items-center justify-between gap-4"
      style={{ 
        bottom: `${bottomOffset}px`,
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        transition: "bottom 0.2s ease-out"
      }}
    >
      <div>
        <div className="text-lg font-semibold text-zinc-900">{price}</div>
        <div className="text-xs text-zinc-600">per night</div>
      </div>
      
      <button
        onClick={onCheckAvailability}
        className="bg-teal-700 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-teal-800 active:scale-95 transition-all whitespace-nowrap"
      >
        Check availability
      </button>
    </div>
  );
}
