import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Stack,
  Typography,
  Box,
  Divider,
  IconButton,
  Alert,
  Button,
  Chip,
  Tooltip,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { deleteExpense, fetchExpenses, type Expense } from "../api/expenses";
import { fetchCategories } from "../api/categories";
import { formatCurrency } from "../utils/currency";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { findBudgetBreakers } from "../utils/overBudget";
import EditSpendingDialog from "./EditSpendingDialog";

const RECENT_COUNT = 5;

// The latest logged spending this month (already sorted newest first by the API).
function RecentActivity() {
  const queryClient = useQueryClient();
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
    },
  });

  const { data: spending } = useCurrentSpending();

  const categoryNames = new Map(categories?.map((c) => [c.id, c.name]));
  const allExpenses = expenses ?? [];
  const breakers = findBudgetBreakers(allExpenses, spending?.categories ?? []);
  const recentExpenses = showAll ? allExpenses : allExpenses.slice(0, RECENT_COUNT);

  return (
    <Card sx={{ padding: { xs: 2, sm: 3 }, flex: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 2 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none" }}>
          Recent Spending
        </Typography>
      </Stack>

      {recentExpenses.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No spending logged this month.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {recentExpenses.map((expense, index) => (
            <Fragment key={expense.id}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {categoryNames.get(expense.categoryId) ?? "Uncategorized"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {expense.isAdjustment ? "Adjusted on Budget page" : (expense.note ?? "—")}
                  </Typography>
                  {breakers.has(expense.id) && (
                    <Tooltip
                      title={`This took ${breakers.get(expense.id)!.categoryName} over its ${formatCurrency(
                        breakers.get(expense.id)!.budget,
                      )} budget. It's ${formatCurrency(breakers.get(expense.id)!.overBy)} over now.`}
                    >
                      <Chip
                        size="small"
                        color="error"
                        icon={<WarningAmberIcon />}
                        label="Went over budget"
                        sx={{ marginTop: 0.5 }}
                      />
                    </Tooltip>
                  )}
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(expense.amount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(expense.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </Typography>
                </Box>
                {/* Adjustments are changed through Spent on the Budget page. */}
                {!expense.isAdjustment && (
                  <IconButton
                    size="small"
                    onClick={() => setExpenseToEdit(expense)}
                    aria-label="Edit spending"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => deleteMutation.mutate(expense.id)}
                  disabled={deleteMutation.isPending}
                  aria-label="Delete spending"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
              {index < recentExpenses.length - 1 && <Divider />}
            </Fragment>
          ))}
        </Stack>
      )}

      {allExpenses.length > RECENT_COUNT && (
        <Button size="small" onClick={() => setShowAll((prev) => !prev)} sx={{ marginTop: 1 }}>
          {showAll ? "Show less" : `Show all (${allExpenses.length})`}
        </Button>
      )}

      {expenseToEdit && (
        <EditSpendingDialog
          key={expenseToEdit.id}
          expense={expenseToEdit}
          onClose={() => setExpenseToEdit(null)}
        />
      )}

      {deleteMutation.isError && (
        <Alert severity="error" sx={{ marginTop: 2 }}>
          {deleteMutation.error.message}
        </Alert>
      )}
    </Card>
  );
}

export default RecentActivity;
