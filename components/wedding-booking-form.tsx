"use client";

import { useRef, useState, type ReactNode } from "react";

import {
  getAvailableSlots,
  submitBooking,
} from "@/app/actions/wedding-bookings";

const AVAILABLE_TIME_SLOTS = ["2:00", "3:00", "4:00", "5:00", "6:00"] as const;
const weddingCelebrationTimes = ["12:00 PM", "6:00 PM"] as const;

type ConsultationSlot = (typeof AVAILABLE_TIME_SLOTS)[number];

type BookingFormData = {
  groomName: string;
  brideName: string;
  leadSource: string;
  groomPhone: string;
  bridePhone: string;
  emailPrimary: string;
  emailSecondary: string;
  preferredWeddingDate: string;
  preferredWeddingTime: string;
  consultationDate: string;
  consultationTime: string;
  guestCount: string;
  note: string;
  consent: boolean;
};

type BookingFieldErrors = Partial<
  Record<
    | "groomName"
    | "brideName"
    | "leadSource"
    | "groomPhone"
    | "bridePhone"
    | "emailPrimary"
    | "emailSecondary"
    | "preferredWeddingDate"
    | "preferredWeddingTime"
    | "consultationDate"
    | "consultationTime"
    | "guestCount"
    | "consent",
    string
  >
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const leadSources = [
  "Marriott Website",
  "Facebook / Instagram",
  "Google Search",
  "Friend Referral",
  "Wedding Planner",
  "Other",
];

const guestCountOptions = [
  "50",
  "100",
  "150",
  "200",
  "250",
  "300",
  "350",
  "400",
  "450",
  "500",
  "550",
  "600",
  "700",
  "800",
  "900",
  "1000",
];

const initialForm: BookingFormData = {
  groomName: "",
  brideName: "",
  leadSource: "",
  groomPhone: "",
  bridePhone: "",
  emailPrimary: "",
  emailSecondary: "",
  preferredWeddingDate: "",
  preferredWeddingTime: "",
  consultationDate: "",
  consultationTime: "",
  guestCount: "",
  note: "",
  consent: false,
};

function isIsoDate(value: string) {
  return ISO_DATE_PATTERN.test(value);
}

function normalizeConsultationSlot(value: string): ConsultationSlot | null {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, " ");
  const match = cleaned.match(/^(\d{1,2}:\d{2})(?:\s*(AM|PM))?$/);

  if (!match) {
    return null;
  }

  const [, time, meridiem] = match;

  if (meridiem && meridiem !== "PM") {
    return null;
  }

  if (!AVAILABLE_TIME_SLOTS.includes(time as ConsultationSlot)) {
    return null;
  }

  return time as ConsultationSlot;
}

function normalizeWeddingCelebrationTime(value: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");

  if (weddingCelebrationTimes.includes(cleaned as (typeof weddingCelebrationTimes)[number])) {
    return cleaned as (typeof weddingCelebrationTimes)[number];
  }

  const upper = cleaned.toUpperCase();

  if (upper === "12PM" || upper === "12:00PM") return "12:00 PM" as const;
  if (upper === "6PM" || upper === "6:00PM") return "6:00 PM" as const;

  return null;
}

function formatConsultationSlotLabel(value: string) {
  const normalized = normalizeConsultationSlot(value);

  return normalized ? `${normalized} PM` : value;
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : "";
}

function normalizeGuestCount(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { value: null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { value: Number.NaN };
  }

  return { value: Number.parseInt(trimmed, 10) };
}

