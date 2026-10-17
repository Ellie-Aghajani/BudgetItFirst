import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Typography,
  Alert,
} from "@mui/material";
import { completeRollover, fetchRolloverStatus } from "../api/months";
import { formatCurrency } from "../utils/currency";
import { formatMonth, getCurrentMonth } from "../utils/month";

// Mounted once after sign-in. If any past month is still open, it closes it:
// straight away when there's nothing to decide, or after the user picks which
// unbought items to carry into the new month.
function MonthRollover() {
  const queryClient = useQueryClient();
  const currentMonth = getCurrentMonth();
  // Everything starts selected; this tracks what the user unticks.
  const [unselectedIds, setUnselectedIds] = useState<Set<number>>(new Set());
  const hasAutoClosed = useRef(false);

  const { data: status } = useQuery({
    queryKey: ["rollover", currentMonth.year, currentMonth.month],
    queryFn: () => fetchRolloverStatus(currentMonth),
  });

  const { mutate, isPending, isError } = useMutation({
    mutationFn: (carryOverTodoIds: number[]) => completeRollover(currentMonth, carryOverTodoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rollover"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      queryClient.invalidateQueries({ queryKey: ["months"] });
    },
  });

  const needsClose = (status?.monthsToClose.length ?? 0) > 0;
  const uncheckedItems = status?.uncheckedItems ?? [];
  const needsChoice = needsClose && uncheckedItems.length > 0;

  useEffect(() => {
    // The ref stops a second POST when StrictMode runs effects twice in dev.
    if (needsClose && !needsChoice && !hasAutoClosed.current) {
      hasAutoClosed.current = true;
      mutate([]);
    }
  }, [needsClose, needsChoice, mutate]);

  const selectedIds = uncheckedItems.map((t) => t.id).filter((id) => !unselectedIds.has(id));
  const closingLabel = status?.monthsToClose.map(formatMonth).join(", ");

  function toggle(id: number) {
    setUnselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={needsChoice} maxWidth="sm" fullWidth>
      <DialogTitle>Welcome to {formatMonth(currentMonth)}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ marginBottom: 1 }}>
          {closingLabel} is wrapping up. These items were never checked off — pick the ones
          you still need, and they'll move to {formatMonth(currentMonth)}'s list and budget.
        </Typography>

        <List dense>
          {uncheckedItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton onClick={() => toggle(item.id)}>
                <ListItemIcon>
                  <Checkbox edge="start" checked={!unselectedIds.has(item.id)} tabIndex={-1} />
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={formatMonth({ year: item.budgetYear, month: item.budgetMonth })}
                />
                <Typography variant="body2">{formatCurrency(item.estimatedCost)}</Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {isError && (
          <Alert severity="error" sx={{ marginTop: 1 }}>
            Couldn't start the new month. Please try again.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => mutate([])} disabled={isPending}>
          Leave them all behind
        </Button>
        <Button variant="contained" onClick={() => mutate(selectedIds)} disabled={isPending}>
          Carry over {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MonthRollover;
