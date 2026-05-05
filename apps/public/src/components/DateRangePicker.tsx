"use client";

import { useState, useMemo } from "react";
import type { BlockedDateRange } from "@/lib/types";

type DateRangePickerProps = {
  checkInDate: string;
  checkOutDate: string;
  minDate: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  blockedDates?: BlockedDateRange[];
};

export function DateRangePicker({
  checkInDate,
  checkOutDate,
  minDate,
  onCheckInChange,
  onCheckOutChange,
  blockedDates = [],
}: DateRangePickerProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    if (checkInDate) {
      const date = new Date(checkInDate);
      return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    
    // If no check-in or selecting before current check-in, set as check-in
    if (!checkInDate || dateStr < checkInDate) {
      onCheckInChange(dateStr);
      onCheckOutChange("");
    }
    // If check-in is set but no check-out, set as check-out
    else if (checkInDate && !checkOutDate) {
      onCheckOutChange(dateStr);
    }
    // If both are set, start over with new check-in
    else {
      onCheckInChange(dateStr);
      onCheckOutChange("");
    }
  };

  const blockedSet = useMemo(() => {
    const set = new Set<string>();
    for (const range of blockedDates) {
      const start = new Date(range.checkInDate);
      const end = new Date(range.checkOutDate);
      const cursor = new Date(start);
      while (cursor < end) {
        set.add(cursor.toISOString().split("T")[0]);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return set;
  }, [blockedDates]);

  const isDateBlocked = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return blockedSet.has(dateStr);
  };

  const isDateDisabled = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return dateStr < minDate || blockedSet.has(dateStr);
  };

  const isCheckIn = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return dateStr === checkInDate;
  };

  const isCheckOut = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return dateStr === checkOutDate;
  };

  const isInRange = (date: Date) => {
    if (!checkInDate || !checkOutDate) return false;
    const dateStr = date.toISOString().split("T")[0];
    return dateStr > checkInDate && dateStr < checkOutDate;
  };

  const goToPrevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const monthName = viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const days = getDaysInMonth(viewMonth);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "Add date";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="w-full">
      {/* Date Display */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border-2 border-zinc-200 p-3 bg-white">
          <div className="text-xs font-semibold text-zinc-500 mb-1">Check-in</div>
          <div className="text-sm font-bold text-zinc-900">{formatDisplayDate(checkInDate)}</div>
        </div>
        <div className="rounded-xl border-2 border-zinc-200 p-3 bg-white">
          <div className="text-xs font-semibold text-zinc-500 mb-1">Check-out</div>
          <div className="text-sm font-bold text-zinc-900">{formatDisplayDate(checkOutDate)}</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border-2 border-zinc-200 p-3 sm:p-4 bg-white">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-base font-bold text-zinc-900">{monthName}</span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-zinc-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }

            const disabled = isDateDisabled(date);
            const blocked = isDateBlocked(date);
            const checkIn = isCheckIn(date);
            const checkOut = isCheckOut(date);
            const inRange = isInRange(date);

            let backgroundColor = "#f4f4f5";
            let color = "#18181b";
            let textDecoration = "none";
            
            if (blocked) {
              backgroundColor = "#fef2f2";
              color = "#ef4444";
              textDecoration = "line-through";
            } else if (disabled) {
              backgroundColor = "transparent";
              color = "#d4d4d8";
            } else if (checkIn || checkOut) {
              backgroundColor = "#0f766e";
              color = "white";
            } else if (inRange) {
              backgroundColor = "#ccfbf1";
              color = "#18181b";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && handleDateSelect(date)}
                className="aspect-square w-full min-h-[36px] flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed"
                style={{
                  backgroundColor,
                  color,
                  textDecoration,
                }}
                title={blocked ? "Not available" : undefined}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