function validateBookingForm(formData: BookingFormData) {
  const groomName = normalizeText(formData.groomName);
  const brideName = normalizeText(formData.brideName);
  const leadSource = normalizeText(formData.leadSource);
  const emailPrimary = normalizeText(formData.emailPrimary).toLowerCase();
  const emailSecondary = normalizeOptionalText(formData.emailSecondary).toLowerCase();
  const preferredWeddingDate = normalizeText(formData.preferredWeddingDate);
  const preferredWeddingTime = normalizeWeddingCelebrationTime(formData.preferredWeddingTime);
  const consultationDate = normalizeText(formData.consultationDate);
  const consultationTime = normalizeConsultationSlot(formData.consultationTime);
  const guestCount = normalizeGuestCount(formData.guestCount);
  const errors: BookingFieldErrors = {};

  if (!groomName) {
    errors.groomName = "Please enter the groom's name.";
  }

  if (!brideName) {
    errors.brideName = "Please enter the bride's name.";
  }

  if (!leadSource) {
    errors.leadSource = "Please select a lead source.";
  }

  if (!emailPrimary) {
    errors.emailPrimary = "Email 1 is required.";
  } else if (!EMAIL_PATTERN.test(emailPrimary)) {
    errors.emailPrimary = "Email 1 is not in a valid format.";
  }

  if (emailSecondary && !EMAIL_PATTERN.test(emailSecondary)) {
    errors.emailSecondary = "Email 2 is not in a valid format.";
  }

  if (!preferredWeddingDate) {
    errors.preferredWeddingDate = "Please select your preferred wedding date.";
  } else if (!isIsoDate(preferredWeddingDate)) {
    errors.preferredWeddingDate = "Preferred wedding date is not in a valid format.";
  }

  if (!preferredWeddingTime) {
    errors.preferredWeddingTime = "Please select the wedding celebration time.";
  }

  if (!consultationDate) {
    errors.consultationDate = "Please select an available consultation date.";
  } else if (!isIsoDate(consultationDate)) {
    errors.consultationDate = "Consultation date is not in a valid format.";
  }

  if (!consultationTime) {
    errors.consultationTime = "Please select an available time slot.";
  }

  if (Number.isNaN(guestCount.value) || (guestCount.value !== null && guestCount.value <= 0)) {
    errors.guestCount = "Expected guest count must be a positive number.";
  }

  if (!formData.consent) {
    errors.consent = "You must agree to share your information to proceed with the booking.";
  }

  return { errors };
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return "Not selected";
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getSlotPlaceholder(params: {
  consultationDate: string;
  isLoadingSlots: boolean;
  slotLoadError: string | null;
  availableSlots: ConsultationSlot[];
}) {
  const { consultationDate, isLoadingSlots, slotLoadError, availableSlots } = params;

  if (!consultationDate) {
    return "Select a date first";
  }

  if (isLoadingSlots) {
    return "Loading time slots...";
  }

  if (slotLoadError) {
    return "Unable to load time slots";
  }

  if (availableSlots.length === 0) {
    return "No slots available on this date";
  }

  return "Select an available time slot";
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="booking-label">
        {label}
        {required ? <span className="booking-required"> *</span> : null}
      </label>
      <div className="booking-field rounded-[18px] px-4 py-3">{children}</div>
      {error ? <p className="mt-2 text-sm text-[#b2583d]">{error}</p> : null}
    </div>
  );
}

function ReadonlyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[#dcc7b1] bg-white/78 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9c846d]">
        {label}
      </p>
      <p className="mt-2 break-all text-base font-medium text-[#43372c]">
        {value}
      </p>
    </div>
  );
}

