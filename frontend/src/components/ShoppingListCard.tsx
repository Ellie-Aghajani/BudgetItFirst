import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { fetchTodos, type Todo } from "../api/todos";
import { fetchCategories } from "../api/categories";
import { useTodoActions } from "../hooks/useTodoActions";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setActiveView } from "../store/uiSlice";
import { formatCurrency, parseCost, roundToCents } from "../utils/currency";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { getCategoryColors } from "../utils/categoryColors";
import { LegendDot } from "./DonutChart";
import OverBudgetDialog from "./OverBudgetDialog";

function ShoppingListRow({ todo }: { todo: Todo }) {
  const { toggle, remove, saveEdit, isSaving, saveError, dialogProps } =
    useTodoActions(todo);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftCost, setDraftCost] = useState(String(todo.estimatedCost));
  const parsedCost = parseCost(draftCost);

  function startEditing() {
    setDraftTitle(todo.title);
    setDraftCost(String(todo.estimatedCost));
    setIsEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedCost === null || !draftTitle.trim()) return;
    saveEdit(draftTitle, parsedCost, () => setIsEditing(false));
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: isEditing ? "flex-start" : "center" }}
      >
        <Checkbox
          checked={todo.isComplete}
          onChange={toggle}
          size="small"
          slotProps={{
            input: { "aria-label": `Mark ${todo.title} as bought` },
          }}
        />

        {isEditing ? (
          <Stack
            component="form"
            onSubmit={handleSubmit}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ flex: 1, minWidth: 0, paddingY: 0.5 }}
          >
            <TextField
              size="small"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              error={!draftTitle.trim()}
              autoFocus
              fullWidth
              aria-label="Item name"
            />
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center", flexShrink: 0 }}
            >
              <TextField
                size="small"
                type="number"
                value={draftCost}
                onChange={(e) => setDraftCost(e.target.value)}
                error={parsedCost === null}
                aria-label="Estimated cost"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  },
                  htmlInput: { min: 0, step: "0.01" },
                }}
                sx={{ width: { xs: "100%", sm: 120 } }}
              />
              {/* Distinct keys: see CategoryBudgetTable for why the Edit and
                  Save buttons must not share a DOM node. */}
              <IconButton
                key="save"
                type="submit"
                size="small"
                disabled={parsedCost === null || !draftTitle.trim() || isSaving}
                aria-label="Save item"
              >
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton
                key="cancel"
                size="small"
                onClick={() => setIsEditing(false)}
                aria-label="Cancel edit"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        ) : (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                noWrap
                sx={{
                  fontWeight: 600,
                  textDecoration: todo.isComplete ? "line-through" : "none",
                  color: todo.isComplete ? "text.secondary" : "text.primary",
                }}
              >
                {todo.title}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: todo.isComplete ? "text.secondary" : "text.primary",
              }}
            >
              {todo.estimatedCost > 0
                ? formatCurrency(todo.estimatedCost)
                : "—"}
            </Typography>
            <IconButton
              key="edit"
              size="small"
              onClick={startEditing}
              aria-label={`Edit ${todo.title}`}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={remove}
              aria-label={`Delete ${todo.title}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Stack>

      {isEditing && saveError && (
        <Alert severity="error" sx={{ marginTop: 1 }}>
          {saveError.message}
        </Alert>
      )}
      <OverBudgetDialog {...dialogProps} />
    </Box>
  );
}

interface CategoryGroup {
  categoryId: number;
  name: string;
  color: string;
  items: Todo[];
  budget: number;
  spent: number;
  toBuy: number;
  // Budget minus what's actually spent. The same number as the pie chart and
  // Budget vs Spent; list estimates are shown next to it, not subtracted.
  left: number;
}

function CategoryHeader({ group }: { group: CategoryGroup }) {
  const isOver = group.left < 0;
  // Still within budget, but the rest of the list costs more than what's left.
  const listWontFit = !isOver && group.toBuy > group.left;
  return (
    <Box sx={{ paddingTop: 1.5, paddingBottom: 0.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <LegendDot color={group.color} />
        <Typography variant="subtitle2" sx={{ flex: 1, minWidth: 0 }} noWrap>
          {group.name}
        </Typography>
        {group.budget > 0 ? (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: "center",
              color: isOver ? "error.main" : "text.primary",
            }}
          >
            {isOver && <WarningAmberIcon sx={{ fontSize: 16 }} />}
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isOver
                ? `${formatCurrency(-group.left)} over budget`
                : `${formatCurrency(group.left)} left`}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No budget set
          </Typography>
        )}
      </Stack>
      {/* The working, so the "left" number can be checked at a glance. */}
      {group.budget > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ paddingLeft: 2.25 }}
        >
          {formatCurrency(group.budget)} budget − {formatCurrency(group.spent)}{" "}
          spent
          {group.toBuy > 0 && (
            <> · {formatCurrency(group.toBuy)} still to buy</>
          )}
        </Typography>
      )}
      {group.budget > 0 && listWontFit && (
        <Typography
          variant="caption"
          component="div"
          sx={{ paddingLeft: 2.25, color: "warning.dark", fontWeight: 600 }}
        >
          Buying the rest would go {formatCurrency(group.toBuy - group.left)}{" "}
          over
        </Typography>
      )}
    </Box>
  );
}

// This month's shopping list on the Dashboard, grouped by category with each
// category's budget: check off, edit or delete without leaving the page.
function ShoppingListCard() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.ui.theme);
  const {
    data: todos,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: spending } = useCurrentSpending();

  const colors = getCategoryColors(categories?.map((c) => c.id) ?? [], mode);
  const spendingById = new Map(
    spending?.categories.map((c) => [c.categoryId, c]),
  );
  const allItems = todos ?? [];

  // Still to buy first, then bought; oldest first within each, like a list on paper.
  const byListOrder = (a: Todo, b: Todo) =>
    Number(a.isComplete) - Number(b.isComplete) ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  // Same category order as the charts (by id), skipping categories with no items.
  const groups: CategoryGroup[] = [...(categories ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((category) => {
      const items = allItems
        .filter((t) => t.categoryId === category.id)
        .sort(byListOrder);
      const budget = spendingById.get(category.id)?.budget ?? category.budget;
      const spent = spendingById.get(category.id)?.spent ?? 0;
      // Bought items aren't counted: once paid, the real amount is logged as
      // spending, so counting the estimate too would subtract it twice.
      const toBuy = items
        .filter((t) => !t.isComplete)
        .reduce((sum, t) => sum + t.estimatedCost, 0);
      return {
        categoryId: category.id,
        name: category.name,
        color: colors.get(category.id)!,
        items,
        budget,
        spent,
        toBuy,
        left: roundToCents(budget - spent),
      };
    })
    .filter((group) => group.items.length > 0);

  const boughtCount = allItems.filter((t) => t.isComplete).length;
  const toBuyTotal = groups.reduce((sum, g) => sum + g.toBuy, 0);

  return (
    <Card sx={{ padding: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", marginBottom: 0.5 }}
      >
        <ShoppingCartIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none", flex: 1 }}>
          Shopping List
        </Typography>
        <Button size="small" onClick={() => dispatch(setActiveView("tasks"))}>
          Open list
        </Button>
      </Stack>

      {allItems.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {boughtCount} of {allItems.length} bought ·{" "}
          {formatCurrency(toBuyTotal)} estimated still to buy
        </Typography>
      )}

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      ) : isError ? (
        <Alert severity="error">Couldn't load your shopping list.</Alert>
      ) : groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Your shopping list is empty. Add items from the Shopping List page.
        </Typography>
      ) : (
        // Scrolls inside the card, so a long list doesn't push Recent Spending
        // far down the page.
        <Box
          sx={{ maxHeight: 420, overflowY: "auto", marginX: -1, paddingX: 1 }}
        >
          {groups.map((group, groupIndex) => (
            <Box key={group.categoryId}>
              {groupIndex > 0 && <Divider sx={{ marginTop: 1 }} />}
              <CategoryHeader group={group} />
              {group.items.map((todo) => (
                <ShoppingListRow key={todo.id} todo={todo} />
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}

export default ShoppingListCard;
