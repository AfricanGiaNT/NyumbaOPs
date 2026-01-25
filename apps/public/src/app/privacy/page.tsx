import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Nyumba Stays.",
};

export default function PrivacyPage() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-12">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Last updated: Jan 2026</p>
        <div className="mt-6 space-y-4 text-sm text-[var(--muted)]">
          <p>
            We collect basic contact information to manage booking requests and provide
            support. We do not sell personal data or share it for marketing by third parties.
          </p>
          <p>
            Your information is stored securely and used only to manage your booking and
            respond to inquiries.
          </p>
          <p>
            Contact us if you need access to your data or have questions about this policy.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