export function WeddingBookingForm() {
  const [form, setForm] = useState<BookingFormData>(initialForm);
  const [errors, setErrors] = useState<BookingFieldErrors>({});
  const [availableSlots, setAvailableSlots] = useState<ConsultationSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotLoadError, setSlotLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const slotRequestIdRef = useRef(0);

  function updateField<K extends keyof BookingFormData>(
    field: K,
    value: BookingFormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitMessage(null);
  }

  async function updateConsultationDate(value: string) {
    const requestId = slotRequestIdRef.current + 1;

    slotRequestIdRef.current = requestId;

    setForm((current) => ({
      ...current,
      consultationDate: value,
      consultationTime: "",
    }));
    setErrors((current) => ({
      ...current,
      consultationDate: undefined,
      consultationTime: undefined,
    }));
    setSubmitMessage(null);
    setSlotLoadError(null);

    if (!value) {
      setAvailableSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    setIsLoadingSlots(true);

    try {
      const nextSlots = await getAvailableSlots(value);

      if (slotRequestIdRef.current !== requestId) {
        return;
      }

      setAvailableSlots(nextSlots);
    } catch {
      if (slotRequestIdRef.current !== requestId) {
        return;
      }

      setAvailableSlots([]);
      setSlotLoadError("Unable to load time slots from the system. Please try again.");
    } finally {
      if (slotRequestIdRef.current === requestId) {
        setIsLoadingSlots(false);
      }
    }
  }

  async function refreshAvailableSlots(date: string) {
    if (!date) {
      setAvailableSlots([]);
      return;
    }

    try {
      const nextSlots = await getAvailableSlots(date);
      setAvailableSlots(nextSlots);
    } catch {
      setSlotLoadError("Unable to load time slots from the system. Please try again.");
    }
  }

  async function handleSubmit() {
    const { errors: nextErrors } = validateBookingForm(form);

    setErrors(nextErrors);
    setSubmitMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitBooking(form);

      if (!result.success) {
        setErrors((current) => ({
          ...current,
          ...result.fieldErrors,
        }));
        setSubmitMessage(result.message);

        if (result.fieldErrors?.consultationTime) {
          await refreshAvailableSlots(form.consultationDate);
        }

        return;
      }

      setConfirmedBookingId(result.id);
    } catch {
      setSubmitMessage("Unable to submit your request at this time. Please try again in a few minutes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    slotRequestIdRef.current += 1;
    setForm(initialForm);
    setErrors({});
    setAvailableSlots([]);
    setIsLoadingSlots(false);
    setSlotLoadError(null);
    setIsSubmitting(false);
    setSubmitMessage(null);
    setConfirmedBookingId(null);
  }

  const submitted = confirmedBookingId !== null;
  const selectedConsultationSlot = formatConsultationSlotLabel(form.consultationTime);
  const selectedWeddingCelebrationTime =
    normalizeWeddingCelebrationTime(form.preferredWeddingTime) ?? form.preferredWeddingTime;

  return (
    <main className="booking-page px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="booking-shell rounded-[28px] px-6 py-7 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a1714c]">
                Marriott Wedding Atelier
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#403429] sm:text-[2.35rem]">
                Book a Wedding Consultation
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-[#776757]">
                Please enter the couple's information and select a suitable consultation date and time.
                When you choose a consultation date, the system will only display available time slots
                fetched directly from Supabase.
              </p>
            </div>
          </div>
        </section>

        {submitted ? (
          <section className="booking-shell rounded-[28px] px-6 py-7 sm:px-7 sm:py-8">
            <div className="inline-flex rounded-full bg-[#f6ebdf] px-4 py-2 text-sm font-semibold text-[#a1714c]">
              Booking Confirmed
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#403429]">
              Booking Request Received
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[#776757]">
              Marriott has saved the consultation appointment for{" "}
              <span className="font-semibold text-[#403429]">
                {form.groomName} &amp; {form.brideName}
              </span>{" "}
              at{" "}
              <span className="font-semibold text-[#403429]">
                {selectedConsultationSlot} - {formatDisplayDate(form.consultationDate)}
              </span>
              . A confirmation email will be sent to{" "}
              <span className="font-semibold text-[#403429]">{form.emailPrimary}</span>.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ReadonlyCard
                label="Couple"
                value={`${form.groomName} & ${form.brideName}`}
              />
              <ReadonlyCard label="Lead Source" value={form.leadSource} />
              <ReadonlyCard
                label="Wedding Date"
                value={`${formatDisplayDate(form.preferredWeddingDate)}${selectedWeddingCelebrationTime ? ` - ${selectedWeddingCelebrationTime}` : ""}`}
              />
              <ReadonlyCard
                label="Consultation Date"
                value={`${selectedConsultationSlot} - ${formatDisplayDate(
                  form.consultationDate,
                )}`}
              />
              <ReadonlyCard label="Booking ID" value={confirmedBookingId ?? ""} />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetForm}
                className="booking-primary rounded-full px-6 py-3 text-sm font-semibold"
              >
                Create New Request
              </button>
            </div>
          </section>
        ) : (
          <section className="booking-shell rounded-[28px] px-6 py-7 sm:px-7 sm:py-8">
            <div className="inline-flex rounded-full bg-[#b1784d] px-4 py-2 text-sm font-semibold text-[#fffaf3]">
              Guest Information
            </div>

            {submitMessage ? (
              <div className="mt-6 rounded-[20px] border border-[#e7c4b7] bg-[#fff7f2] px-5 py-4 text-sm leading-7 text-[#8c523f]">
                {submitMessage}
              </div>
            ) : null}

            <div className="mt-7 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Lead Source" required error={errors.leadSource}>
                  <select
                    className="booking-input appearance-none"
                    value={form.leadSource}
                    onChange={(event) => updateField("leadSource", event.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">Select lead source</option>
                    {leadSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Expected Guest Count" error={errors.guestCount}>
                  <select
                    className="booking-input appearance-none"
                    value={form.guestCount}
                    onChange={(event) => updateField("guestCount", event.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">Select guest count</option>
                    {guestCountOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} guests
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Groom's Name" required error={errors.groomName}>
                  <input
                    className="booking-input"
                    placeholder="Enter groom's name"
                    value={form.groomName}
                    onChange={(event) => updateField("groomName", event.target.value)}
                    disabled={isSubmitting}
                  />
                </Field>

                <Field label="Bride's Name" required error={errors.brideName}>
                  <input
                    className="booking-input"
                    placeholder="Enter bride's name"
                    value={form.brideName}
                    onChange={(event) => updateField("brideName", event.target.value)}
                    disabled={isSubmitting}
                  />
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Groom's Phone" error={errors.groomPhone}>
                  <input
                    className="booking-input"
                    placeholder="0900 000 000"
                    inputMode="tel"
                    value={form.groomPhone}
                    onChange={(event) => updateField("groomPhone", event.target.value)}
                    disabled={isSubmitting}
                  />
                </Field>

                <Field label="Bride's Phone" error={errors.bridePhone}>
                  <input
                    className="booking-input"
                    placeholder="0900 000 001"
                    inputMode="tel"
                    value={form.bridePhone}
                    onChange={(event) => updateField("bridePhone", event.target.value)}
                    disabled={isSubmitting}
                  />
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Email 1" required error={errors.emailPrimary}>
                  <input
                    className="booking-input"
                    type="email"
                    placeholder="couple@domain.com"
                    value={form.emailPrimary}
                    onChange={(event) =>
                      updateField("emailPrimary", event.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </Field>

                <Field label="Email 2" error={errors.emailSecondary}>
                  <input
                    className="booking-input"
                    type="email"
                    placeholder="planner@domain.com"
                    value={form.emailSecondary}
                    onChange={(event) =>
                      updateField("emailSecondary", event.target.value)
                    }
                    disabled={isSubmitting}
                  />
                </Field>
              </div>

              <div>
                <p className="booking-label">
                  Preferred Wedding Date
                  <span className="booking-required"> *</span>
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="booking-field rounded-[18px] px-4 py-3">
                      <input
                        className="booking-input"
                        type="date"
                        value={form.preferredWeddingDate}
                        onChange={(event) =>
                          updateField("preferredWeddingDate", event.target.value)
                        }
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.preferredWeddingDate ? (
                      <p className="mt-2 text-sm text-[#b2583d]">
                        {errors.preferredWeddingDate}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <div className="booking-field rounded-[18px] px-4 py-3">
                      <select
                        className="booking-input appearance-none"
                        value={form.preferredWeddingTime}
                        onChange={(event) =>
                          updateField("preferredWeddingTime", event.target.value)
                        }
                        disabled={isSubmitting}
                      >
                        <option value="">Select wedding time</option>
                        {weddingCelebrationTimes.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.preferredWeddingTime ? (
                      <p className="mt-2 text-sm text-[#b2583d]">
                        {errors.preferredWeddingTime}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <p className="booking-label">
                  Preferred Consultation Date
                  <span className="booking-required"> *</span>
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <div className="booking-field rounded-[18px] px-4 py-3">
                      <input
                        className="booking-input"
                        type="date"
                        value={form.consultationDate}
                        onChange={(event) => {
                          void updateConsultationDate(event.target.value);
                        }}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.consultationDate ? (
                      <p className="mt-2 text-sm text-[#b2583d]">
                        {errors.consultationDate}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <div className="booking-field rounded-[18px] px-4 py-3">
                      <select
                        className="booking-input appearance-none"
                        value={form.consultationTime}
                        onChange={(event) =>
                          updateField("consultationTime", event.target.value)
                        }
                        disabled={
                          !form.consultationDate ||
                          isLoadingSlots ||
                          isSubmitting ||
                          Boolean(slotLoadError)
                        }
                      >
                        <option value="">
                          {getSlotPlaceholder({
                            consultationDate: form.consultationDate,
                            isLoadingSlots,
                            slotLoadError,
                            availableSlots,
                          })}
                        </option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {formatConsultationSlotLabel(slot)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {form.consultationDate && !slotLoadError && availableSlots.length > 0 ? (
                      <p className="mt-2 text-sm text-[#8f7761]">
                        Showing {availableSlots.length} available time slot(s) for the selected date.
                      </p>
                    ) : null}
                    {form.consultationDate &&
                    !isLoadingSlots &&
                    !slotLoadError &&
                    availableSlots.length === 0 ? (
                      <p className="mt-2 text-sm text-[#8f7761]">
                        No available time slots on this date.
                      </p>
                    ) : null}
                    {slotLoadError ? (
                      <p className="mt-2 text-sm text-[#b2583d]">{slotLoadError}</p>
                    ) : null}
                    {errors.consultationTime ? (
                      <p className="mt-2 text-sm text-[#b2583d]">
                        {errors.consultationTime}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <Field label="Notes">
                <textarea
                  className="booking-input min-h-28 resize-none"
                  placeholder="Describe the event style, estimated budget, or any special requests..."
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  disabled={isSubmitting}
                />
              </Field>

              <div>
                <label className="booking-label">
                  Consent to Share Information
                  <span className="booking-required"> *</span>
                </label>
                <div className="booking-field rounded-[18px] px-4 py-4">
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-7 text-[#4c4034]">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(event) => updateField("consent", event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#cdb59c] accent-[#b1784d]"
                      disabled={isSubmitting}
                    />
                    <span>
                      I agree to allow Marriott to use this information for the purpose of
                      receiving requests, consultation contact, and sending booking confirmations.
                    </span>
                  </label>
                </div>
                {errors.consent ? (
                  <p className="mt-2 text-sm text-[#b2583d]">{errors.consent}</p>
                ) : null}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSubmit();
                  }}
                  className="booking-primary rounded-full px-6 py-3 text-sm font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
