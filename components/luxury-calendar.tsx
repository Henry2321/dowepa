"use client";

import { useEffect, useMemo, useState } from "react";

type LuxuryCalendarProps = {
  selectedDate: string | null;
  onSelect: (date: string) => void;
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthGrid(date: Date) {
  const monthStart = startOfMonth(date);
  const month = monthStart.getMonth();
  const weekdayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);

  gridStart.setDate(monthStart.getDate() - weekdayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);

    return {
      value: toIsoDate(current),
      label: current.getDate(),
      isCurrentMonth: current.getMonth() === month
    };
  });
}

export function LuxuryCalendar({
  selectedDate,
  onSelect
}: LuxuryCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);
  const minMonth = useMemo(() => startOfMonth(today), [today]);
  const [viewMonth, setViewMonth] = useState(
    selectedDate ? startOfMonth(fromIsoDate(selectedDate)) : minMonth
  );

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setViewMonth(startOfMonth(fromIsoDate(selectedDate)));
  }, [selectedDate]);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const canGoPrevious =
    viewMonth.getFullYear() > minMonth.getFullYear() ||
    (viewMonth.getFullYear() === minMonth.getFullYear() &&
      viewMonth.getMonth() > minMonth.getMonth());

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(viewMonth);

  return (
    <div className="rounded-[28px] border border-[#dcc7b1] bg-white/78 p-5 shadow-[0_16px_42px_rgba(169,130,94,0.08)]">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a1714c]">
            Preferred Consultation Date
          </p>
          <h3 className="mt-2 text-2xl font-semibold capitalize text-[#403429] sm:text-[1.85rem]">
            {monthLabel}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}
            disabled={!canGoPrevious}
            className="booking-secondary inline-flex h-11 w-11 items-center justify-center rounded-full text-lg disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}
            className="booking-secondary inline-flex h-11 w-11 items-center justify-center rounded-full text-lg"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9f8d7d]"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const isPast = day.value < todayIso;
          const isSelected = day.value === selectedDate;

          return (
            <button
              key={day.value}
              type="button"
              onClick={() => onSelect(day.value)}
              disabled={isPast}
              className={[
                "flex aspect-square flex-col items-center justify-center rounded-[18px] border text-sm transition",
                day.isCurrentMonth
                  ? "border-[#e6d7c8] bg-[#fffdfa] text-[#4a3c31]"
                  : "border-transparent bg-transparent text-[#c8b5a0]",
                !isPast && !isSelected && day.isCurrentMonth
                  ? "hover:border-[#d5b699] hover:bg-[#fcf4eb]"
                  : "",
                isSelected
                  ? "border-[#b1784d] bg-[#b1784d] text-white shadow-[0_14px_28px_rgba(177,120,77,0.22)]"
                  : "",
                isPast ? "cursor-not-allowed opacity-40" : ""
              ].join(" ")}
            >
              <span className="font-medium">{day.label}</span>
              <span
                className={[
                  "mt-1 h-1.5 w-1.5 rounded-full",
                  isSelected
                    ? "bg-white"
                    : day.isCurrentMonth
                      ? "bg-[#e0cfbe]"
                      : "bg-transparent"
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#8a7766]">
        <button
          type="button"
          onClick={() => onSelect(todayIso)}
          className="booking-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          Select Today
        </button>
        <span>Past dates are automatically locked to avoid scheduling conflicts.</span>
      </div>
    </div>
  );
}
