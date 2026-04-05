import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Nyumba Stays – Short-term Apartments in Lilongwe",
  description:
    "Book comfortable, verified apartments in Lilongwe. WiFi, parking, and local support included. No booking fees.",
  openGraph: {
    title: "Nyumba Stays – Short-term Apartments in Lilongwe",
    description:
      "Browse verified apartments in Lilongwe with transparent pricing and local support.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
