create unique index if not exists wedding_bookings_active_slot_idx
on public.wedding_bookings (consultation_date, consultation_time)
where coalesce(lower(status), '') <> 'rejected';
