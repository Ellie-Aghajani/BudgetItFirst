import { useQuery } from "@tanstack/react-query";
import { Typography, Box } from "@mui/material";
import { fetchTodos } from "../api/todos";
import { fetchCategories } from "../api/categories";
import { useAppSelector } from "../store/hooks";
import CategoryCard from "./CategoryCard";

const UNCATEGORIZED_LABEL = "Uncategorized";

function TodoList() {
  const {
    data: todos,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const filter = useAppSelector((state) => state.ui.filter);
  const selectedCategoryId = useAppSelector(
    (state) => state.ui.selectedCategoryId,
  );

  if (isLoading) return <Typography>Loading...</Typography>;
  if (isError)
    return <Typography>Something went wrong loading your shopping list.</Typography>;

  const statusFilteredTodos = todos?.filter((todo) =>
    filter === "active"
      ? !todo.isComplete
      : filter === "completed"
        ? todo.isComplete
        : true,
  );

  const knownCategoryIds = new Set(categories?.map((c) => c.id));

  // Group todos by category, including an "Uncategorized" bucket for any
  // todo whose categoryId doesn't match a real, known category — a
  // defensive fallback, since the backend's FK makes this unlikely in
  // practice, but not something the UI should ever crash on.
  const groups: { id: number | null; title: string; todos: typeof todos }[] =
    [];

  categories?.forEach((category) => {
    const categoryTodos = statusFilteredTodos?.filter(
      (t) => t.categoryId === category.id,
    );
    if (categoryTodos && categoryTodos.length > 0) {
      groups.push({
        id: category.id,
        title: category.name,
        todos: categoryTodos,
      });
    }
  });

  const uncategorizedTodos = statusFilteredTodos?.filter(
    (t) => !knownCategoryIds.has(t.categoryId),
  );
  if (uncategorizedTodos && uncategorizedTodos.length > 0) {
    groups.push({
      id: null,
      title: UNCATEGORIZED_LABEL,
      todos: uncategorizedTodos,
    });
  }

  const visibleGroups =
    selectedCategoryId !== null
      ? groups.filter((g) => g.id === selectedCategoryId)
      : groups;

  if (visibleGroups.length === 0) {
    const message =
      selectedCategoryId !== null
        ? "No items in this category."
        : filter === "active"
          ? "Nothing left to buy."
          : filter === "completed"
            ? "Nothing bought yet."
            : "Your shopping list is empty — add an item above.";

    return (
      <Typography
        color="text.secondary"
        sx={{ textAlign: "center", padding: 3 }}
      >
        {message}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: 2,
      }}
    >
      {visibleGroups.map((group) => (
        <CategoryCard
          key={group.id ?? "uncategorized"}
          title={group.title}
          todos={group.todos!}
          categoryId={group.id}
        />
      ))}
    </Box>
  );
}

export default TodoList;
