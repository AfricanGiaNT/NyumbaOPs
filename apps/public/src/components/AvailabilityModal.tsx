"use client";

import { useEffect, useState } from "react";
import { MobileAvailabilitySheet } from "./MobileAvailabilitySheet";
import { DesktopAvailabilityModal } from "./DesktopAvailabilityModal";

type AvailabilityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
};

export function AvailabilityModal(props: AvailabilityModalProps) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile ? (
    <MobileAvailabilitySheet {...props} />
  ) : (
    <DesktopAvailabilityModal {...props} />
  );
}
