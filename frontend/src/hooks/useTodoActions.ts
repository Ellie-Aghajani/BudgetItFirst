import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleTodo, deleteTodo, updateTodo, type Todo } from "../api/todos";
import { useOverBudgetWarning } from "./useOverBudgetWarning";
import { useAppDispatch } from "../store/hooks";
import { promptSpending, itemUnchecked } from "../store/uiSlice";

// Check off, edit and delete for one shopping-list item. Shared by the
// Shopping List page and the Dashboard card, so both behave the same.
export function useTodoActions(todo: Todo) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { saveWithWarning, dialogProps } = useOverBudgetWarning();

  // Optimistic: the checkbox flips right away and rolls back if the request fails.
  const toggleMutation = useMutation({
    mutationFn: toggleTodo,
    onMutate: async (todoBeingToggled) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old?.map((t) =>
          t.id === todoBeingToggled.id
            ? { ...t, isComplete: !t.isComplete }
            : t,
        ),
      );
      return { previousTodos };
    },
    onError: (_err, _todo, context) => {
      queryClient.setQueryData(["todos"], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onMutate: async (idBeingDeleted) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old?.filter((t) => t.id !== idBeingDeleted),
      );
      return { previousTodos };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["todos"], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (changes: { title: string; estimatedCost: number }) =>
      updateTodo(todo, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
    },
  });

  // Calls onDone once saved, or right away when nothing changed.
  function saveEdit(title: string, estimatedCost: number, onDone: () => void) {
    const trimmed = title.trim();
    if (
      !trimmed ||
      (trimmed === todo.title && estimatedCost === todo.estimatedCost)
    ) {
      onDone();
      return;
    }
    // Only the increase counts toward the budget: editing $10 → $12 adds $2.
    saveWithWarning(todo.categoryId, estimatedCost - todo.estimatedCost, () =>
      updateMutation.mutate(
        { title: trimmed, estimatedCost },
        { onSuccess: onDone },
      ),
    );
  }

  return {
    toggle: () => {
      toggleMutation.mutate(todo);
      // Checking off means it was bought, so offer to log what was paid.
      // Asked right away, like the checkbox itself (optimistic).
      if (todo.isComplete) {
        dispatch(itemUnchecked(todo.id));
        return;
      }
      const todos = queryClient.getQueryData<Todo[]>(["todos"]) ?? [];
      dispatch(
        promptSpending({
          categoryId: todo.categoryId,
          itemId: todo.id,
          otherBoughtIds: todos
            .filter(
              (t) =>
                t.categoryId === todo.categoryId &&
                t.isComplete &&
                t.id !== todo.id,
            )
            .map((t) => t.id),
        }),
      );
    },
    remove: () => deleteMutation.mutate(todo.id),
    saveEdit,
    isSaving: updateMutation.isPending,
    saveError: updateMutation.error,
    dialogProps,
  };
}
