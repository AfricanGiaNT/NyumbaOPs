import Link from 'next/link';

export default function CancelBookingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 text-zinc-900">
      <h1 className="text-2xl font-semibold">Contact us about a booking</h1>
      <p className="mt-3 text-zinc-600">Please contact the property team to change or cancel a booking. We will confirm the next steps with you.</p>
      <Link className="mt-6 font-semibold text-teal-700" href="/properties">Browse properties</Link>
    </main>
  );
}
