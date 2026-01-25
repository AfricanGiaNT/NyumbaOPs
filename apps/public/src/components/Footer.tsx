export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 text-sm text-[var(--muted)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-[var(--foreground)]">Nyumba Stays</p>
          <p>Lilongwe, Malawi</p>
          <p>Operating since 2024</p>
        </div>
        <div className="space-y-1">
          <p>Call: 09XX XXX XXX</p>
          <p>Email: hello@nyumbastays.com</p>
        </div>
        <div className="flex gap-4">
          <a href="/terms" className="underline-offset-4 hover:underline">
            Terms
          </a>
          <a href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </a>
          <a href="/faq" className="underline-offset-4 hover:underline">
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}
