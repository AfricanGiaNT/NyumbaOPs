"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import { Booking, Inquiry } from "@/lib/types";

type NotifState = {
  newInquiries: number;
  upcomingCheckIns: number;
  loaded: boolean;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifState>({
    newInquiries: 0,
    upcomingCheckIns: 0,
    loaded: false,
  });
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const [inquiriesRes, bookingsRes] = await Promise.allSettled([
        apiGet<{ success: boolean; data: Inquiry[] }>("/inquiries"),
        apiGet<Booking[]>("/bookings"),
      ]);

      const newInquiries =
        inquiriesRes.status === "fulfilled"
          ? (inquiriesRes.value.data ?? []).filter((i) => i.status === "NEW").length
          : 0;

      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const upcomingCheckIns =
        bookingsRes.status === "fulfilled"
          ? bookingsRes.value.filter((b) => {
              const d = new Date(b.checkInDate);
              return (
                d >= now &&
                d <= in24h &&
                (b.status === "CONFIRMED" || b.status === "PENDING")
              );
            }).length
          : 0;

      setNotifs({ newInquiries, upcomingCheckIns, loaded: true });
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const total = notifs.newInquiries + notifs.upcomingCheckIns;
  const badge = total > 9 ? "9+" : total > 0 ? String(total) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Notifications
            </p>
          </div>

          {!notifs.loaded && (
            <div className="px-4 py-6 text-center text-sm text-zinc-400">
              Loading…
            </div>
          )}

          {notifs.loaded && total === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
              All caught up!
            </div>
          )}

          {notifs.loaded && total > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifs.newInquiries > 0 && (
                <li>
                  <Link
                    href="/inquiries"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-lg">📩</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {notifs.newInquiries} new{" "}
                        {notifs.newInquiries === 1 ? "inquiry" : "inquiries"}
                      </span>{" "}
                      awaiting response
                    </span>
                  </Link>
                </li>
              )}
              {notifs.upcomingCheckIns > 0 && (
                <li>
                  <Link
                    href="/bookings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-lg">🏠</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {notifs.upcomingCheckIns} check-in
                        {notifs.upcomingCheckIns > 1 ? "s" : ""}
                      </span>{" "}
                      in the next 24 hours
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
