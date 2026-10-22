import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  Button,
  Alert,
} from "@mui/material";
import { fetchCategories } from "../api/categories";
import { updateExpense, type Expense } from "../api/expenses";
import { isSpendableDate } from "../utils/dates";
import SpentOnField from "./SpentOnField";

// Rendered with key={expense.id}, so each expense gets a fresh component and
// the form state below starts from that expense. No effect needed to sync it.
function EditSpendingDialog({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [amount, setAmount] = useState(String(expense.amount));
  const [note, setNote] = useState(expense.note ?? "");
  // Moving it to another day: only within this month, like adding.
  const [spentOn, setSpentOn] = useState(expense.spentOn);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const parsedAmount = Number(amount);
  const isAmountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = isAmountValid && isSpendableDate(spentOn);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateExpense(expense.id, {
        categoryId,
        amount: parsedAmount,
        note: note.trim(),
        spentOn,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saveMutation.isPending) return;
    saveMutation.mutate();
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit spending</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ paddingTop: 1 }}>
            <TextField
              select
              label="Category"
              size="small"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
              {categories?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount paid"
              size="small"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={!isAmountValid}
              helperText={
                isAmountValid ? undefined : "Enter an amount above 0."
              }
              autoFocus
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
            <SpentOnField value={spentOn} onChange={setSpentOn} />
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
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default EditSpendingDialog;
