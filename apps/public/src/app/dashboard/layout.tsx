import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/dashboard/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NyumbaOps Dashboard",
  description: "Property and financial management dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
