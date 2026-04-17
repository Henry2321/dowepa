"use server";

import { revalidatePath } from "next/cache";

import { AVAILABLE_TIME_SLOTS, type ConsultationSlot } from "./booking-constants";

export type BookingFormData = {
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

export type BookingFieldErrors = Partial<
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

export type RequestStatus = "pending" | "confirmed" | "rejected";

export type AdminBookingRequest = {
  id: string;
  groomName: string;
  brideName: string;
  leadSource: string;
  groomPhone: string;
  bridePhone: string;
  emailPrimary: string;
  emailSecondary: string;
  preferredWeddingDates: string[];
  preferredWeddingTime: string;
  guestCount: number | null;
  note: string;
  consultationDate: string;
  consultationTime: string;
  submittedAt: string | null;
  status: RequestStatus;
  consent: boolean;
};

type SanitizedBookingFormData = Omit<
  BookingFormData,
  "preferredWeddingTime" | "consultationTime" | "guestCount"
> & {
  preferredWeddingTime: WeddingCelebrationTime;
  consultationTime: ConsultationSlot;
  guestCount: string;
  guestCountNumber: number | null;
};

type WeddingBookingInsert = {
  groom_name: string;
  bride_name: string;
  lead_source: string;
  groom_phone: string | null;
  bride_phone: string | null;
  email_primary: string;
  email_secondary: string | null;
  preferred_wedding_date: string;
  preferred_wedding_time: WeddingCelebrationTime;
  consultation_date: string;
  consultation_time: ConsultationSlot;
  guest_count: number | null;
  note: string | null;
  consent: boolean;
  status: "Pending";
};

type WeddingBookingSlotRow = {
  consultation_time: string | null;
  status: string | null;
};

type InsertedWeddingBookingRow = {
  id: string | number;
};

type AdminWeddingBookingRow = {
  id: string | number | null;
  groom_name: string | null;
  bride_name: string | null;
  lead_source: string | null;
  groom_phone: string | null;
  bride_phone: string | null;
  email_primary: string | null;
  email_secondary: string | null;
  preferred_wedding_date: string | null;
  preferred_wedding_time: string | null;
  consultation_date: string | null;
  consultation_time: string | null;
  guest_count: number | null;
  note: string | null;
  consent: boolean | null;
  status: string | null;
  created_at?: string | null;
};

type SupabaseErrorPayload = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type SupabaseRequestError = Error & {
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

export type SubmitBookingResult =
  | {
      success: true;
      id: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: BookingFieldErrors;
    };

export type UpdateBookingStatusResult =
  | {
      success: true;
      status: RequestStatus;
    }
  | {
      success: false;
      message: string;
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEDDING_CELEBRATION_TIMES = ["12:00 PM", "6:00 PM"] as const;

type WeddingCelebrationTime = (typeof WEDDING_CELEBRATION_TIMES)[number];

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Use the service-role key for server actions.",
    );
  }

  return { url, serviceRoleKey };
}

