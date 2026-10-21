import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { fetchCategories } from "../api/categories";
import { createExpense } from "../api/expenses";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { parseISODate } from "../utils/dates";
import {
  buildSavedMessage,
  type SavedMessage,
} from "../utils/spendingMessages";

// Logs spending on a specific day, from the calendar's "+".
function AddSpendingDialog({
  date,
  onClose,
  onSaved,
}: {
  date: string; // "YYYY-MM-DD"
  onClose: () => void;
  onSaved: (message: SavedMessage) => void;
}) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: spending } = useCurrentSpending();

  const parsedAmount = Number(amount);
  const isAmountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = categoryId !== "" && isAmountValid;

  const saveMutation = useMutation({
    mutationFn: () =>
      createExpense(categoryId as number, parsedAmount, note.trim(), date),
    onSuccess: (expense) => {
      // Totals from before the save, so the over-budget check is right.
      onSaved(buildSavedMessage(spending, expense.categoryId, expense.amount));
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saveMutation.isPending) return;
    saveMutation.mutate();
  }

  const title = parseISODate(date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add spending · {title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ paddingTop: 1 }}>
            {categories?.length === 0 ? (
              <Alert severity="info">
                Add a category on the Budget page first.
              </Alert>
            ) : (
              <TextField
                select
                label="Category"
                size="small"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                autoFocus
              >
                {categories?.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Amount paid"
              size="small"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={amount !== "" && !isAmountValid}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                },
                htmlInput: { min: 0.01, step: "0.01" },
              }}
            />
            <TextField
              label="Note (optional)"
              size="small"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
            />
            {saveMutation.isError && (
              <Alert severity="error">{saveMutation.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSave || saveMutation.isPending}
          >
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default AddSpendingDialog;
