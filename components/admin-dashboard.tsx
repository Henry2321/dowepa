"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  updateBookingStatus,
  updateConsultationSchedule,
  type AdminBookingRequest,
  type RequestStatus,
} from "@/app/actions/wedding-bookings";
import {
  loadQuotation,
  saveQuotation,
  type QuotationItem,
} from "@/app/actions/quotation-actions";

function formatShortDate(value: string) {
  if (!value) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatLongDate(value: string) {
  if (!value) {
    return "Not updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatSubmittedAt(value: string | null) {
  if (!value) {
    return "No submission time";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGuestLabel(request: AdminBookingRequest) {
  return `${request.groomName} & ${request.brideName}`;
}

function getPrimaryWeddingDate(request: AdminBookingRequest) {
  return request.preferredWeddingDates[0] ?? "";
}

function getStatusMeta(status: RequestStatus) {
  if (status === "confirmed") {
    return {
      label: "Confirmed",
      className: "border-[#bdd7cb] bg-[#eef8f2] text-[#356455]",
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      className: "border-[#e7c4b7] bg-[#fff1eb] text-[#a15642]",
    };
  }

  return {
    label: "Pending",
    className: "border-[#dcc7b1] bg-[#f8ecdf] text-[#a1714c]",
  };
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = getStatusMeta(status);

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="booking-shell rounded-[24px] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a1714c]">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-[#403429]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-7 text-[#776757]">{subtext}</p>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#dcc7b1] bg-white/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c846d]">
        {label}
      </p>
      <p className="mt-2 text-base leading-7 text-[#43372c]">{value}</p>
    </div>
  );
}

type ModalTab = "details" | "quotation";
type DashboardView = "list" | "calendar";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: string | null; day: number | null }[] = [];
  for (let i = 0; i < offset; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: toIsoDate(new Date(year, month, d)), day: d });
  }
  return cells;
}

