import type { Metadata } from "next";

import { getAdminBookings } from "@/app/actions/wedding-bookings";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Marriott Admin Dashboard",
  description: "Admin dashboard for Marriott wedding consultation requests.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  try {
    const initialRequests = await getAdminBookings();

    return <AdminDashboard initialRequests={initialRequests} />;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? `Supabase data could not be loaded: ${error.message}`
        : "Supabase data could not be loaded.";

    return <AdminDashboard initialRequests={[]} initialError={errorMessage} />;
  }
}
