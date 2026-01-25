import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Nyumba Stays bookings.",
};

export default function TermsPage() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-12">
        <h1 className="text-3xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Last updated: Jan 2026</p>
        <div className="mt-6 space-y-4 text-sm text-[var(--muted)]">
          <p>
            These Terms govern your use of Nyumba Stays. By making a booking request,
            you agree to these terms.
          </p>
          <p>
            Booking confirmations are provided after we verify availability and payment
            details. Deposit requirements and payment methods are shared during confirmation.
          </p>
          <p>
            Please contact us with any questions before booking. We are committed to
            providing a safe, clean, and comfortable stay.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
