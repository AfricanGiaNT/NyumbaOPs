"use client";

import Link from "next/link";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { InquiryList } from "../../components/InquiryList";

export default function InquiriesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 px-8 py-10 text-zinc-900">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Inquiries</h1>
              <p className="text-sm text-zinc-600">Track and convert new requests.</p>
            </div>
            <Link
              href="/bookings"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              View bookings
            </Link>
          </header>

          <InquiryList />
        </div>
      </div>
    </ProtectedRoute>
  );
}
