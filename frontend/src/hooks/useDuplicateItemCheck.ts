import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Todo } from "../api/todos";

// Wraps an "add item" so it first asks for confirmation when the same item,
// same name and same cost, is already on this month's list or was already
// bought. Like the over-budget warning, it never blocks: "Add again" goes ahead.
export function useDuplicateItemCheck() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{
    match: Todo;
    add: () => void;
  } | null>(null);

  function confirmIfDuplicate(
    title: string,
    estimatedCost: number,
    add: () => void,
  ) {
    const key = title.trim().toLowerCase();
    // Read from the cache the list already loaded: no extra request.
    const todos = queryClient.getQueryData<Todo[]>(["todos"]) ?? [];
    const match = todos.find(
      (t) =>
        t.title.trim().toLowerCase() === key &&
        t.estimatedCost === estimatedCost,
    );
    if (!match) {
      add();
      return;
    }
    setPending({ match, add });
  }

  return {
    confirmIfDuplicate,
    dialogProps: {
      match: pending?.match ?? null,
      onCancel: () => setPending(null),
      onConfirm: () => {
        pending?.add();
        setPending(null);
      },
    },
  };
}
