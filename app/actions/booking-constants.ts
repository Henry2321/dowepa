export const AVAILABLE_TIME_SLOTS = ["2:00", "3:00", "4:00", "5:00", "6:00"] as const;

export type ConsultationSlot = (typeof AVAILABLE_TIME_SLOTS)[number];
