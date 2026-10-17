import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  Stack,
  Typography,
  Chip,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  LinearProgress,
  CircularProgress,
  Alert,
} from "@mui/material";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategoryBudget,
  type Category,
} from "../api/categories";
import { fetchTodos } from "../api/todos";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import {
  BUDGET_GROUPS,
  PRESET_CATEGORIES,
  getSuggestedPercents,
} from "../utils/budgetSuggestions";
import { formatCurrency, parseCost, roundToCents } from "../utils/currency";

const CORE_NAMES = new Set(PRESET_CATEGORIES.filter((p) => p.isCore).map((p) => p.name));

function normalize(name: string) {
  return name.trim().toLowerCase();
}

function BudgetPlanner({ monthlyIncome }: { monthlyIncome: number }) {
  const queryClient = useQueryClient();
  // Only matters once categories exist; before that the editor always shows.
  const [isEditing, setIsEditing] = useState(false);
  // Presets the user has ticked that don't exist yet. Core ones start ticked
  // for a first-time setup; startEditing() clears them for later edits.
  const [pickedNames, setPickedNames] = useState<Set<string>>(CORE_NAMES);
  // Existing categories the user has unticked; they're deleted on Save.
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  // What the user has typed, by category name. Missing = untouched.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Already cached by the task list: this month's items only.
  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  const { data: spending } = useCurrentSpending();

  // An existing category can only be unticked here if removing it loses
  // nothing: no budget set, no items and no logged spending this month. Anything else goes
  // through the sidebar's delete dialog, which spells out what gets deleted.
  function getLockReason(category: Category): string | null {
    if (category.budget > 0) return "Has a budget. Set it to 0 first, or delete it from the sidebar.";
    if (todos?.some((t) => t.categoryId === category.id) ?? true) {
      return "Has items this month. Delete it from the sidebar.";
    }
    const spent = spending?.categories.find((c) => c.categoryId === category.id)?.spent;
    if (spent === undefined || spent !== 0) {
      return "Has spending this month. Delete it from the sidebar.";
    }
    return null;
  }

  const existingByName = new Map<string, Category>(
    (categories ?? []).map((c) => [normalize(c.name), c]),
  );
  const presetKeys = new Set(PRESET_CATEGORIES.map((p) => normalize(p.name)));
  const otherCategories = (categories ?? []).filter((c) => !presetKeys.has(normalize(c.name)));
  const otherBudgetTotal = otherCategories.reduce((sum, c) => sum + c.budget, 0);

  const rows = PRESET_CATEGORIES.map((preset) => {
    const existing = existingByName.get(normalize(preset.name));
    const input = drafts[preset.name] ?? (existing && existing.budget > 0 ? String(existing.budget) : "");
    return { preset, existing, input, amount: parseCost(input) };
  });
  const selectedRows = rows.filter((r) =>
    r.existing ? !removedIds.has(r.existing.id) : pickedNames.has(r.preset.name),
  );
  const toDelete = rows.filter((r) => r.existing && removedIds.has(r.existing.id));
  const percents = getSuggestedPercents(new Set(selectedRows.map((r) => r.preset.name)));

  const toCreate = selectedRows.filter((r) => !r.existing);
  const toUpdate = selectedRows.filter(
    (r) => r.existing && r.amount !== null && r.amount !== r.existing.budget,
  );
  const hasInvalid = selectedRows.some((r) => r.amount === null);
  const hasChanges = toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0;

  const plannedTotal = roundToCents(
    selectedRows.reduce((sum, r) => sum + (r.amount ?? 0), 0) + otherBudgetTotal,
  );
  const leftOver = roundToCents(monthlyIncome - plannedTotal);
  const isOverIncome = monthlyIncome > 0 && leftOver < 0;

  const saveMutation = useMutation({
    // One request per category. allSettled (not all) waits for every request,
    // so a single failure can't hide which others already went through.
    mutationFn: async () => {
      const results = await Promise.allSettled([
        ...toCreate.map((r) => createCategory(r.preset.name, r.amount ?? 0)),
        ...toUpdate.map((r) => updateCategoryBudget(r.existing!.id, r.existing!.name, r.amount ?? 0)),
        ...toDelete.map((r) => deleteCategory(r.existing!.id)),
      ]);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        throw new Error(`${failed} of ${results.length} categories couldn't be saved. Please try again.`);
      }
    },
    // onSettled, not onSuccess: after a partial failure the saved ones still
    // need to show up, and the drafts for them are no longer needed.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      setDrafts({});
      setRemovedIds(new Set());
    },
    onSuccess: () => {
      // Everything picked now exists, so nothing is left "to create".
      setPickedNames(new Set());
      setIsEditing(false);
    },
  });

  // Each edit starts from what's saved. Without clearing pickedNames, core
  // presets the user chose not to create would come back ticked.
  function startEditing() {
    setPickedNames(new Set());
    setRemovedIds(new Set());
    setDrafts({});
    saveMutation.reset();
    setIsEditing(true);
  }

  const hasSavedPlan = (categories?.length ?? 0) > 0;

  function toggleIn<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  if (hasSavedPlan && !isEditing) {
    const savedTotal = roundToCents((categories ?? []).reduce((sum, c) => sum + c.budget, 0));
    const savedLeft = roundToCents(monthlyIncome - savedTotal);
    const percentPlanned = monthlyIncome > 0 ? (savedTotal / monthlyIncome) * 100 : 0;

    return (
      <Card sx={{ padding: 3, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 1 }}>
          <PlaylistAddCheckIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none", flexGrow: 1 }}>
            Your Plan
          </Typography>
          <IconButton size="small" onClick={startEditing} aria-label="Edit plan">
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Typography variant="body1" sx={{ marginBottom: 1 }}>
          <strong>{formatCurrency(savedTotal)}</strong> planned across {categories!.length}{" "}
          {categories!.length === 1 ? "category" : "categories"}
          {monthlyIncome > 0 && <> of {formatCurrency(monthlyIncome)}</>}
        </Typography>
        {monthlyIncome > 0 && (
          <>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentPlanned, 100)}
              color={savedLeft < 0 ? "warning" : "primary"}
            />
            {savedLeft < 0 ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", marginTop: 0.5 }}>
                <WarningAmberIcon color="warning" fontSize="small" />
                <Typography variant="body2">
                  {formatCurrency(-savedLeft)} more than your income
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ marginTop: 0.5 }}>
                {formatCurrency(savedLeft)} left to assign
              </Typography>
            )}
          </>
        )}
      </Card>
    );
  }

  return (
    <Card sx={{ padding: 3, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginBottom: 1 }}>
        <PlaylistAddCheckIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none" }}>
          Plan Your Categories
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>
        Pick the categories you spend on. Suggestions follow the 50/30/20 rule and rescale so
        your picks always add up to 100% of your income.
      </Typography>

      {isLoading ? (
        <CircularProgress size={24} />
      ) : isError ? (
        <Alert severity="error">Couldn't load your categories.</Alert>
      ) : (
        <>
          <Stack spacing={2} sx={{ marginBottom: 3 }}>
            {BUDGET_GROUPS.map(({ group, guideline }) => (
              <Box key={group}>
                <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                  {group}{" "}
                  <Typography component="span" variant="body2" color="text.secondary">
                    · about {guideline}% of income
                  </Typography>
                </Typography>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                  {rows
                    .filter((r) => r.preset.group === group)
                    .map(({ preset, existing }) => {
                      const isSelected = existing
                        ? !removedIds.has(existing.id)
                        : pickedNames.has(preset.name);
                      const lockReason = existing ? getLockReason(existing) : null;
                      const chip = (
                        <Chip
                          label={preset.name}
                          icon={isSelected ? <CheckIcon /> : undefined}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          onClick={
                            lockReason
                              ? undefined
                              : existing
                                ? () => setRemovedIds((prev) => toggleIn(prev, existing.id))
                                : () => setPickedNames((prev) => toggleIn(prev, preset.name))
                          }
                          aria-pressed={isSelected}
                        />
                      );
                      return lockReason ? (
                        <Tooltip key={preset.name} title={lockReason}>
                          {chip}
                        </Tooltip>
                      ) : (
                        <Box key={preset.name}>{chip}</Box>
                      );
                    })}
                </Stack>
              </Box>
            ))}
          </Stack>

          {monthlyIncome === 0 && (
            <Alert severity="info" sx={{ marginBottom: 2 }}>
              Set your monthly income above to see suggested dollar amounts.
            </Alert>
          )}

          {selectedRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Pick at least one category to plan its budget.
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Suggested %</TableCell>
                    <TableCell align="right">Suggested $</TableCell>
                    <TableCell align="right">Your amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedRows.map(({ preset, input, amount }) => {
                    const percent = percents.get(preset.name) ?? 0;
                    const suggested = Math.round((percent / 100) * monthlyIncome);
                    return (
                      <TableRow key={preset.name}>
                        <TableCell>{preset.name}</TableCell>
                        <TableCell align="right">{Math.round(percent)}%</TableCell>
                        <TableCell align="right">
                          {monthlyIncome > 0 ? formatCurrency(suggested) : "—"}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={input}
                            placeholder={monthlyIncome > 0 ? String(suggested) : undefined}
                            onChange={(e) =>
                              setDrafts((prev) => ({ ...prev, [preset.name]: e.target.value }))
                            }
                            error={amount === null}
                            aria-label={`${preset.name} amount`}
                            slotProps={{
                              input: {
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                              },
                              htmlInput: { min: 0, step: "0.01" },
                            }}
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
              marginTop: 2,
              paddingTop: 2,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Box>
              <Typography variant="body1">
                <strong>{formatCurrency(plannedTotal)}</strong> planned
                {monthlyIncome > 0 && <> of {formatCurrency(monthlyIncome)}</>}
              </Typography>
              {otherCategories.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Includes {formatCurrency(otherBudgetTotal)} from your other categories
                </Typography>
              )}
              {monthlyIncome > 0 &&
                (isOverIncome ? (
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <WarningAmberIcon color="warning" fontSize="small" />
                    <Typography variant="body2">
                      {formatCurrency(-leftOver)} more than your income
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(leftOver)} left to assign
                  </Typography>
                ))}
            </Box>
            <Stack direction="row" spacing={1}>
              {hasSavedPlan && (
                <Button onClick={() => setIsEditing(false)} disabled={saveMutation.isPending}>
                  Cancel
                </Button>
              )}
              <Button
                variant="contained"
                onClick={() => saveMutation.mutate()}
                disabled={!hasChanges || hasInvalid || saveMutation.isPending}
              >
                Save categories
              </Button>
            </Stack>
          </Stack>

          {toDelete.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
              Saving removes {toDelete.map((r) => r.existing!.name).join(", ")}.
            </Typography>
          )}

          {saveMutation.isError && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {saveMutation.error.message}
            </Alert>
          )}
        </>
      )}
    </Card>
  );
}

export default BudgetPlanner;