function getRestHeaders(init?: HeadersInit) {
  const { serviceRoleKey } = getSupabaseConfig();
  const isJwtKey = serviceRoleKey.startsWith("eyJ");

  return {
    apikey: serviceRoleKey,
    "Content-Type": "application/json",
    ...(isJwtKey ? { Authorization: `Bearer ${serviceRoleKey}` } : {}),
    ...init,
  };
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function toSupabaseError(
  response: Response,
  payload: SupabaseErrorPayload | null,
): SupabaseRequestError {
  const message = payload?.message ?? `Supabase request failed with status ${response.status}.`;

  return Object.assign(new Error(message), {
    code: payload?.code,
    details: payload?.details,
    hint: payload?.hint,
    status: response.status,
  });
}

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

function normalizeWeddingCelebrationTime(value: string): WeddingCelebrationTime | null {
  const cleaned = value.trim().replace(/\s+/g, " ");

  if (WEDDING_CELEBRATION_TIMES.includes(cleaned as WeddingCelebrationTime)) {
    return cleaned as WeddingCelebrationTime;
  }

  const upper = cleaned.toUpperCase();

  if (upper === "12PM" || upper === "12:00PM") return "12:00 PM";
  if (upper === "6PM" || upper === "6:00PM") return "6:00 PM";

  return null;
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
    return { raw: "", value: null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { raw: trimmed, value: Number.NaN };
  }

  return { raw: trimmed, value: Number.parseInt(trimmed, 10) };
}

function validateBookingForm(formData: BookingFormData): {
  errors: BookingFieldErrors;
  sanitized: SanitizedBookingFormData | null;
} {
  const groomName = normalizeText(formData.groomName);
  const brideName = normalizeText(formData.brideName);
  const leadSource = normalizeText(formData.leadSource);
  const groomPhone = normalizeOptionalText(formData.groomPhone);
  const bridePhone = normalizeOptionalText(formData.bridePhone);
  const emailPrimary = normalizeText(formData.emailPrimary).toLowerCase();
  const emailSecondary = normalizeOptionalText(formData.emailSecondary).toLowerCase();
  const preferredWeddingDate = normalizeText(formData.preferredWeddingDate);
  const preferredWeddingTime = normalizeWeddingCelebrationTime(formData.preferredWeddingTime);
  const consultationDate = normalizeText(formData.consultationDate);
  const note = normalizeOptionalText(formData.note);
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

  if (!groomPhone) {
    errors.groomPhone = "Please enter the groom's phone number.";
  }

  if (!bridePhone) {
    errors.bridePhone = "Please enter the bride's phone number.";
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
    errors.preferredWeddingTime = "Please select your wedding celebration time.";
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

  if (Object.keys(errors).length > 0 || !consultationTime || !preferredWeddingTime) {
    return {
      errors,
      sanitized: null,
    };
  }

  return {
    errors,
    sanitized: {
      groomName,
      brideName,
      leadSource,
      groomPhone,
      bridePhone,
      emailPrimary,
      emailSecondary,
      preferredWeddingDate,
      preferredWeddingTime,
      consultationDate,
      consultationTime,
      guestCount: guestCount.raw,
      guestCountNumber: guestCount.value,
      note,
      consent: formData.consent,
    },
  };
}

function buildWeddingBookingInsert(formData: SanitizedBookingFormData): WeddingBookingInsert {
  return {
    groom_name: formData.groomName,
    bride_name: formData.brideName,
    lead_source: formData.leadSource,
    groom_phone: formData.groomPhone || null,
    bride_phone: formData.bridePhone || null,
    email_primary: formData.emailPrimary,
    email_secondary: formData.emailSecondary || null,
    preferred_wedding_date: formData.preferredWeddingDate,
    preferred_wedding_time: formData.preferredWeddingTime,
    consultation_date: formData.consultationDate,
    consultation_time: formData.consultationTime,
    guest_count: formData.guestCountNumber,
    note: formData.note || null,
    consent: formData.consent,
    status: "Pending",
  };
}

async function listWeddingBookingsByDate(date: string) {
  const { url } = getSupabaseConfig();
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);

  requestUrl.searchParams.set("select", "consultation_time,status");
  requestUrl.searchParams.set("consultation_date", `eq.${date}`);

  const response = await fetch(requestUrl, {
    headers: getRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw toSupabaseError(response, await readJsonSafely<SupabaseErrorPayload>(response));
  }

  return (await response.json()) as WeddingBookingSlotRow[];
}

async function insertWeddingBooking(payload: WeddingBookingInsert) {
  const { url } = getSupabaseConfig();
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: getRestHeaders({
      Prefer: "return=representation",
    }),
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const body = await readJsonSafely<SupabaseErrorPayload | InsertedWeddingBookingRow[]>(response);

  if (!response.ok) {
    throw toSupabaseError(response, body as SupabaseErrorPayload | null);
  }

  const [insertedRow] = (body as InsertedWeddingBookingRow[] | null) ?? [];

  if (!insertedRow?.id) {
    throw new Error("Supabase insert succeeded but did not return a booking ID.");
  }

  return insertedRow;
}

async function listAllWeddingBookings() {
  const { url } = getSupabaseConfig();
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);

  requestUrl.searchParams.set("select", "*");

  const response = await fetch(requestUrl, {
    headers: getRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw toSupabaseError(response, await readJsonSafely<SupabaseErrorPayload>(response));
  }

  return (await response.json()) as AdminWeddingBookingRow[];
}

async function patchWeddingBookingStatus(id: string, status: RequestStatus) {
  const { url } = getSupabaseConfig();
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);

  requestUrl.searchParams.set("id", `eq.${id}`);

  const response = await fetch(requestUrl, {
    method: "PATCH",
    headers: getRestHeaders({
      Prefer: "return=minimal",
    }),
    cache: "no-store",
    body: JSON.stringify({
      status: status === "confirmed" ? "Confirmed" : status === "rejected" ? "Rejected" : "Pending",
    }),
  });

  if (!response.ok) {
    throw toSupabaseError(response, await readJsonSafely<SupabaseErrorPayload>(response));
  }
}

function getBookedSlotSet(rows: Awaited<ReturnType<typeof listWeddingBookingsByDate>>) {
  return new Set<ConsultationSlot>(
    rows
      .filter((row) => row.status?.trim().toLowerCase() !== "rejected")
      .map((row) => normalizeConsultationSlot(row.consultation_time ?? ""))
      .filter((slot): slot is ConsultationSlot => slot !== null),
  );
}

function isDuplicateBookingError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const supabaseError = error as SupabaseRequestError;

  return (
    supabaseError.code === "23505" ||
    supabaseError.status === 409 ||
    (typeof supabaseError.message === "string" &&
      supabaseError.message.toLowerCase().includes("duplicate key"))
  );
}

function normalizeDatabaseStatus(value: string | null | undefined): RequestStatus {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "confirmed") {
    return "confirmed";
  }

  if (normalized === "rejected") {
    return "rejected";
  }

  return "pending";
}

