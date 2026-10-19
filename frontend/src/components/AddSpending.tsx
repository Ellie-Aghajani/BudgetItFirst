import { useEffect, useRef, useState } from "react";
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
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { cancelSpendingDraft, finishSpendingDraft } from "../store/uiSlice";
import { useDraftDetails } from "../hooks/useDraftDetails";

interface SavedMessage {
  text: string;
  severity: "success" | "warning";
}

// Logs money actually paid. This, not the shopping list, is what "Spent" counts.
function AddSpending() {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [savedMessage, setSavedMessage] = useState<SavedMessage | null>(null);
  const dispatch = useAppDispatch();
  // Set when the user checked off a shopping item and chose "Add spending".
  const draft = useAppSelector((state) => state.ui.spendingDraft);
  const cardRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const details = useDraftDetails(draft);

  // What the form was last filled with from the draft. While a field still
  // holds that value the user hasn't typed over it, so it keeps following the
  // list: uncheck an item and the amount and note recalculate. Once the user
  // types their own amount (the receipt total), it's left alone.
  // Done during render, not in an effect, so the form never shows a frame of
  // stale numbers. (React's "adjusting state when a prop changes" pattern.)
  const [autoFilled, setAutoFilled] = useState<{
    draftId: string;
    amount: string;
    note: string;
  } | null>(null);
  const nextAmount = details.total > 0 ? String(details.total) : "";
  if (
    draft &&
    details.isReady &&
    (autoFilled?.draftId !== draft.id ||
      autoFilled.amount !== nextAmount ||
      autoFilled.note !== details.note)
  ) {
    const isNewDraft = autoFilled?.draftId !== draft.id;
    setAutoFilled({
      draftId: draft.id,
      amount: nextAmount,
      note: details.note,
    });
    if (isNewDraft) setCategoryId(draft.categoryId);
    if (isNewDraft || amount === autoFilled.amount) setAmount(nextAmount);
    if (isNewDraft || note === autoFilled.note) setNote(details.note);
  }
  // Draft gone (saved, cancelled, or emptied): clear what it filled in.
  if (!draft && autoFilled) {
    setAutoFilled(null);
    if (amount === autoFilled.amount) setAmount("");
    if (note === autoFilled.note) setNote("");
  }
  const hasCustomAmount =
    draft !== null && autoFilled !== null && amount !== autoFilled.amount;

  // Every item in the entry was unchecked or deleted: nothing left to log.
  useEffect(() => {
    if (draft && details.isReady && details.items.length === 0)
      dispatch(finishSpendingDraft());
  }, [draft, details.isReady, details.items.length, dispatch]);

  // Bring the form into view and put the cursor on the amount, once per
  // draft (not on every recalculation). Scroll and focus act on the page
  // itself, which is what effects are for.
  const draftId = draft?.id;
  useEffect(() => {
    if (!draftId) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    amountRef.current?.focus({ preventScroll: true });
    amountRef.current?.select();
  }, [draftId]);

  function cancelDraft() {
    dispatch(cancelSpendingDraft());
  }

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: spending } = useCurrentSpending();

  const parsedAmount = Number(amount);
  // Unlike an estimate, a payment of $0 means nothing, so it must be above 0.
  const isAmountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const canSave = categoryId !== "" && isAmountValid;

  const addMutation = useMutation({
    mutationFn: () =>
      createExpense(categoryId as number, parsedAmount, note.trim()),
    onSuccess: (expense) => {
      // Read the totals before invalidating: they don't include this expense yet.
      setSavedMessage(buildSavedMessage(expense.categoryId, expense.amount));
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      // Keep the category: people often log several payments in a row for it.
      setAmount("");
      setNote("");
      dispatch(finishSpendingDraft());
    },
  });

  // Warns (doesn't block) when this payment puts the category over budget.
  function buildSavedMessage(categoryId: number, amount: number): SavedMessage {
    const category = spending?.categories.find(
      (c) => c.categoryId === categoryId,
    );
    const added = `${formatCurrency(amount)} added to ${category?.name ?? "spending"}.`;
    if (!category || category.budget <= 0)
      return { text: added, severity: "success" };

    const newSpent = category.spent + amount;
    const overBy = newSpent - category.budget;
    if (overBy <= 0) return { text: added, severity: "success" };

    const wasAlreadyOver = category.spent > category.budget;
    return {
      severity: "warning",
      text: wasAlreadyOver
        ? `${added} ${category.name} is now ${formatCurrency(overBy)} over its ${formatCurrency(category.budget)} budget.`
        : `${added} This puts ${category.name} ${formatCurrency(overBy)} over its ${formatCurrency(category.budget)} budget.`,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || addMutation.isPending) return;
    addMutation.mutate();
  }

  return (
    <Card
      ref={cardRef}
      sx={{
        padding: { xs: 2, sm: 3 },
        minWidth: 0,
        // A teal outline while it holds a shopping item, so it's easy to spot.
        borderColor: draft ? "primary.main" : undefined,
        transition: "border-color 200ms",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", marginBottom: 2 }}
      >
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
          {draft && (
            <Alert
              severity="info"
              sx={{ marginBottom: 2 }}
              action={
                <Button color="inherit" size="small" onClick={cancelDraft}>
                  Cancel
                </Button>
              }
            >
              {details.titles.length === 1 ? (
                <>
                  From your shopping list: <strong>{details.titles[0]}</strong>,
                  estimated {formatCurrency(details.total)}.
                </>
              ) : (
                <>
                  From your shopping list: {details.titles.length}{" "}
                  {details.categoryName} items (
                  <strong>{details.titles.join(", ")}</strong>), estimated{" "}
                  {formatCurrency(details.total)} in total.
                </>
              )}{" "}
              {hasCustomAmount ? (
                <>
                  You entered your own amount.{" "}
                  <Button
                    size="small"
                    onClick={() => setAmount(nextAmount)}
                    sx={{ padding: 0, minWidth: 0, verticalAlign: "baseline" }}
                  >
                    Use {formatCurrency(details.total)}
                  </Button>
                </>
              ) : (
                "Change the amount to what you actually paid, then press Add."
              )}
            </Alert>
          )}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ alignItems: { md: "flex-start" } }}
          >
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
              inputRef={amountRef}
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
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="Note (optional)"
              size="small"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              disabled={!canSave || addMutation.isPending}
            >
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
        // Warnings stay up longer: they're worth reading.
        autoHideDuration={savedMessage?.severity === "warning" ? 8000 : 3000}
        onClose={() => setSavedMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={savedMessage?.severity ?? "success"}
          onClose={() => setSavedMessage(null)}
        >
          {savedMessage?.text}
        </Alert>
      </Snackbar>
    </Card>
  );
}

export default AddSpending;
