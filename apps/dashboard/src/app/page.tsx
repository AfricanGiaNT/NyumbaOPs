"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import {
  AnalyticsSummary,
  Booking,
  Property,
  Inquiry,
} from "../lib/types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "@/lib/AuthContext";
import { StatCard } from "../components/dashboard/StatCard";
import { UpcomingEventsCard } from "../components/dashboard/UpcomingEventsCard";
import { RecentActivityCard } from "../components/dashboard/RecentActivityCard";
import { FinancialSummaryCard } from "../components/dashboard/FinancialSummaryCard";
import { InquiriesCard } from "../components/dashboard/InquiriesCard";
import { PropertiesOverviewCard } from "../components/dashboard/PropertiesOverviewCard";
import { QuickActionsCard } from "../components/dashboard/QuickActionsCard";

type DashboardData = {
  analytics: AnalyticsSummary | null;
  recentBookings: Booking[];
  todayCheckIns: Booking[];
  todayCheckOuts: Booking[];
  properties: Property[];
  inquiries: Inquiry[];
};

export default function Home() {
  const { signOut, user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    analytics: null,
    recentBookings: [],
    todayCheckIns: [],
    todayCheckOuts: [],
    properties: [],
    inquiries: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const month = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;

      try {
        const [
          analyticsRes,
          bookingsRes,
          propertiesRes,
          inquiriesRes,
        ] = await Promise.allSettled([
          apiGet<AnalyticsSummary>(`/analytics/summary?month=${month}`),
          apiGet<Booking[]>("/bookings"),
          apiGet<Property[]>("/properties"),
          apiGet<{ success: boolean; data: Inquiry[] }>("/inquiries"),
        ]);

        const analytics = analyticsRes.status === "fulfilled" ? analyticsRes.value : null;
        const allBookings = bookingsRes.status === "fulfilled" ? bookingsRes.value : [];
        const properties = propertiesRes.status === "fulfilled" ? propertiesRes.value : [];
        const inquiries =
          inquiriesRes.status === "fulfilled"
            ? inquiriesRes.value.data?.filter(
                (i) => i.status === "NEW" || i.status === "CONTACTED",
              ) || []
            : [];

        // Filter today's check-ins and check-outs
        const todayCheckIns = allBookings.filter(
          (b) => b.checkInDate === today,
        );
        const todayCheckOuts = allBookings.filter(
          (b) => b.checkOutDate === today,
        );

        // Get recent bookings (sort by latest first)
        const recentBookings = [...allBookings]
          .sort((a, b) => {
            // If there's a createdAt field, use it; otherwise use checkInDate
            const dateA = new Date(a.checkInDate).getTime();
            const dateB = new Date(b.checkInDate).getTime();
            return dateB - dateA;
          })
          .slice(0, 10);

        setData({
          analytics,
          recentBookings,
          todayCheckIns,
          todayCheckOuts,
          properties,
          inquiries,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calculate stats
  const totalBookings = data.recentBookings.length;
  const activeGuests = data.recentBookings.filter(
    (b) => b.status === "CHECKED_IN" || b.status === "CONFIRMED",
  ).length;
  const monthlyRevenue = data.analytics?.totals.reduce(
    (sum, item) => sum + item.revenue,
    0,
  ) || 0;
  const activeProperties = data.properties.filter(
    (p) => p.status === "ACTIVE",
  ).length;
  const occupancyRate =
    data.properties.length > 0
      ? Math.round((activeGuests / data.properties.length) * 100)
      : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">
                Dashboard Overview
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
              >
                Home
              </Link>
              <Link
                href="/properties"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Properties
              </Link>
              <Link
                href="/guests"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Guests
              </Link>
              <Link
                href="/bookings"
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Bookings
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                Sign out
              </button>
            </div>
          </header>

          {/* Stats Grid - 4 columns */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Bookings"
              value={totalBookings}
              subtitle="All time"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <StatCard
              title="Active Guests"
              value={activeGuests}
              subtitle="Currently staying"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              }
            />
            <StatCard
              title="Revenue (Month)"
              value={monthlyRevenue.toLocaleString()}
              subtitle="Current month"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              title="Occupancy Rate"
              value={`${occupancyRate}%`}
              subtitle={`${activeProperties} active properties`}
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              }
            />
          </div>

          {/* Main Content Grid - 2 columns */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UpcomingEventsCard
              checkIns={data.todayCheckIns}
              checkOuts={data.todayCheckOuts}
              loading={loading}
            />
            <RecentActivityCard
              bookings={data.recentBookings}
              loading={loading}
            />
          </div>

          {/* Secondary Content Grid - 2 columns */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FinancialSummaryCard
              summary={data.analytics}
              loading={loading}
            />
            <InquiriesCard inquiries={data.inquiries} loading={loading} />
          </div>

          {/* Tertiary Content Grid - 2 columns */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PropertiesOverviewCard
              properties={data.properties}
              loading={loading}
            />
            <QuickActionsCard />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
