"use client";

import Link from "next/link";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { InquiryList } from "../../components/InquiryList";
import { AppLayout } from "@/components/layout/AppLayout";

export default function InquiriesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Inquiries</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Track and convert new requests.</p>
            </div>
            <Link
              href="/bookings"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              View bookings
            </Link>
          </header>

          <InquiryList />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
