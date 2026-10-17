import { Box, Card, Stack, Typography, Tooltip } from "@mui/material";
import PieChartIcon from "@mui/icons-material/PieChart";
import type { CategorySpending } from "../api/spending";
import { useAppSelector } from "../store/hooks";
import { chartColors } from "../theme";
import { formatCurrency } from "../utils/currency";

interface Segment {
  key: string;
  name: string;
  spent: number;
  color: string;
}

function buildSegments(categories: CategorySpending[], mode: "light" | "dark"): Segment[] {
  const palette = chartColors.series[mode];
  // Sort by id so each category keeps the same color no matter how its
  // spending changes — color follows the category, not its rank.
  const sorted = [...categories].sort((a, b) => a.categoryId - b.categoryId);

  const segments: Segment[] = [];
  let otherSpent = 0;
  sorted.forEach((category, index) => {
    if (index < palette.length) {
      if (category.spent > 0) {
        segments.push({
          key: String(category.categoryId),
          name: category.name,
          spent: category.spent,
          color: palette[index],
        });
      }
    } else {
      otherSpent += category.spent;
    }
  });

  if (otherSpent > 0) {
    segments.push({ key: "other", name: "Other", spent: otherSpent, color: chartColors.other[mode] });
  }
  return segments;
}

function SpendingBreakdown({ categories }: { categories: CategorySpending[] }) {
  const mode = useAppSelector((state) => state.ui.theme);
  const segments = buildSegments(categories, mode);
  const total = segments.reduce((sum, s) => sum + s.spent, 0);

  return (
    <Card sx={{ padding: 3, height: "100%" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
        <PieChartIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none" }}>
          Spending by Category
        </Typography>
      </Stack>

      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No spending yet — add items with an estimated cost to see the breakdown.
        </Typography>
      ) : (
        <>
          {/* One stacked bar: each segment's width is its share of total spending. */}
          <Box sx={{ display: "flex", gap: "2px", height: 16, marginBottom: 2 }}>
            {segments.map((segment) => (
              <Tooltip
                key={segment.key}
                title={`${segment.name}: ${formatCurrency(segment.spent)} (${Math.round((segment.spent / total) * 100)}%)`}
              >
                <Box
                  sx={{
                    width: `${(segment.spent / total) * 100}%`,
                    minWidth: 4,
                    backgroundColor: segment.color,
                    "&:first-of-type": { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
                    "&:last-of-type": { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          {/* The legend doubles as the table view: every value is readable as text. */}
          <Stack spacing={1}>
            {segments.map((segment) => (
              <Stack
                key={segment.key}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: segment.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {segment.name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(segment.spent)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ width: 40, textAlign: "right" }}
                >
                  {Math.round((segment.spent / total) * 100)}%
                </Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}
    </Card>
  );
}

export default SpendingBreakdown;
