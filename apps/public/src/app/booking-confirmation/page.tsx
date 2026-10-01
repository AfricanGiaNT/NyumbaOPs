import Link from 'next/link';

export default function BookingConfirmationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 text-zinc-900">
      <h1 className="text-2xl font-semibold">Booking requests are confirmed by our team</h1>
      <p className="mt-3 text-zinc-600">If you have already sent a request, we will contact you to confirm the dates and payment arrangements. For help with an existing booking, please contact the property team directly.</p>
      <Link className="mt-6 font-semibold text-teal-700" href="/properties">Browse properties</Link>
    </main>
  );
}
