import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Stack,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import CategoryIcon from "@mui/icons-material/Category";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import type { CategorySpending } from "../api/spending";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { updateCategoryBudget } from "../api/categories";
import { setCategorySpent } from "../api/expenses";
import { formatCurrency, parseCost } from "../utils/currency";

type EditableField = "budget" | "spent";

function CategoryBudgetTable() {
  const queryClient = useQueryClient();
  // One cell at a time: which category, and which of its two numbers.
  const [editing, setEditing] = useState<{ categoryId: number; field: EditableField } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const parsedValue = parseCost(draftValue);

  const { data: spending, isLoading, isError } = useCurrentSpending();

  const saveMutation = useMutation({
    mutationFn: async ({
      category,
      field,
      value,
    }: {
      category: CategorySpending;
      field: EditableField;
      value: number;
    }) => {
      if (field === "budget") await updateCategoryBudget(category.categoryId, category.name, value);
      else await setCategorySpent(category.categoryId, value);
    },
    onSuccess: (_result, { field }) => {
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      if (field === "budget") queryClient.invalidateQueries({ queryKey: ["categories"] });
      else queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setEditing(null);
    },
  });

  function startEditing(category: CategorySpending, field: EditableField) {
    const current = category[field];
    setEditing({ categoryId: category.categoryId, field });
    setDraftValue(current > 0 ? String(current) : "");
    saveMutation.reset();
  }

  function handleSubmit(e: React.FormEvent, category: CategorySpending, field: EditableField) {
    e.preventDefault();
    if (parsedValue === null) return;
    if (parsedValue === category[field]) {
      setEditing(null);
      return;
    }
    saveMutation.mutate({ category, field, value: parsedValue });
  }

  function renderEditableCell(category: CategorySpending, field: EditableField) {
    const isEditing = editing?.categoryId === category.categoryId && editing.field === field;

    if (isEditing) {
      return (
        <Stack
          component="form"
          direction="row"
          spacing={0.5}
          onSubmit={(e: React.FormEvent) => handleSubmit(e, category, field)}
          sx={{ alignItems: "center", justifyContent: "flex-end" }}
        >
          <TextField
            size="small"
            type="number"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            error={parsedValue === null}
            autoFocus
            aria-label={`${category.name} ${field}`}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              },
              htmlInput: { min: 0, step: "0.01" },
            }}
            sx={{ width: 130 }}
          />
          <IconButton
            key="save"
            type="submit"
            size="small"
            disabled={parsedValue === null || saveMutation.isPending}
            aria-label={`Save ${field}`}
          >
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton
            key="cancel"
            size="small"
            onClick={() => setEditing(null)}
            aria-label={`Cancel ${field} edit`}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      );
    }

    // Distinct keys stop React from reusing the Edit button's DOM node as the
    // Save button. If it did, the browser would treat the same click as a
    // submit (the button is now type="submit") and close the editor instantly.
    const value = category[field];
    return (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
        {field === "budget" && value === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Not set
          </Typography>
        ) : (
          <Typography variant="body2">{formatCurrency(value)}</Typography>
        )}
        <IconButton
          key="edit"
          size="small"
          onClick={() => startEditing(category, field)}
          aria-label={`Edit ${category.name} ${field}`}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Card sx={{ padding: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
        <CategoryIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none" }}>
          Budget by Category
        </Typography>
      </Stack>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : isError ? (
        <Alert severity="error">Couldn't load your category budgets.</Alert>
      ) : spending?.categories.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No categories yet — plan them above.
        </Typography>
      ) : (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Budget</TableCell>
                <TableCell align="right">Spent</TableCell>
                <TableCell align="right">Remaining</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {spending?.categories.map((category) => (
                <TableRow key={category.categoryId}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell align="right">{renderEditableCell(category, "budget")}</TableCell>
                  <TableCell align="right">{renderEditableCell(category, "spent")}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: category.isOverBudget ? "error.main" : undefined }}
                  >
                    {category.budget > 0 ? formatCurrency(category.remaining) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {saveMutation.isError && (
        <Alert severity="error" sx={{ marginTop: 2 }}>
          {saveMutation.error.message}
        </Alert>
      )}
    </Card>
  );
}

export default CategoryBudgetTable;
