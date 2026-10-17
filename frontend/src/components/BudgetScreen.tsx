import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { fetchBudgetSettings, updateMonthlyIncome } from "../api/budgetSettings";
import Header from "./Header";

function BudgetScreen() {
  const queryClient = useQueryClient();
  // null means "the user hasn't typed anything yet" — show the saved value.
  const [draftIncome, setDraftIncome] = useState<string | null>(null);
  const [isSavedMessageOpen, setIsSavedMessageOpen] = useState(false);

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["budgetSettings"],
    queryFn: fetchBudgetSettings,
  });

  const saveMutation = useMutation({
    mutationFn: updateMonthlyIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgetSettings"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      setDraftIncome(null);
      setIsSavedMessageOpen(true);
    },
  });

  const inputValue = draftIncome ?? String(settings?.monthlyIncome ?? "");
  const parsedIncome = Number(inputValue);
  const isValid = inputValue.trim() !== "" && Number.isFinite(parsedIncome) && parsedIncome >= 0;
  const hasChanges = draftIncome !== null && parsedIncome !== settings?.monthlyIncome;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !hasChanges) return;
    saveMutation.mutate(parsedIncome);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", minWidth: 0 }}>
      <Header />

      <Card sx={{ padding: 3, maxWidth: 520 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
          <AccountBalanceWalletIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none" }}>
            Monthly Budget
          </Typography>
        </Stack>

        {isLoading ? (
          <CircularProgress size={24} />
        ) : isError ? (
          <Alert severity="error">Couldn't load your budget settings.</Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "flex-start" } }}>
              <TextField
                label="Monthly Income"
                type="number"
                size="small"
                value={inputValue}
                onChange={(e) => setDraftIncome(e.target.value)}
                error={!isValid}
                helperText={isValid ? "Your total take-home income per month." : "Enter an amount of 0 or more."}
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  },
                  htmlInput: { min: 0, step: "0.01" },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!isValid || !hasChanges || saveMutation.isPending}
              >
                Save
              </Button>
            </Stack>

            {saveMutation.isError && (
              <Alert severity="error" sx={{ marginTop: 2 }}>
                {saveMutation.error.message}
              </Alert>
            )}
          </form>
        )}
      </Card>

      <Snackbar
        open={isSavedMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsSavedMessageOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setIsSavedMessageOpen(false)}>
          Monthly income saved.
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default BudgetScreen;
