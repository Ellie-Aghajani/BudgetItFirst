import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  TextField,
  InputAdornment,
  Stack,
  Select,
  MenuItem,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { createTodo } from "../api/todos";
import { fetchCategories } from "../api/categories";
import { useOverBudgetWarning } from "../hooks/useOverBudgetWarning";
import { parseCost } from "../utils/currency";
import OverBudgetDialog from "./OverBudgetDialog";
import DuplicateItemDialog from "./DuplicateItemDialog";
import { useDuplicateItemCheck } from "../hooks/useDuplicateItemCheck";
import { useAppDispatch } from "../store/hooks";
import { openPlanEditor } from "../store/uiSlice";

const ADD_CATEGORY_VALUE = "__add_category__";

function AddTodo() {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const { saveWithWarning, dialogProps } = useOverBudgetWarning();
  const { confirmIfDuplicate, dialogProps: duplicateDialogProps } =
    useDuplicateItemCheck();
  const parsedCost = parseCost(cost);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createTodoMutation = useMutation({
    mutationFn: ({
      title,
      categoryId,
      estimatedCost,
    }: {
      title: string;
      categoryId: number;
      estimatedCost: number;
    }) => createTodo(title, categoryId, estimatedCost),
    onSuccess: (newTodo) => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      window.electronApp?.showNotification("Todo created", newTodo.title);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || categoryId === "" || parsedCost === null) return;

    const estimatedCost = parsedCost;
    // Duplicate check first, then the budget check: two separate questions.
    confirmIfDuplicate(title, estimatedCost, () =>
      saveWithWarning(categoryId, estimatedCost, () => {
        createTodoMutation.mutate({ title, categoryId, estimatedCost });
        setTitle("");
        setCost("");
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        // Stretch on phones so each field spans the full width; center in a row.
        sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap" }}
      >
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add an item to buy"
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AddCircleIcon color="primary" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            minWidth: { sm: 220 },
          }}
        />

        <TextField
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0.00"
          type="number"
          size="small"
          error={parsedCost === null}
          aria-label="Estimated cost"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">$</InputAdornment>
              ),
            },
            htmlInput: { min: 0, step: "0.01" },
          }}
          sx={{ width: { xs: "100%", sm: 130 } }}
        />

        <Select
          value={categoryId === "" ? "" : categoryId}
          onChange={(e) => {
            const value = e.target.value as number | string;
            // A new category needs a budget, so it's made on the Budget
            // page's planner rather than here.
            if (typeof value === "string" && value === ADD_CATEGORY_VALUE) {
              dispatch(openPlanEditor());
              return;
            }
            setCategoryId(Number(value));
          }}
          displayEmpty
          size="small"
          sx={{ minWidth: 140, width: { xs: "100%", sm: "auto" } }}
        >
          <MenuItem value="" disabled>
            {categories && categories.length > 0 ? "Category" : "No category"}
          </MenuItem>
          {categories?.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
          <MenuItem value={ADD_CATEGORY_VALUE}>+ Add category</MenuItem>
        </Select>

        <Button type="submit" variant="contained" color="primary">
          Add
        </Button>
      </Stack>

      <OverBudgetDialog {...dialogProps} />
      <DuplicateItemDialog {...duplicateDialogProps} />
    </form>
  );
}

export default AddTodo;
