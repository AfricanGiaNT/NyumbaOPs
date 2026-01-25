import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about booking and stays.",
};

const faqItems = [
  {
    question: "How do I book an apartment?",
    answer:
      "Browse our properties, select your dates, and send a booking request. We'll call you within 2 hours to confirm availability.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "Airtel Money, TNM Mpamba, Bank Transfer, and Cash.",
  },
  {
    question: "What time is check-in?",
    answer: "Standard check-in is 2:00 PM. We can arrange earlier check-in if available.",
  },
];

export default function FaqPage() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 pb-10 pt-12">
        <h1 className="text-3xl font-semibold">Frequently Asked Questions</h1>
        <p className="mt-2 text-[var(--muted)]">
          Quick answers to common questions about booking and staying with us.
        </p>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <p className="font-semibold">{item.question}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
