import { useQuery } from "@tanstack/react-query";
import { fetchTodos } from "../api/todos";
import { fetchCategories } from "../api/categories";
import type { SpendingDraft } from "../store/uiSlice";
import { roundToCents } from "../utils/currency";

const MAX_NOTE_LENGTH = 200;

// Turns a draft's item ids into what's shown and pre-filled, from the live
// shopping list. Computed (derived state), never stored: an item that's
// unchecked, deleted or re-priced drops out of or changes the total on the
// next render, so the numbers can't go stale.
export function useDraftDetails(draft: SpendingDraft | null) {
  const { data: todos } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const items = draft
    ? (todos ?? []).filter((t) => draft.todoIds.includes(t.id) && t.isComplete)
    : [];
  const titles = items.map((t) => t.title);

  return {
    items,
    titles,
    total: roundToCents(items.reduce((sum, t) => sum + t.estimatedCost, 0)),
    note: titles.join(", ").slice(0, MAX_NOTE_LENGTH),
    categoryName: categories?.find((c) => c.id === draft?.categoryId)?.name ?? "this category",
    // False until the list has loaded, so callers don't treat "loading" as "empty".
    isReady: todos !== undefined,
  };
}
