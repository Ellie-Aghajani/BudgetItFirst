import { useState } from "react";
import {
  Box,
  ButtonBase,
  Card,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import PieChartIcon from "@mui/icons-material/PieChart";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { CategorySpending } from "../api/spending";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setActiveView, setHighlightedCategoryId } from "../store/uiSlice";
import { formatCurrency } from "../utils/currency";
import { getCategoryColors, REMAINING_COLOR } from "../utils/categoryColors";
import DonutChart, { LegendDot } from "./DonutChart";

type Metric = "spent" | "budget";

interface Segment {
  categoryId: number;
  name: string;
  value: number;
  color: string;
  // Over budget is about spending, so it's flagged in both views.
  overBy: number;
  budget: number;
  remaining: number;
}

function buildSegments(
  categories: CategorySpending[],
  metric: Metric,
  mode: "light" | "dark",
): Segment[] {
  const colors = getCategoryColors(
    categories.map((c) => c.categoryId),
    mode,
  );

  return (
    [...categories]
      .sort((a, b) => a.categoryId - b.categoryId)
      .map((category) => ({
        categoryId: category.categoryId,
        name: category.name,
        value: category[metric],
        color: colors.get(category.categoryId)!,
        overBy:
          category.budget > 0
            ? Math.max(category.spent - category.budget, 0)
            : 0,
        budget: category.budget,
        remaining: category.remaining,
      }))
      // Spent view keeps budgeted categories with nothing spent yet, so the
      // legend still shows what's left in them. The chart skips $0 slices.
      .filter(
        (segment) =>
          segment.value > 0 || (metric === "spent" && segment.budget > 0),
      )
  );
}

function SpendingBreakdown({ categories }: { categories: CategorySpending[] }) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.ui.theme);
  const activeView = useAppSelector((state) => state.ui.activeView);
  const highlightedId = useAppSelector(
    (state) => state.ui.highlightedCategoryId,
  );
  const [metric, setMetric] = useState<Metric>("spent");
  const segments = buildSegments(categories, metric, mode);
  const categoryTotal = segments.reduce((sum, s) => sum + s.value, 0);

  // In the Spent view the ring is the whole budget: category slices for what's
  // spent, then a gray slice for what's left. Overall, so one category's
  // overspending uses up room left in the others.
  const totalBudget = categories.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);
  const leftToSpend = totalBudget - totalSpent;
  const remainingSlice = metric === "spent" ? Math.max(leftToSpend, 0) : 0;
  const total = categoryTotal + remainingSlice;

  const centerNote =
    metric !== "spent" || totalBudget === 0
      ? undefined
      : leftToSpend >= 0
        ? `${formatCurrency(leftToSpend)} left`
        : `${formatCurrency(-leftToSpend)} over`;

  // Shows the category's row in Budget vs Spent. On the Dashboard that means
  // going to Reports first; on Reports the table is already on the page.
  function handleSelect(categoryId: number) {
    if (activeView !== "reports") dispatch(setActiveView("reports"));
    dispatch(setHighlightedCategoryId(categoryId));
  }

  return (
    <Card sx={{ padding: { xs: 2, sm: 3 }, height: "100%" }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
          flexWrap: "wrap",
          rowGap: 1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <PieChartIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none" }}>
            By Category
          </Typography>
        </Stack>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metric}
          onChange={(_e, value: Metric | null) => value && setMetric(value)}
          aria-label="Show spending or budget"
        >
          <ToggleButton value="spent">Spent</ToggleButton>
          <ToggleButton value="budget">Budget</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {metric === "spent"
            ? "No spending yet. Log a payment with Add Spending to see the breakdown."
            : "No budgets yet. Set them on the Budget page to see the breakdown."}
        </Typography>
      ) : (
        // Chart on top, legend below: the chart gets the card's full width
        // to grow into, and the legend rows have room for their notes.
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <DonutChart
            slices={segments.map((segment) => ({
              key: segment.categoryId,
              name: segment.name,
              value: segment.value,
              color: segment.color,
              isAlert: segment.overBy > 0,
              tooltip:
                `${segment.name}: ${formatCurrency(segment.value)} (${Math.round((segment.value / total) * 100)}%)` +
                (segment.overBy > 0
                  ? ` · Over budget by ${formatCurrency(segment.overBy)}`
                  : ""),
            }))}
            remaining={remainingSlice}
            remainingLabel="Left to spend"
            centerValue={categoryTotal}
            centerLabel={metric === "spent" ? "spent" : "budgeted"}
            centerNote={centerNote}
            centerNoteColor={leftToSpend < 0 ? "error.main" : "text.secondary"}
            highlightedKey={highlightedId}
            onSelect={(key) => handleSelect(key as number)}
          />

          {/* The legend doubles as the table view: every value is readable as
              text. Rows are buttons too, so keyboard users can pick a category. */}
          <Stack spacing={0.5} sx={{ width: "100%" }}>
            {segments.map((segment) => (
              <ButtonBase
                key={segment.categoryId}
                onClick={() => handleSelect(segment.categoryId)}
                aria-label={`Show ${segment.name} in Budget vs Spent`}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  borderRadius: 1,
                  paddingX: 1,
                  paddingY: 0.5,
                  backgroundColor:
                    highlightedId === segment.categoryId
                      ? "action.selected"
                      : undefined,
                  "&:hover": { backgroundColor: "action.hover" },
                  // Red left edge: matches the ring on the chart.
                  boxShadow:
                    segment.overBy > 0
                      ? `inset 3px 0 ${theme.palette.error.main}`
                      : undefined,
                }}
              >
                <LegendDot color={segment.color} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    {segment.name}
                  </Typography>
                  {/* Spent view: what's left in this category's budget. */}
                  {metric === "spent" &&
                    segment.budget > 0 &&
                    segment.overBy === 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        component="div"
                      >
                        {formatCurrency(segment.remaining)} left of{" "}
                        {formatCurrency(segment.budget)}
                      </Typography>
                    )}
                  {segment.overBy > 0 && (
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: "center", color: "error.main" }}
                    >
                      <WarningAmberIcon sx={{ fontSize: 14 }} />
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600 }}
                        noWrap
                      >
                        Over budget by {formatCurrency(segment.overBy)}
                      </Typography>
                    </Stack>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(segment.value)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ width: 40, textAlign: "right" }}
                >
                  {Math.round((segment.value / total) * 100)}%
                </Typography>
              </ButtonBase>
            ))}

            {remainingSlice > 0 && (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center", paddingX: 1, paddingY: 0.5 }}
              >
                <LegendDot color={REMAINING_COLOR[mode]} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1, minWidth: 0 }}
                  noWrap
                >
                  Left to spend
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(remainingSlice)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ width: 40, textAlign: "right" }}
                >
                  {Math.round((remainingSlice / total) * 100)}%
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      )}
    </Card>
  );
}

export default SpendingBreakdown;