function formatConsultationTimeForAdmin(value: string | null | undefined) {
  const normalized = normalizeConsultationSlot(value ?? "");

  return normalized ? `${normalized} PM` : value?.trim() || "Not selected";
}

function formatWeddingCelebrationTimeForAdmin(value: string | null | undefined) {
  const normalized = normalizeWeddingCelebrationTime(value ?? "");

  return normalized ?? (value?.trim() || "Not selected");
}

function mapAdminBookingRow(row: AdminWeddingBookingRow): AdminBookingRequest {
  return {
    id: String(row.id ?? ""),
    groomName: row.groom_name?.trim() || "No groom name",
    brideName: row.bride_name?.trim() || "No bride name",
    leadSource: row.lead_source?.trim() || "No lead source",
    groomPhone: row.groom_phone?.trim() || "Not provided",
    bridePhone: row.bride_phone?.trim() || "Not provided",
    emailPrimary: row.email_primary?.trim() || "Not provided",
    emailSecondary: row.email_secondary?.trim() || "",
    preferredWeddingDates: row.preferred_wedding_date ? [row.preferred_wedding_date] : [],
    preferredWeddingTime: formatWeddingCelebrationTimeForAdmin(row.preferred_wedding_time),
    guestCount: row.guest_count,
    note: row.note?.trim() || "",
    consultationDate: row.consultation_date?.trim() || "",
    consultationTime: formatConsultationTimeForAdmin(row.consultation_time),
    submittedAt: row.created_at?.trim() || null,
    status: normalizeDatabaseStatus(row.status),
    consent: Boolean(row.consent),
  };
}

function getRequestSortTime(request: AdminBookingRequest) {
  if (request.submittedAt) {
    const submittedAt = Date.parse(request.submittedAt);

    if (!Number.isNaN(submittedAt)) {
      return submittedAt;
    }
  }

  if (request.consultationDate) {
    const consultationDate = Date.parse(`${request.consultationDate}T00:00:00`);

    if (!Number.isNaN(consultationDate)) {
      return consultationDate;
    }
  }

  return 0;
}

export async function getAvailableSlots(date: string) {
  if (!isIsoDate(date)) {
    return [];
  }

  const rows = await listWeddingBookingsByDate(date);
  const bookedSlots = getBookedSlotSet(rows);

  return AVAILABLE_TIME_SLOTS.filter((slot) => !bookedSlots.has(slot));
}

export async function getAdminBookings(): Promise<AdminBookingRequest[]> {
  const rows = await listAllWeddingBookings();

  return rows
    .map(mapAdminBookingRow)
    .sort((left, right) => getRequestSortTime(right) - getRequestSortTime(left));
}

export async function submitBooking(formData: BookingFormData): Promise<SubmitBookingResult> {
  const { errors, sanitized } = validateBookingForm(formData);

  if (!sanitized) {
    return {
      success: false,
      message: "Please review the required fields.",
      fieldErrors: errors,
    };
  }

  const availableSlots = await getAvailableSlots(sanitized.consultationDate);

  if (!availableSlots.includes(sanitized.consultationTime)) {
    return {
      success: false,
      message: "The time slot you selected was just taken by another guest. Please choose a different time.",
      fieldErrors: {
        consultationTime: "This time slot is no longer available.",
      },
    };
  }

  try {
    const insertedBooking = await insertWeddingBooking(buildWeddingBookingInsert(sanitized));

    return {
      success: true,
      id: String(insertedBooking.id),
    };
  } catch (error) {
    if (isDuplicateBookingError(error)) {
      return {
        success: false,
        message: "The time slot you selected was just taken by another guest. Please choose a different time.",
        fieldErrors: {
          consultationTime: "This time slot is no longer available.",
        },
      };
    }

    return {
      success: false,
      message: "Unable to save the consultation appointment at this time. Please try again in a few minutes.",
    };
  }
}

export async function updateBookingStatus(
  id: string,
  status: RequestStatus,
): Promise<UpdateBookingStatusResult> {
  if (!id.trim()) {
    return {
      success: false,
      message: "Missing booking ID to update status.",
    };
  }

  try {
    await patchWeddingBookingStatus(id, status);
    revalidatePath("/admin");

    return {
      success: true,
      status,
    };
  } catch {
    return {
      success: false,
      message: "Unable to update status on Supabase. Please try again.",
    };
  }
}

export async function updateConsultationSchedule(
  id: string,
  consultationDate: string,
  consultationTime: string,
): Promise<{ success: boolean; message?: string }> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const isJwtKey = serviceRoleKey.startsWith("eyJ");
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);

  requestUrl.searchParams.set("id", `eq.${id}`);

  try {
    const res = await fetch(requestUrl, {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        ...(isJwtKey ? { Authorization: `Bearer ${serviceRoleKey}` } : {}),
      },
      body: JSON.stringify({ consultation_date: consultationDate, consultation_time: consultationTime }),
    });

    if (!res.ok) {
      const payload = await readJsonSafely<SupabaseErrorPayload>(res);
      throw toSupabaseError(res, payload);
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update schedule.",
    };
  }
}