function CalendarView({
  requests,
  onSelectDate,
}: {
  requests: AdminBookingRequest[];
  onSelectDate: (id: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, AdminBookingRequest[]>();
    for (const req of requests) {
      if (!req.consultationDate) continue;
      const list = map.get(req.consultationDate) ?? [];
      list.push(req);
      map.set(req.consultationDate, list);
    }
    return map;
  }, [requests]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(viewYear, viewMonth),
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div className="booking-shell rounded-[28px] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a1714c]">Calendar View</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#403429]">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="booking-secondary inline-flex h-10 w-10 items-center justify-center rounded-full text-lg"
          >‹</button>
          <button
            type="button"
            onClick={nextMonth}
            className="booking-secondary inline-flex h-10 w-10 items-center justify-center rounded-full text-lg"
          >›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c846d]">
            {label}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell.date) return <div key={i} />;
          const dayBookings = bookingsByDate.get(cell.date) ?? [];
          const hasConfirmed = dayBookings.some((r) => r.status === "confirmed");
          const hasPending = dayBookings.some((r) => r.status === "pending");
          const isToday = cell.date === toIsoDate(today);
          return (
            <div
              key={cell.date}
              className={[
                "min-h-[72px] rounded-[14px] border p-1.5 text-left transition",
                isToday ? "border-[#b1784d] bg-[#fff4ea]" : "border-[#e6d7c8] bg-[#fffdfa]",
                dayBookings.length > 0 ? "cursor-pointer hover:border-[#b1784d] hover:bg-[#fcf4eb]" : "",
              ].join(" ")}
            >
              <p className={`text-xs font-semibold ${isToday ? "text-[#b1784d]" : "text-[#4a3c31]"}`}>
                {cell.day}
              </p>
              <div className="mt-1 flex flex-col gap-0.5">
                {dayBookings.slice(0, 3).map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => onSelectDate(req.id)}
                    className={[
                      "w-full truncate rounded-[8px] px-1.5 py-0.5 text-left text-[10px] font-semibold leading-tight",
                      req.status === "confirmed"
                        ? "bg-[#eef8f2] text-[#356455]"
                        : req.status === "rejected"
                          ? "bg-[#fff1eb] text-[#a15642]"
                          : "bg-[#f8ecdf] text-[#a1714c]",
                    ].join(" ")}
                  >
                    {req.groomName} & {req.brideName}
                  </button>
                ))}
                {dayBookings.length > 3 ? (
                  <p className="px-1 text-[10px] text-[#9c846d]">+{dayBookings.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#776757]">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#f8ecdf]"/> Pending</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#eef8f2]"/> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#fff1eb]"/> Rejected</span>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function QuotationTab({ bookingId }: { bookingId: string }) {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const nextIdRef = useRef(1);

  useEffect(() => {
    setIsLoading(true);
    loadQuotation(bookingId).then((result) => {
      if (result.success && result.items.length > 0) {
        setItems(result.items.map((item) => ({
          ...item,
          unitPrice: String(item.unitPrice),
          quantity: String(item.quantity),
        })));
        nextIdRef.current = result.items.length + 1;
      }
      setIsLoading(false);
    });
  }, [bookingId]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: String(nextIdRef.current++), serviceName: "", unitPrice: "", quantity: "1" },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem<K extends keyof QuotationItem>(id: string, field: K, value: QuotationItem[K]) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  const total = items.reduce((sum, item) => sum + (parseFloat(String(item.unitPrice)) || 0) * (parseInt(String(item.quantity)) || 0), 0);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    const normalized = items.map((item) => ({
      ...item,
      unitPrice: parseFloat(String(item.unitPrice)) || 0,
      quantity: parseInt(String(item.quantity)) || 0,
    }));
    const result = await saveQuotation(bookingId, normalized);
    setMessage(result.success ? { text: "Quotation saved & status set to Sent.", ok: true } : { text: result.message, ok: false });
    setIsSaving(false);
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-[#776757]">Loading quotation...</p>;
  }

  return (
    <div className="mt-6 space-y-5">
      {message ? (
        <div className={`rounded-[16px] border px-4 py-3 text-sm leading-7 ${
          message.ok
            ? "border-[#bdd7cb] bg-[#eef8f2] text-[#356455]"
            : "border-[#e7c4b7] bg-[#fff1eb] text-[#a15642]"
        }`}>
          {message.text}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[20px] border border-[#dcc7b1] bg-white/75">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-[#f8f0e7]">
            <tr className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c846d]">
              <th className="px-4 py-3">Service Name</th>
              <th className="px-4 py-3">Unit Price (USD)</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-[#776757]">
                  No services added yet. Click &quot;Add Service&quot; to begin.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-[#e5d5c4]">
                  <td className="px-4 py-3">
                    <input
                      className="w-full rounded-[12px] border border-[#dcc7b1] bg-white px-3 py-2 text-sm text-[#43372c] outline-none focus:border-[#b1784d]"
                      placeholder="e.g. Ballroom Rental"
                      value={item.serviceName}
                      onChange={(e) => updateItem(item.id, "serviceName", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full rounded-[12px] border border-[#dcc7b1] bg-white px-3 py-2 text-sm text-[#43372c] outline-none focus:border-[#b1784d]"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-24 rounded-[12px] border border-[#dcc7b1] bg-white px-3 py-2 text-sm text-[#43372c] outline-none focus:border-[#b1784d]"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#43372c]">
                    {formatCurrency((parseFloat(String(item.unitPrice)) || 0) * (parseInt(String(item.quantity)) || 0))}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-full border border-[#e7c4b7] bg-[#fff1eb] px-3 py-1 text-xs font-semibold text-[#a15642] hover:bg-[#ffe7df]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addItem}
          className="booking-secondary rounded-full px-5 py-2.5 text-sm font-semibold"
        >
          + Add Service
        </button>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c846d]">Total</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#403429]">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="border-t border-[#dcc7b1] pt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={isSaving}
            className="booking-primary rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Quotation"}
          </button>
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={isSaving}
            className="rounded-full px-6 py-3 text-sm font-semibold text-[#5c4a00] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #f5c842 0%, #e6a817 100%)", boxShadow: "0 2px 12px rgba(230,168,23,0.35)" }}
          >
            ✉ Send to Customer
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({
  initialRequests,
  initialError = null,
}: {
  initialRequests: AdminBookingRequest[];
  initialError?: string | null;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [view, setView] = useState<DashboardView>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("details");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(initialError);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const selectedRequest =
    requests.find((request) => request.id === selectedId) ?? null;
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const confirmedCount = requests.filter((request) => request.status === "confirmed").length;
  const updatedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
        setActiveTab("details");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedRequest]);

  function handleOpenModal(id: string) {
    const req = requests.find((r) => r.id === id);
    setSelectedId(id);
    setActiveTab("details");
    setEditDate(req?.consultationDate ?? "");
    setEditTime(req?.consultationTime ?? "");
    setScheduleMessage(null);
  }

  async function handleSaveSchedule() {
    if (!selectedRequest) return;
    setIsSavingSchedule(true);
    setScheduleMessage(null);
    const result = await updateConsultationSchedule(selectedRequest.id, editDate, editTime);
    if (result.success) {
      setRequests((current) =>
        current.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, consultationDate: editDate, consultationTime: editTime }
            : r,
        ),
      );
      setScheduleMessage({ text: "Schedule updated successfully.", ok: true });
    } else {
      setScheduleMessage({ text: result.message ?? "Update failed.", ok: false });
    }
    setIsSavingSchedule(false);
  }

  async function handleUpdateRequestStatus(status: RequestStatus) {
    if (!selectedRequest) {
      return;
    }

    setIsUpdatingStatus(true);
    setFeedbackMessage(null);

    try {
      const result = await updateBookingStatus(selectedRequest.id, status);

      if (!result.success) {
        setFeedbackMessage(result.message);
        return;
      }

      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id ? { ...request, status: result.status } : request,
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <main className="booking-page px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="booking-shell rounded-[28px] px-6 py-7 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a1714c]">
                Marriott Staff Console
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#403429] sm:text-[2.35rem]">
                Admin Dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-[#776757]">
                Track the latest booking requests, open lead details with a single click,
                and process approvals directly on the same screen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="booking-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
                Updated {updatedLabel}
              </span>
              <Link
                href="/"
                className="booking-secondary rounded-full px-5 py-3 text-sm font-semibold"
              >
                Back to Booking
              </Link>
            </div>
          </div>
        </header>

        {feedbackMessage ? (
          <section className="booking-shell rounded-[24px] border border-[#e7c4b7] bg-[#fff7f2] px-5 py-4 text-sm leading-7 text-[#8c523f]">
            {feedbackMessage}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="New Requests"
            value={String(requests.length)}
            subtext="Lead list read directly from Supabase."
          />
          <StatCard
            label="Pending"
            value={String(pendingCount)}
            subtext="Requests awaiting consultation schedule confirmation and availability check."
          />
          <StatCard
            label="Confirmed"
            value={String(confirmedCount)}
            subtext="Leads that have been approved and consultation slots successfully locked."
          />
        </section>

        {/* View toggle */}
        <div className="flex gap-1 self-start rounded-[14px] border border-[#dcc7b1] bg-[#f8f0e7] p-1">
          {(["list", "calendar"] as DashboardView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-[10px] px-5 py-2 text-sm font-semibold capitalize transition ${
                view === v ? "bg-white text-[#403429] shadow-sm" : "text-[#9c846d] hover:text-[#403429]"
              }`}
            >
              {v === "list" ? "📋 List" : "📅 Calendar"}
            </button>
          ))}
        </div>

        {view === "calendar" ? (
          <CalendarView requests={requests} onSelectDate={handleOpenModal} />
        ) : (
        <section className="booking-shell rounded-[28px] p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[#dcc7b1] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a1714c]">
                Latest Requests
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#403429]">
                Booking Request List
              </h2>
            </div>
            <p className="text-sm leading-7 text-[#776757]">
              Click on each row to view the full information from the registration form.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#dcc7b1] bg-white/75">
            <div className="overflow-x-auto">
              {requests.length === 0 ? (
                <div className="px-6 py-10 text-sm leading-7 text-[#776757]">
                  No bookings in Supabase to display.
                </div>
              ) : (
                <table className="min-w-full border-collapse text-left">
                  <thead className="bg-[#f8f0e7]">
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9c846d]">
                      <th className="px-5 py-4">Guest Name</th>
                      <th className="px-5 py-4">Wedding Date</th>
                      <th className="px-5 py-4">Consultation Date</th>
                      <th className="px-5 py-4">Consultation Time</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        tabIndex={0}
                        role="button"
                        onClick={() => handleOpenModal(request.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenModal(request.id);
                          }
                        }}
                        className="cursor-pointer border-t border-[#e5d5c4] bg-white/70 transition hover:bg-[#fcf4eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d3ab88]"
                      >
                        <td className="px-5 py-5">
                          <div>
                            <p className="text-base font-semibold text-[#43372c]">
                              {getGuestLabel(request)}
                            </p>
                            <p className="mt-1 text-sm text-[#806f60]">
                              {request.emailPrimary}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-5 text-sm text-[#4f4338]">
                          {formatShortDate(getPrimaryWeddingDate(request))}
                        </td>
                        <td className="px-5 py-5 text-sm text-[#4f4338]">
                          {formatShortDate(request.consultationDate)}
                        </td>
                        <td className="px-5 py-5 text-sm text-[#4f4338]">
                          {request.consultationTime}
                        </td>
                        <td className="px-5 py-5">
                          <StatusBadge status={request.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
        )}
      </div>

      {selectedRequest ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(82,60,40,0.34)] px-4 py-8 backdrop-blur-sm sm:px-6"
          onClick={() => { setSelectedId(null); setActiveTab("details"); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-detail-title"
            className="booking-shell relative w-full max-w-5xl rounded-[30px] p-6 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setSelectedId(null); setActiveTab("details"); }}
              className="booking-secondary absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-lg"
              aria-label="Close"
            >
              ×
            </button>

            <div className="flex flex-col gap-5 border-b border-[#dcc7b1] pb-6 pr-12 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#a1714c]">
                  Lead Details
                </p>
                <h2
                  id="request-detail-title"
                  className="mt-3 text-3xl font-semibold tracking-tight text-[#403429] sm:text-[2.1rem]"
                >
                  {getGuestLabel(selectedRequest)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#776757]">
                  Request ID {selectedRequest.id} • Submitted at{" "}
                  {formatSubmittedAt(selectedRequest.submittedAt)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={selectedRequest.status} />
                <span className="booking-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]">
                  {selectedRequest.leadSource}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 rounded-[16px] border border-[#dcc7b1] bg-[#f8f0e7] p-1">
              {(["details", "quotation"] as ModalTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-[12px] px-4 py-2 text-sm font-semibold capitalize transition ${
                    activeTab === tab
                      ? "bg-white text-[#403429] shadow-sm"
                      : "text-[#9c846d] hover:text-[#403429]"
                  }`}
                >
                  {tab === "details" ? "Lead Details" : "Quotation"}
                </button>
              ))}
            </div>

            {activeTab === "quotation" ? (
              <QuotationTab bookingId={selectedRequest.id} />
            ) : (
            <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailItem
                label="Priority Wedding Date"
                value={formatLongDate(getPrimaryWeddingDate(selectedRequest))}
              />
              <DetailItem
                label="Wedding Celebration Time"
                value={selectedRequest.preferredWeddingTime || "Not selected"}
              />
              <div className="rounded-[20px] border border-[#dcc7b1] bg-white/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c846d]">Consultation Date</p>
                <input
                  type="date"
                  className="mt-2 w-full bg-transparent text-base text-[#43372c] outline-none"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="rounded-[20px] border border-[#dcc7b1] bg-white/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9c846d]">Consultation Time</p>
                <select
                  className="mt-2 w-full bg-transparent text-base text-[#43372c] outline-none"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                >
                  {["2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {scheduleMessage ? (
              <div className={`mt-4 rounded-[14px] border px-4 py-2.5 text-sm ${
                scheduleMessage.ok ? "border-[#bdd7cb] bg-[#eef8f2] text-[#356455]" : "border-[#e7c4b7] bg-[#fff1eb] text-[#a15642]"
              }`}>
                {scheduleMessage.text}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[#dcc7b1] bg-white/72 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1714c]">
                    Contact Information
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Groom's Phone" value={selectedRequest.groomPhone} />
                    <DetailItem label="Bride's Phone" value={selectedRequest.bridePhone} />
                    <DetailItem label="Email 1" value={selectedRequest.emailPrimary} />
                    <DetailItem
                      label="Email 2"
                      value={selectedRequest.emailSecondary || "Not provided"}
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#dcc7b1] bg-white/72 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1714c]">
                    Event Information
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailItem
                      label="Expected Guest Count"
                      value={
                        selectedRequest.guestCount !== null
                          ? `${selectedRequest.guestCount} guests`
                          : "Not updated"
                      }
                    />
                    <DetailItem
                      label="Consent to Share Information"
                      value={selectedRequest.consent ? "Agreed" : "Not agreed"}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-[#dcc7b1] bg-white/72 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1714c]">
                    Preferred Wedding Dates
                  </p>
                  <p className="mt-3 text-sm text-[#776757]">
                    Preferred celebration time: {selectedRequest.preferredWeddingTime || "Not selected"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedRequest.preferredWeddingDates.length > 0 ? (
                      selectedRequest.preferredWeddingDates.map((date) => (
                        <span
                          key={date}
                          className="rounded-full border border-[#dcc7b1] bg-[#f8ecdf] px-4 py-2 text-sm font-medium text-[#9a6d48]"
                        >
                          {formatLongDate(date)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#776757]">Not updated</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#dcc7b1] bg-white/72 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1714c]">
                    Notes from Lead
                  </p>
                  <p className="mt-4 text-base leading-8 text-[#4f4338]">
                    {selectedRequest.note || "Guest has not left any additional notes."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#dcc7b1] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => { void handleSaveSchedule(); }}
                  disabled={isSavingSchedule}
                  className="booking-secondary rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {isSavingSchedule ? "Saving..." : "Save Schedule"}
                </button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    void handleUpdateRequestStatus("rejected");
                  }}
                  disabled={isUpdatingStatus}
                  className="rounded-full border border-[#e7c4b7] bg-[#fff1eb] px-6 py-3 text-sm font-semibold text-[#a15642] transition hover:-translate-y-0.5 hover:bg-[#ffe7df] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingStatus && selectedRequest.status !== "rejected"
                    ? "Updating..."
                    : "Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleUpdateRequestStatus("confirmed");
                  }}
                  disabled={isUpdatingStatus}
                  className="booking-primary rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingStatus && selectedRequest.status !== "confirmed"
                    ? "Updating..."
                    : "Approve"}
                </button>
              </div>
            </div>
            </>)}
          </div>
        </div>
      ) : null}
    </main>
  );
}
