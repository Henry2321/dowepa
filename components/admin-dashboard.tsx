"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  updateBookingStatus,
  type AdminBookingRequest,
  type RequestStatus,
} from "@/app/actions/wedding-bookings";

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

export function AdminDashboard({
  initialRequests,
  initialError = null,
}: {
  initialRequests: AdminBookingRequest[];
  initialError?: string | null;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(initialError);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedRequest]);

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
                        onClick={() => setSelectedId(request.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(request.id);
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
      </div>

      {selectedRequest ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(82,60,40,0.34)] px-4 py-8 backdrop-blur-sm sm:px-6"
          onClick={() => setSelectedId(null)}
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
              onClick={() => setSelectedId(null)}
              className="booking-secondary absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-lg"
              aria-label="Close"
            >
              X
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

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DetailItem
                label="Priority Wedding Date"
                value={formatLongDate(getPrimaryWeddingDate(selectedRequest))}
              />
              <DetailItem
                label="Wedding Celebration Time"
                value={selectedRequest.preferredWeddingTime || "Not selected"}
              />
              <DetailItem
                label="Consultation Date"
                value={formatLongDate(selectedRequest.consultationDate)}
              />
              <DetailItem label="Consultation Time" value={selectedRequest.consultationTime} />
            </div>

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
              <p className="text-sm leading-7 text-[#776757]">
                Staff can quickly update the processing status directly from this modal.
              </p>

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
          </div>
        </div>
      ) : null}
    </main>
  );
}
