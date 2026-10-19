import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  Stack,
  Typography,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { fetchMonths } from "../api/months";
import { fetchSpending } from "../api/spending";
import { formatCurrency } from "../utils/currency";
import { formatMonth, getCurrentMonth } from "../utils/month";
import { useAppSelector } from "../store/hooks";
import Header from "./Header";
import BudgetSummaryTiles from "./BudgetSummaryTiles";
import SpendingBreakdown from "./SpendingBreakdown";

function ReportsScreen() {
  const currentMonth = getCurrentMonth();
  // "2026-10" style key; null means "the newest month" (the current one).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const highlightedId = useAppSelector((state) => state.ui.highlightedCategoryId);
  // Table rows by category id, so a pick on the chart can scroll to its row.
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());

  const { data: months } = useQuery({
    queryKey: ["months"],
    queryFn: () => fetchMonths(currentMonth),
  });

  const selected =
    months?.find((m) => `${m.year}-${m.month}` === selectedKey) ?? months?.[0];

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["spending", selected?.year, selected?.month],
    queryFn: () => fetchSpending(selected!),
    enabled: selected !== undefined,
  });

  // Runs after the table renders. Coming from the Dashboard, the data may
  // still be loading, so this re-runs once summary arrives.
  useEffect(() => {
    if (highlightedId === null) return;
    rowRefs.current.get(highlightedId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedId, summary]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", minWidth: 0 }}>
      <Header />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none" }}>
            Reports
          </Typography>
        </Stack>

        {selected && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip
              size="small"
              label={selected.isClosed ? "Closed" : "In progress"}
              color={selected.isClosed ? "default" : "primary"}
            />
            <Select
              size="small"
              value={`${selected.year}-${selected.month}`}
              onChange={(e) => setSelectedKey(e.target.value)}
              aria-label="Month"
              sx={{ minWidth: 180 }}
            >
              {months?.map((m) => (
                <MenuItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {formatMonth(m)}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
      </Stack>

      {isLoading || !months ? (
        <CircularProgress size={24} />
      ) : isError || !summary ? (
        <Alert severity="error">Couldn't load this month's report.</Alert>
      ) : (
        <>
          <BudgetSummaryTiles summary={summary} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "2fr 3fr" },
              gap: 2,
            }}
          >
            <SpendingBreakdown categories={summary.categories} />

            <Card sx={{ padding: { xs: 2, sm: 3 }, minWidth: 0 }}>
              <Typography variant="h2" sx={{ textTransform: "none", marginBottom: 2 }}>
                Budget vs Spent
              </Typography>
              {summary.categories.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No categories this month.
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
                      {summary.categories.map((c) => (
                        <TableRow
                          key={c.categoryId}
                          selected={c.categoryId === highlightedId}
                          sx={{
                            "&.Mui-selected": { backgroundColor: "action.selected" },
                            // A teal bar on the left edge, so the pick is easy to spot.
                            "&.Mui-selected td:first-of-type": {
                              boxShadow: (t) => `inset 3px 0 ${t.palette.primary.main}`,
                            },
                          }}
                          ref={(row) => {
                            if (row) rowRefs.current.set(c.categoryId, row);
                            else rowRefs.current.delete(c.categoryId);
                          }}
                        >
                          <TableCell>{c.name}</TableCell>
                          <TableCell align="right">
                            {c.budget > 0 ? formatCurrency(c.budget) : "—"}
                          </TableCell>
                          <TableCell align="right">{formatCurrency(c.spent)}</TableCell>
                          <TableCell
                            align="right"
                            sx={{ color: c.isOverBudget && c.budget > 0 ? "error.main" : undefined }}
                          >
                            {c.budget > 0
                              ? c.isOverBudget
                                ? `${formatCurrency(-c.remaining)} over`
                                : formatCurrency(c.remaining)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Box>
        </>
      )}
    </Box>
  );
}

export default ReportsScreen;
