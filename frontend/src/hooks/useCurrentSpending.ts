import { useQuery } from "@tanstack/react-query";
import { fetchSpending } from "../api/spending";
import { getCurrentMonth } from "../utils/month";

// The key includes the month, so each month is cached separately. Invalidating
// ["spending"] still refreshes all of them, because keys match by prefix.
export function useCurrentSpending() {
  const currentMonth = getCurrentMonth();
  return useQuery({
    queryKey: ["spending", currentMonth.year, currentMonth.month],
    queryFn: () => fetchSpending(currentMonth),
  });
}
