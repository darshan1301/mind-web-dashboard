import { atom } from "recoil";

/**
 * A tuple representing the selected date range: [startDate, endDate]
 */
export type DateRange = [Date, Date];

// Calculate default start and end dates relative to today
const today = new Date();

// Start 3 days ago, at 00:00:00
const defaultStartDate = new Date(today);
defaultStartDate.setDate(today.getDate() - 3);
defaultStartDate.setHours(0, 0, 0, 0);

// End 1 day from now, at 23:59:59.999
const defaultEndDate = new Date(today);
defaultEndDate.setDate(today.getDate() + 1);
defaultEndDate.setHours(23, 59, 59, 999);

/**
 * Recoil atom to store the current selected date range.
 * Default is from 3 days ago (midnight) to tomorrow (end of day).
 */
export const selectedRangeState = atom<DateRange>({
  key: "selectedRangeState",
  default: [defaultStartDate, defaultEndDate],
});
