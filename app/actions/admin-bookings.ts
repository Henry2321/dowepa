"use server";

export type BookingStatus = "Pending" | "Confirmed" | "Rejected";

export type BookingRow = {
  id: string;
  groom_name: string;
  bride_name: string;
  lead_source: string | null;
  groom_phone: string | null;
  bride_phone: string | null;
  email_primary: string;
  email_secondary: string | null;
  preferred_wedding_date: string | null;
  consultation_date: string | null;
  consultation_time: string | null;
  guest_count: number | null;
  note: string | null;
  consent: boolean;
  status: string;
  created_at: string;
};

function getSupabaseHeaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error("Missing Supabase env vars.");

  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

export async function getBookings(): Promise<BookingRow[]> {
  const { url, headers } = getSupabaseHeaders();
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);

  requestUrl.searchParams.set("select", "*");
  requestUrl.searchParams.set("order", "created_at.desc");

  const res = await fetch(requestUrl, { headers, cache: "no-store" });

  if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);

  return res.json();
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { url, headers } = getSupabaseHeaders();
  const requestUrl = new URL("/rest/v1/wedding_bookings", url);

  requestUrl.searchParams.set("id", `eq.${id}`);

  const res = await fetch(requestUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error(`Failed to update booking: ${res.status}`);
}
