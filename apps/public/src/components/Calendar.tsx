"use client";

import { useState, useMemo } from "react";
import type { BlockedDateRange } from "@/lib/types";

type CalendarProps = {
  selectedDate: string;
  minDate: string;
  onSelectDate: (date: string) => void;
  label?: string;
  blockedDates?: BlockedDateRange[];
};

export function Calendar({ selectedDate, minDate, onSelectDate, label, blockedDates = [] }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      const date = new Date(selectedDate);
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
    onSelectDate(dateStr);
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

  const isSelected = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return dateStr === selectedDate;
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

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-zinc-700 mb-3">
          {label}
        </label>
      )}
      
      <div className="rounded-xl border-2 border-zinc-200 p-4 bg-white">
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
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-bold text-zinc-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }

            const disabled = isDateDisabled(date);
            const blocked = isDateBlocked(date);
            const selected = isSelected(date);

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && handleDateSelect(date)}
                className="aspect-square flex items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: selected ? "#0f766e" : blocked ? "#fef2f2" : disabled ? "transparent" : "#f4f4f5",
                  color: selected ? "white" : blocked ? "#ef4444" : disabled ? "#d4d4d8" : "#18181b",
                  textDecoration: blocked ? "line-through" : "none",
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
