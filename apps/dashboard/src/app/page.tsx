"use client";

import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import {
  AnalyticsSummary,
  Booking,
  Property,
  Inquiry,
  Transaction,
  InventoryItem,
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
import { PropertyAvailabilityCard } from "../components/dashboard/PropertyAvailabilityCard";
import { PropertyFinancialBreakdown } from "../components/dashboard/PropertyFinancialBreakdown";
import { ReimbursementsCard } from "../components/dashboard/ReimbursementsCard";
import { LowStockAlertCard } from "../components/dashboard/LowStockAlertCard";
import { AddRevenueModal } from "../components/finance/AddRevenueModal";
import { AddExpenseModal } from "../components/finance/AddExpenseModal";

type DashboardData = {
  analytics: AnalyticsSummary | null;
  recentBookings: Booking[];
  upcomingCheckIns: Booking[];
  upcomingCheckOuts: Booking[];
  upcomingActiveBookings: Booking[];
  properties: Property[];
  inquiries: Inquiry[];
  transactions: Transaction[];
  lowStockItems: InventoryItem[];
};

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    analytics: null,
    recentBookings: [],
    upcomingCheckIns: [],
    upcomingCheckOuts: [],
    upcomingActiveBookings: [],
    properties: [],
    inquiries: [],
    transactions: [],
    lowStockItems: [],
  });
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [unblockError, setUnblockError] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [showLogRevenue, setShowLogRevenue] = useState(false);
  const [showLogExpense, setShowLogExpense] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const month = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;

    try {
      const [
        analyticsRes,
        bookingsRes,
        propertiesRes,
        inquiriesRes,
        transactionsRes,
        lowStockRes,
      ] = await Promise.allSettled([
        apiGet<AnalyticsSummary>(`/analytics/summary?month=${month}`),
        apiGet<Booking[]>("/bookings"),
        apiGet<Property[]>("/properties"),
        apiGet<{ success: boolean; data: Inquiry[] }>("/inquiries"),
        apiGet<Transaction[]>(`/transactions?month=${month}`),
        apiGet<InventoryItem[]>("/inventory?lowStock=true"),
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
        const transactions = transactionsRes.status === "fulfilled" ? transactionsRes.value : [];
        const lowStockItems = lowStockRes.status === "fulfilled" ? lowStockRes.value : [];

        // Upcoming check-ins & check-outs within the next 30 days
        // Use Date objects to correctly compare Prisma ISO datetime strings
        const todayDate = new Date(today);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + 30);

        const upcomingCheckIns = allBookings.filter((b) => {
          const d = new Date(b.checkInDate);
          return (
            d >= todayDate &&
            d <= cutoff &&
            (b.status === "CONFIRMED" || b.status === "PENDING")
          );
        });

        const upcomingCheckOuts = allBookings.filter((b) => {
          const d = new Date(b.checkOutDate);
          return (
            d >= todayDate &&
            d <= cutoff &&
            (b.status === "CONFIRMED" || b.status === "CHECKED_IN")
          );
        });

        // Upcoming active bookings for the availability card
        const upcomingActiveBookings = allBookings.filter((b) => {
          const isActive =
            b.status === "PENDING" ||
            b.status === "CONFIRMED" ||
            b.status === "CHECKED_IN";
          const isNotPast = new Date(b.checkOutDate) >= todayDate;
          return isActive && isNotPast;
        });

        // Get recent bookings (sort by latest first)
        const recentBookings = [...allBookings]
          .sort((a, b) => {
            const dateA = new Date(a.checkInDate).getTime();
            const dateB = new Date(b.checkInDate).getTime();
            return dateB - dateA;
          })
          .slice(0, 10);

        setData({
          analytics,
          recentBookings,
          upcomingCheckIns,
          upcomingCheckOuts,
          upcomingActiveBookings,
          properties,
          inquiries,
          transactions,
          lowStockItems,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleUnblockBooking = async (bookingId: string) => {
    setUnblockingId(bookingId);
    setUnblockError(null);
    setCancelSuccessMsg(null);
    try {
      await apiPatch(`/bookings/${bookingId}/status`, { status: "CANCELLED" });

      // Optimistic removal from availability card
      const cancelled = data.upcomingActiveBookings.find((b) => b.id === bookingId);
      setData((prev) => ({
        ...prev,
        upcomingActiveBookings: prev.upcomingActiveBookings.filter(
          (b) => b.id !== bookingId,
        ),
      }));

      // Show success feedback
      setCancelSuccessMsg(
        "Booking cancelled. Your Airbnb calendar will update on its next sync (up to 30 min).",
      );
      setTimeout(() => setCancelSuccessMsg(null), 6000);

      // Fire-and-forget: trigger Airbnb pull-sync for the property
      if (cancelled?.propertyId) {
        apiGet<{ id: string } | null>(
          `/calendar-syncs/property/${cancelled.propertyId}`,
        )
          .then((sync) => {
            if (sync?.id) {
              return apiPost(`/calendar-syncs/${sync.id}/sync`, {});
            }
          })
          .catch(() => {}); // silently ignore if no sync is configured
      }
    } catch (err) {
      setUnblockError((err as Error).message);
    } finally {
      setUnblockingId(null);
    }
  };

  // Calculate stats
  const totalBookings = data.recentBookings.length;
  const activeGuests = data.recentBookings.filter(
    (b) => b.status === "CHECKED_IN" || b.status === "CONFIRMED",
  ).length;
  const monthlyRevenue = data.analytics?.totals.reduce(
    (sum, item) => sum + item.revenue,
    0,
  ) || 0;
  const monthlyExpenses = data.analytics?.totals.reduce(
    (sum, item) => sum + item.expense,
    0,
  ) || 0;
  const activeProperties = data.properties.filter(
    (p) => p.status === "ACTIVE",
  ).length;

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Dashboard Overview
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </p>
          </header>

          {/* Quick Log Actions */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <button
              onClick={() => setShowLogRevenue(true)}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 sm:px-5 py-3 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Revenue</p>
                <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">Record income received</p>
              </div>
            </button>
            <button
              onClick={() => setShowLogExpense(true)}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 sm:px-5 py-3 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
            >
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Expense</p>
                <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">Record a cost or payment</p>
              </div>
            </button>
          </div>

          {/* Financial Overview — stats + summary side by side */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Revenue (Month)"
              value={monthlyRevenue.toLocaleString()}
              subtitle="Current month"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Expenses (Month)"
              value={monthlyExpenses.toLocaleString()}
              subtitle="Current month"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <FinancialSummaryCard
              summary={data.analytics}
              loading={loading}
            />
          </div>

          {/* Outstanding Reimbursements */}
          <div className="mb-6">
            <ReimbursementsCard
              transactions={data.transactions}
              loading={loading}
              onReimbursed={loadDashboardData}
            />
          </div>

          {/* Low Stock Alerts */}
          <div className="mb-6">
            <LowStockAlertCard
              items={data.lowStockItems}
              loading={loading}
              onRestocked={loadDashboardData}
            />
          </div>

          {/* Property Financial Breakdown */}
          <div className="mb-6">
            <PropertyFinancialBreakdown
              transactions={data.transactions}
              properties={data.properties}
              loading={loading}
            />
          </div>

          {/* Upcoming Events + Recent Activity */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UpcomingEventsCard
              checkIns={data.upcomingCheckIns}
              checkOuts={data.upcomingCheckOuts}
              loading={loading}
            />
            <RecentActivityCard
              bookings={data.recentBookings}
              loading={loading}
            />
          </div>

          {/* Inquiries + Properties Overview + Quick Actions */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InquiriesCard inquiries={data.inquiries} loading={loading} />
            <QuickActionsCard />
          </div>

          <div className="mb-6">
            <PropertiesOverviewCard
              properties={data.properties}
              loading={loading}
            />
          </div>

          {/* Property Availability */}
          <div className="mb-6">
            <PropertyAvailabilityCard
              bookings={data.upcomingActiveBookings}
              properties={data.properties}
              onUnblock={handleUnblockBooking}
              unblockingId={unblockingId}
              error={unblockError}
              successMsg={cancelSuccessMsg}
              loading={loading}
            />
          </div>

          {/* Operational stats — moved below financial content */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              title="Total Bookings"
              value={totalBookings}
              subtitle="All time"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Active Guests"
              value={activeGuests}
              subtitle="Currently staying"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Modals */}
        <AddRevenueModal
          isOpen={showLogRevenue}
          onClose={() => setShowLogRevenue(false)}
          onSuccess={() => { setShowLogRevenue(false); loadDashboardData(); }}
        />
        <AddExpenseModal
          isOpen={showLogExpense}
          onClose={() => setShowLogExpense(false)}
          onSuccess={() => { setShowLogExpense(false); loadDashboardData(); }}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
