const trustItems = [
  {
    title: "Verified Properties",
    description: "Every apartment personally inspected before listing.",
  },
  {
    title: "Secure & Clean",
    description: "Professional cleaning between every guest.",
  },
  {
    title: "Local Support",
    description: "Based in Lilongwe — help is a call away.",
  },
  {
    title: "Fair Prices",
    description: "No hidden fees. What you see is what you pay.",
  },
];

export function TrustSection() {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Why Book With Us?</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {trustItems.map((item) => (
          <div key={item.title}>
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm text-[var(--muted)]">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
