import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Stack,
  Typography,
  TextField,
  MenuItem,
  InputAdornment,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import { fetchCategories } from "../api/categories";
import { createExpense } from "../api/expenses";
import { formatCurrency } from "../utils/currency";

// Logs money actually paid. This, not the shopping list, is what "Spent" counts.
function AddSpending() {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const parsedAmount = Number(amount);
  // Unlike an estimate, a payment of $0 means nothing, so it must be above 0.
  const isAmountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = categoryId !== "" && isAmountValid;

  const addMutation = useMutation({
    mutationFn: () => createExpense(categoryId as number, parsedAmount, note.trim()),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      const categoryName = categories?.find((c) => c.id === expense.categoryId)?.name;
      setSavedMessage(`${formatCurrency(expense.amount)} added to ${categoryName ?? "spending"}.`);
      // Keep the category: people often log several payments in a row for it.
      setAmount("");
      setNote("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || addMutation.isPending) return;
    addMutation.mutate();
  }

  return (
    <Card sx={{ padding: 3, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
        <PaymentsIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none" }}>
          Add Spending
        </Typography>
      </Stack>

      {categories?.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Add a category on the Budget page first.
        </Typography>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-start" } }}>
            <TextField
              select
              label="Category"
              size="small"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              sx={{ minWidth: 180 }}
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
              error={amount !== "" && !isAmountValid}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
                htmlInput: { min: 0.01, step: "0.01" },
              }}
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="Note (optional)"
              size="small"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={!canSave || addMutation.isPending}>
              Add
            </Button>
          </Stack>

          {addMutation.isError && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {addMutation.error.message}
            </Alert>
          )}
        </form>
      )}

      <Snackbar
        open={savedMessage !== null}
        autoHideDuration={3000}
        onClose={() => setSavedMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSavedMessage(null)}>
          {savedMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
}

export default AddSpending;
