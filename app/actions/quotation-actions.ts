"use server";

import { revalidatePath } from "next/cache";

export type QuotationItem = {
  id: string;
  serviceName: string;
  unitPrice: number | string;
  quantity: number | string;
};

export type SaveQuotationResult =
  | { success: true }
  | { success: false; message: string };

export type LoadQuotationResult =
  | { success: true; items: QuotationItem[] }
  | { success: false; message: string };

function getSupabaseHeaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error("Missing Supabase env vars.");

  const isJwt = key.startsWith("eyJ");

  return {
    url,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(isJwt ? { Authorization: `Bearer ${key}` } : {}),
    },
  };
}

export async function loadQuotation(bookingId: string): Promise<LoadQuotationResult> {
  try {
    const { url, headers } = getSupabaseHeaders();
    const requestUrl = new URL("/rest/v1/wedding_quotations", url);

    requestUrl.searchParams.set("select", "items");
    requestUrl.searchParams.set("booking_id", `eq.${bookingId}`);
    requestUrl.searchParams.set("limit", "1");

    const res = await fetch(requestUrl, { headers, cache: "no-store" });

    if (!res.ok) return { success: false, message: `Failed to load: ${res.status}` };

    const rows = (await res.json()) as { items: QuotationItem[] }[];

    return { success: true, items: rows[0]?.items ?? [] };
  } catch {
    return { success: false, message: "Unable to load quotation." };
  }
}

export async function saveQuotation(
  bookingId: string,
  items: QuotationItem[],
): Promise<SaveQuotationResult> {
  try {
    const { url, headers } = getSupabaseHeaders();

    // Check if quotation already exists
    const total = items.reduce(
      (sum, item) => sum + (parseFloat(String(item.unitPrice)) || 0) * (parseInt(String(item.quantity)) || 0),
      0,
    );

    const checkUrl = new URL("/rest/v1/wedding_quotations", url);
    checkUrl.searchParams.set("select", "id");
    checkUrl.searchParams.set("booking_id", `eq.${bookingId}`);
    checkUrl.searchParams.set("limit", "1");
    const checkRes = await fetch(checkUrl, { headers, cache: "no-store" });
    const existing = checkRes.ok ? (await checkRes.json()) as { id: string }[] : [];

    if (existing.length > 0) {
      // UPDATE existing row
      const updateUrl = new URL("/rest/v1/wedding_quotations", url);
      updateUrl.searchParams.set("booking_id", `eq.${bookingId}`);
      const updateRes = await fetch(updateUrl, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ items, total_amount: total, status: "Sent", updated_at: new Date().toISOString() }),
      });
      if (!updateRes.ok) return { success: false, message: `Failed to save: ${updateRes.status}` };
    } else {
      // INSERT new row
      const insertUrl = new URL("/rest/v1/wedding_quotations", url);
      const insertRes = await fetch(insertUrl, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ booking_id: bookingId, items, total_amount: total, status: "Sent" }),
      });
      if (!insertRes.ok) return { success: false, message: `Failed to save: ${insertRes.status}` };
    }

    // Update quotation_status = 'Sent'
    const patchUrl = new URL("/rest/v1/wedding_bookings", url);
    patchUrl.searchParams.set("id", `eq.${bookingId}`);
    await fetch(patchUrl, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ quotation_status: "Sent" }),
    });

    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, message: "Unable to save quotation." };
  }
}
