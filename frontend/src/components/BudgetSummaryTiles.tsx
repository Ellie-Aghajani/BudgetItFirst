import { Box, Card, Stack, Typography, LinearProgress } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { SpendingSummary } from "../api/spending";
import { formatCurrency } from "../utils/currency";

function StatTile({
  label,
  value,
  valueColor,
  children,
}: {
  label: string;
  value: string;
  valueColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card sx={{ padding: 2.5, minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="h1"
        sx={{ textTransform: "none", marginBottom: 1, color: valueColor }}
      >
        {value}
      </Typography>
      {children}
    </Card>
  );
}

// Shared by the Dashboard (current month) and Reports (any month).
function BudgetSummaryTiles({ summary }: { summary: SpendingSummary }) {
  const hasIncome = summary.monthlyIncome > 0;
  const percentOfIncome = summary.percentOfIncomeUsed ?? 0;
  const isOverIncome = hasIncome && summary.remainingIncome < 0;
  const isOverAllocated = hasIncome && summary.totalBudget > summary.monthlyIncome;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      <StatTile label="Monthly Income" value={formatCurrency(summary.monthlyIncome)}>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(summary.totalBudget)} budgeted across categories
        </Typography>
        {isOverAllocated && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", marginTop: 0.5 }}>
            <WarningAmberIcon color="warning" fontSize="small" />
            <Typography variant="body2">More than your income</Typography>
          </Stack>
        )}
      </StatTile>

      <StatTile label="Total Spent" value={formatCurrency(summary.totalSpent)}>
        {hasIncome && (
          <>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentOfIncome, 100)}
              color={isOverIncome ? "error" : percentOfIncome >= 80 ? "warning" : "primary"}
            />
            <Typography variant="body2" color="text.secondary" sx={{ marginTop: 0.5 }}>
              {Math.round(percentOfIncome)}% of income
            </Typography>
          </>
        )}
      </StatTile>

      <StatTile
        label="Remaining"
        value={hasIncome ? formatCurrency(summary.remainingIncome) : "—"}
        valueColor={isOverIncome ? "error.main" : undefined}
      >
        {isOverIncome && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <WarningAmberIcon color="error" fontSize="small" />
            <Typography variant="body2">Over your income</Typography>
          </Stack>
        )}
      </StatTile>
    </Box>
  );
}

export default BudgetSummaryTiles;
