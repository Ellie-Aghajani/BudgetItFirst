import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  TextField,
  InputAdornment,
  Stack,
  Select,
  MenuItem,
  Box,
  IconButton,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { createTodo } from "../api/todos";
import { createCategory, fetchCategories } from "../api/categories";
import { useOverBudgetWarning } from "../hooks/useOverBudgetWarning";
import { parseCost } from "../utils/currency";
import OverBudgetDialog from "./OverBudgetDialog";

const ADD_CATEGORY_VALUE = "__add_category__";

function AddTodo() {
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [draftCategoryName, setDraftCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const queryClient = useQueryClient();
  const { saveWithWarning, dialogProps } = useOverBudgetWarning();
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

  const createCategoryMutation = useMutation({
    // Wrapped so React Query's second argument (its context object) can't
    // land in createCategory's optional budget parameter.
    mutationFn: (name: string) => createCategory(name),
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      setCategoryId(newCategory.id);
      setDraftCategoryName("");
      setIsAddingCategory(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || categoryId === "" || parsedCost === null) return;

    const estimatedCost = parsedCost;
    saveWithWarning(categoryId, estimatedCost, () => {
      createTodoMutation.mutate({ title, categoryId, estimatedCost });
      setTitle("");
      setCost("");
    });
  }

  function handleCategoryCreate() {
    const trimmed = draftCategoryName.trim();
    if (!trimmed) return;

    createCategoryMutation.mutate(trimmed);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ alignItems: "center", flexWrap: "wrap" }}
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
            minWidth: 220,
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
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
            htmlInput: { min: 0, step: "0.01" },
          }}
          sx={{ width: 130 }}
        />

        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}
        >
          <Select
            value={categoryId === "" ? "" : categoryId}
            onChange={(e) => {
              const value = e.target.value as number | string;
              if (typeof value === "string" && value === ADD_CATEGORY_VALUE) {
                setIsAddingCategory(true);
                return;
              }
              setCategoryId(Number(value));
            }}
            displayEmpty
            size="small"
            sx={{ minWidth: 140 }}
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

          {isAddingCategory && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center", width: 200 }}
            >
              <TextField
                size="small"
                value={draftCategoryName}
                onChange={(e) => setDraftCategoryName(e.target.value)}
                placeholder="New category"
                autoFocus
                fullWidth
              />
              <IconButton
                type="button"
                size="small"
                color="primary"
                onClick={handleCategoryCreate}
                disabled={
                  createCategoryMutation.isPending || !draftCategoryName.trim()
                }
                aria-label="Create category"
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                type="button"
                size="small"
                onClick={() => {
                  setIsAddingCategory(false);
                  setDraftCategoryName("");
                }}
                aria-label="Cancel creating category"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Box>

        <Button type="submit" variant="contained" color="primary">
          Add
        </Button>
      </Stack>

      <OverBudgetDialog {...dialogProps} />
    </form>
  );
}

export default AddTodo;
