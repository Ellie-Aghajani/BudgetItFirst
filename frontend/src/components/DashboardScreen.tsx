import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { useAppDispatch } from "../store/hooks";
import { setActiveView } from "../store/uiSlice";
import { formatMonth, getCurrentMonth } from "../utils/month";
import Header from "./Header";
import BudgetSummaryTiles from "./BudgetSummaryTiles";
import SpendingBreakdown from "./SpendingBreakdown";
import RecentActivity from "./RecentActivity";
import AddSpending from "./AddSpending";

function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { data: spending, isLoading, isError } = useCurrentSpending();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", minWidth: 0 }}>
      <Header />

      <Typography variant="h2" sx={{ textTransform: "none" }}>
        {formatMonth(getCurrentMonth())}
      </Typography>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : isError || !spending ? (
        <Alert severity="error">Couldn't load your budget overview.</Alert>
      ) : (
        <>
          {spending.monthlyIncome === 0 && (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={() => dispatch(setActiveView("budget"))}>
                  Set income
                </Button>
              }
            >
              Set your monthly income to see how your spending compares.
            </Alert>
          )}

          <BudgetSummaryTiles summary={spending} />

          <AddSpending />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" },
              gap: 2,
            }}
          >
            <SpendingBreakdown categories={spending.categories} />
            <RecentActivity />
          </Box>
        </>
      )}
    </Box>
  );
}

export default DashboardScreen;
