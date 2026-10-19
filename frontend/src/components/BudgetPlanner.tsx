import { useEffect, useState } from "react";
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
  CircularProgress,
  Alert,
} from "@mui/material";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
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
  type BudgetGroup,
} from "../utils/budgetSuggestions";
import { formatCurrency, parseCost, roundToCents } from "../utils/currency";
import {
  getCategoryColors,
  getColorAfter,
  REMAINING_COLOR,
} from "../utils/categoryColors";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearPlanEditorRequest, setActiveView } from "../store/uiSlice";
import DonutChart, { LegendDot, type DonutSlice } from "./DonutChart";

const CORE_NAMES = new Set(
  PRESET_CATEGORIES.filter((p) => p.isCore).map((p) => p.name),
);

function normalize(name: string) {
  return name.trim().toLowerCase();
}

// "Custom" covers both the user's own saved categories and new ones typed in.
type PlannerGroup = BudgetGroup | "Custom";
const MAX_NAME_LENGTH = 50;

// Names of picked presets that don't exist yet, in display order.
function toCreateNames(
  rows: { preset: { name: string }; existing?: Category }[],
) {
  return rows.filter((r) => !r.existing).map((r) => r.preset.name);
}

function PlanLegendRow({
  color,
  name,
  value,
  total,
  muted = false,
}: {
  color: string;
  name: string;
  value: number;
  total: number;
  muted?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", paddingX: 1, paddingY: 0.25 }}
    >
      <LegendDot color={color} />
      <Typography
        variant="body2"
        color={muted ? "text.secondary" : undefined}
        sx={{ flex: 1, minWidth: 0 }}
        noWrap
      >
        {name}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatCurrency(value)}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 40, textAlign: "right" }}
      >
        {Math.round((value / total) * 100)}%
      </Typography>
    </Stack>
  );
}

// The % column repeats what Suggested $ shows, so phones drop it to fit.
const HIDE_ON_PHONE = { display: { xs: "none", sm: "table-cell" } };

function BudgetPlanner({ monthlyIncome }: { monthlyIncome: number }) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.ui.theme);
  const planEditorRequest = useAppSelector(
    (state) => state.ui.planEditorRequest,
  );
  // Read once, on the first render: did the shopping list send the user here?
  const [cameFromShoppingList] = useState(planEditorRequest === "shoppingList");
  // Only matters once categories exist; before that the editor always shows.
  const [isEditing, setIsEditing] = useState(planEditorRequest !== null);
  // Presets the user has ticked that don't exist yet. Core ones start ticked
  // for a first-time setup; edits of a saved plan start with none ticked.
  const [pickedNames, setPickedNames] = useState<Set<string>>(() =>
    planEditorRequest !== null &&
    (queryClient.getQueryData<Category[]>(["categories"])?.length ?? 0) > 0
      ? new Set()
      : CORE_NAMES,
  );
  // New categories the user typed in, not saved yet.
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState("");

  // The request has done its job once read; clear it so a later visit to the
  // Budget page opens normally.
  useEffect(() => {
    if (planEditorRequest !== null) dispatch(clearPlanEditorRequest());
  }, [planEditorRequest, dispatch]);
  // Existing categories the user has unticked; they're deleted on Save.
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
  // What the user has typed, by category name. Missing = untouched.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
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
  // through the delete in Budget by Category, which spells out what gets deleted.
  function getLockReason(category: Category): string | null {
    if (category.budget > 0)
      return "Has a budget. Set it to 0 first, or delete it from Budget by Category.";
    if (todos?.some((t) => t.categoryId === category.id) ?? true) {
      return "Has items this month. Delete it from Budget by Category.";
    }
    const spent = spending?.categories.find(
      (c) => c.categoryId === category.id,
    )?.spent;
    if (spent === undefined || spent !== 0) {
      return "Has spending this month. Delete it from Budget by Category.";
    }
    return null;
  }

  const existingByName = new Map<string, Category>(
    (categories ?? []).map((c) => [normalize(c.name), c]),
  );
  const presetKeys = new Set(PRESET_CATEGORIES.map((p) => normalize(p.name)));
  const otherCategories = (categories ?? []).filter(
    (c) => !presetKeys.has(normalize(c.name)),
  );

  function makeRow(
    preset: { name: string; group: PlannerGroup },
    existing: Category | undefined,
  ) {
    const input =
      drafts[preset.name] ??
      (existing && existing.budget > 0 ? String(existing.budget) : "");
    return { preset, existing, input, amount: parseCost(input) };
  }

  // Presets, then the user's own saved categories, then new ones typed in.
  // Draft amounts are keyed by name, which is unique across all three.
  const rows = [
    ...PRESET_CATEGORIES.map((preset) =>
      makeRow(preset, existingByName.get(normalize(preset.name))),
    ),
    ...otherCategories.map((c) =>
      makeRow({ name: c.name, group: "Custom" }, c),
    ),
    ...customNames.map((name) => makeRow({ name, group: "Custom" }, undefined)),
  ];
  const customNameSet = new Set(customNames);
  const selectedRows = rows.filter((r) =>
    r.existing
      ? !removedIds.has(r.existing.id)
      : pickedNames.has(r.preset.name) || customNameSet.has(r.preset.name),
  );
  const toDelete = rows.filter(
    (r) => r.existing && removedIds.has(r.existing.id),
  );
  const percents = getSuggestedPercents(
    new Set(selectedRows.map((r) => r.preset.name)),
  );

  const toCreate = selectedRows.filter((r) => !r.existing);
  const toUpdate = selectedRows.filter(
    (r) => r.existing && r.amount !== null && r.amount !== r.existing.budget,
  );
  const hasInvalid = selectedRows.some((r) => r.amount === null);
  const hasChanges =
    toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0;

  const plannedTotal = roundToCents(
    selectedRows.reduce((sum, r) => sum + (r.amount ?? 0), 0),
  );
  const leftOver = roundToCents(monthlyIncome - plannedTotal);
  const isOverIncome = monthlyIncome > 0 && leftOver < 0;

  // Same colors as the spending chart. Picks that aren't saved yet take the
  // next free slots, which is what they'll get once saved.
  const savedColors = getCategoryColors(
    (categories ?? []).map((c) => c.id),
    mode,
  );
  const newPickColors = new Map(
    toCreateNames(selectedRows).map((name, i) => [
      name,
      getColorAfter((categories?.length ?? 0) + i, mode),
    ]),
  );
  function rowColor(row: (typeof rows)[number]) {
    return row.existing
      ? savedColors.get(row.existing.id)!
      : newPickColors.get(row.preset.name)!;
  }

  // Live: updates as the user ticks categories and types amounts.
  const planSlices: DonutSlice[] = selectedRows.map((r) => ({
    key: r.preset.name,
    name: r.preset.name,
    value: r.amount ?? 0,
    color: rowColor(r),
  }));

  const hasSavedPlan = (categories?.length ?? 0) > 0;

  // Adding to a saved plan: new categories are budgeted from the money not
  // yet assigned, and can't take more than that. (A first-time setup keeps
  // the softer rule: going over income only warns.) Uses the draft amounts,
  // so lowering another category in the table frees up money right away.
  const isAddingToPlan = hasSavedPlan && toCreate.length > 0;
  const existingPlanned = roundToCents(
    selectedRows
      .filter((r) => r.existing)
      .reduce((sum, r) => sum + (r.amount ?? 0), 0),
  );
  const availableForNew = roundToCents(monthlyIncome - existingPlanned);
  const newTotal = roundToCents(
    toCreate.reduce((sum, r) => sum + (r.amount ?? 0), 0),
  );
  const newMissingAmount = toCreate.some((r) => (r.amount ?? 0) <= 0);
  const newOverAvailable = newTotal > availableForNew;
  const blocksNewCategories =
    isAddingToPlan &&
    (monthlyIncome === 0 || newMissingAmount || newOverAvailable);
  // Show the money-left guidance while adding, or as soon as the shopping
  // list sends the user here (before anything is picked).
  const showAddGuidance =
    hasSavedPlan && (toCreate.length > 0 || cameFromShoppingList);

  function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    const name = customDraft.trim().slice(0, MAX_NAME_LENGTH);
    if (!name) return;
    const key = normalize(name);
    setCustomDraft("");

    // Already a category or a preset: select that one instead of a duplicate.
    const match = rows.find((r) => normalize(r.preset.name) === key);
    if (match) {
      if (match.existing) {
        const id = match.existing.id;
        setRemovedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else if (match.preset.group !== "Custom") {
        setPickedNames((prev) => new Set(prev).add(match.preset.name));
      }
      return;
    }
    setCustomNames((prev) => [...prev, name]);
  }

  function removeCustom(name: string) {
    setCustomNames((prev) => prev.filter((n) => n !== name));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  const saveMutation = useMutation({
    // One request per category. allSettled (not all) waits for every request,
    // so a single failure can't hide which others already went through.
    mutationFn: async () => {
      const results = await Promise.allSettled([
        ...toCreate.map((r) => createCategory(r.preset.name, r.amount ?? 0)),
        ...toUpdate.map((r) =>
          updateCategoryBudget(r.existing!.id, r.existing!.name, r.amount ?? 0),
        ),
        ...toDelete.map((r) => deleteCategory(r.existing!.id)),
      ]);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        throw new Error(
          `${failed} of ${results.length} categories couldn't be saved. Please try again.`,
        );
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
      setCustomNames([]);
      setIsEditing(false);
    },
  });

  // Each edit starts from what's saved. Without clearing pickedNames, core
  // presets the user chose not to create would come back ticked.
  function startEditing() {
    setPickedNames(new Set());
    setCustomNames([]);
    setRemovedIds(new Set());
    setDrafts({});
    saveMutation.reset();
    setIsEditing(true);
  }

  // One chip per row. Saved categories toggle removal (unless locked), presets
  // toggle picking, and new custom ones get an X to drop them.
  function renderChip(row: (typeof rows)[number]) {
    const { preset, existing } = row;
    const isNewCustom = !existing && preset.group === "Custom";
    const isSelected = existing
      ? !removedIds.has(existing.id)
      : pickedNames.has(preset.name) || isNewCustom;
    const lockReason = existing ? getLockReason(existing) : null;
    const chip = (
      <Chip
        label={preset.name}
        icon={isSelected ? <CheckIcon /> : undefined}
        color={isSelected ? "primary" : "default"}
        variant={isSelected ? "filled" : "outlined"}
        onClick={
          lockReason || isNewCustom
            ? undefined
            : existing
              ? () => setRemovedIds((prev) => toggleIn(prev, existing.id))
              : () => setPickedNames((prev) => toggleIn(prev, preset.name))
        }
        onDelete={isNewCustom ? () => removeCustom(preset.name) : undefined}
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
  }

  function toggleIn<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  if (hasSavedPlan && !isEditing) {
    const savedTotal = roundToCents(
      (categories ?? []).reduce((sum, c) => sum + c.budget, 0),
    );
    const savedLeft = roundToCents(monthlyIncome - savedTotal);
    const savedSlices: DonutSlice[] = [...(categories ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((c) => ({
        key: c.id,
        name: c.name,
        value: c.budget,
        color: savedColors.get(c.id)!,
      }));
    // Percentages are of income when it's set, so the gray slice is included.
    const chartTotal = savedTotal + Math.max(savedLeft, 0);

    return (
      <Card sx={{ padding: { xs: 2, sm: 3 }, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", marginBottom: 1 }}
        >
          <PlaylistAddCheckIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none", flexGrow: 1 }}>
            Your Plan
          </Typography>
          <IconButton
            size="small"
            onClick={startEditing}
            aria-label="Edit plan"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Stack>
        {cameFromShoppingList && (
          <Alert
            severity="success"
            sx={{ marginBottom: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => dispatch(setActiveView("tasks"))}
              >
                Back to list
              </Button>
            }
          >
            Saved. Your new category is ready to use on the shopping list.
          </Alert>
        )}
        <Typography variant="body1" sx={{ marginBottom: 2 }}>
          <strong>{formatCurrency(savedTotal)}</strong> planned across{" "}
          {categories!.length}{" "}
          {categories!.length === 1 ? "category" : "categories"}
          {monthlyIncome > 0 && <> of {formatCurrency(monthlyIncome)}</>}
        </Typography>

        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <DonutChart
            slices={savedSlices}
            remaining={monthlyIncome > 0 ? Math.max(savedLeft, 0) : 0}
            remainingLabel="Not assigned"
            centerValue={savedTotal}
            centerLabel="planned"
            centerNote={
              monthlyIncome === 0
                ? undefined
                : savedLeft < 0
                  ? `${formatCurrency(-savedLeft)} over income`
                  : `${formatCurrency(savedLeft)} to assign`
            }
            centerNoteColor={savedLeft < 0 ? "error.main" : "text.secondary"}
          />

          {chartTotal > 0 && (
            <Stack spacing={0.5} sx={{ width: "100%" }}>
              {savedSlices
                .filter((slice) => slice.value > 0)
                .map((slice) => (
                  <PlanLegendRow
                    key={slice.key}
                    color={slice.color}
                    name={slice.name}
                    value={slice.value}
                    total={chartTotal}
                  />
                ))}
              {monthlyIncome > 0 && savedLeft > 0 && (
                <PlanLegendRow
                  color={REMAINING_COLOR[mode]}
                  name="Not assigned"
                  value={savedLeft}
                  total={chartTotal}
                  muted
                />
              )}
            </Stack>
          )}

          {savedLeft < 0 && monthlyIncome > 0 && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center", alignSelf: "flex-start" }}
            >
              <WarningAmberIcon color="warning" fontSize="small" />
              <Typography variant="body2">
                {formatCurrency(-savedLeft)} more than your income
              </Typography>
            </Stack>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ padding: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", marginBottom: 1 }}
      >
        <PlaylistAddCheckIcon color="primary" />
        <Typography variant="h2" sx={{ textTransform: "none" }}>
          Plan Your Categories
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ marginBottom: 2 }}
      >
        Pick the categories you spend on. Suggestions follow the 50/30/20 rule
        and rescale so your picks always add up to 100% of your income.
      </Typography>

      {cameFromShoppingList && (
        <Alert
          severity="info"
          sx={{ marginBottom: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => dispatch(setActiveView("tasks"))}
            >
              Back to list
            </Button>
          }
        >
          Pick a category or add your own under "Your own", give it a budget,
          then save.
        </Alert>
      )}

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
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    · about {guideline}% of income
                  </Typography>
                </Typography>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                  {rows.filter((r) => r.preset.group === group).map(renderChip)}
                </Stack>
              </Box>
            ))}

            <Box>
              <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                Your own{" "}
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                >
                  · anything the list above doesn't cover
                </Typography>
              </Typography>
              <Stack
                direction="row"
                sx={{ flexWrap: "wrap", gap: 1, marginBottom: 1 }}
              >
                {rows
                  .filter((r) => r.preset.group === "Custom")
                  .map(renderChip)}
              </Stack>
              <Stack
                component="form"
                onSubmit={handleAddCustom}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", maxWidth: 420 }}
              >
                <TextField
                  size="small"
                  placeholder="e.g. Pets"
                  value={customDraft}
                  onChange={(e) =>
                    setCustomDraft(e.target.value.slice(0, MAX_NAME_LENGTH))
                  }
                  aria-label="New category name"
                  autoFocus={cameFromShoppingList}
                  fullWidth
                />
                <Button
                  type="submit"
                  startIcon={<AddIcon />}
                  disabled={!customDraft.trim()}
                >
                  Add
                </Button>
              </Stack>
            </Box>
          </Stack>

          {showAddGuidance &&
            (monthlyIncome === 0 ? (
              <Alert severity="warning" sx={{ marginBottom: 2 }}>
                Set your monthly income first. New categories are budgeted from
                the money you haven't assigned yet.
              </Alert>
            ) : availableForNew <= 0 ? (
              <Alert severity="warning" sx={{ marginBottom: 2 }}>
                <strong>No money left to assign.</strong> In order to add a
                category, you need to make adjustments first: lower the amount
                of one of your categories in the table below, or increase your
                monthly income.
                {availableForNew < 0 &&
                  ` Your plan is already ${formatCurrency(-availableForNew)} over your income.`}
              </Alert>
            ) : (
              <Alert
                severity={
                  toCreate.length > 0 && newOverAvailable ? "error" : "info"
                }
                sx={{ marginBottom: 2 }}
              >
                You have <strong>{formatCurrency(availableForNew)}</strong> left
                to assign. Give each new category an amount from that money.
                {toCreate.length > 0 &&
                  newOverAvailable &&
                  ` Your new categories add up to ${formatCurrency(newTotal)}, ${formatCurrency(
                    newTotal - availableForNew,
                  )} more than you have left.`}
                {toCreate.length > 0 &&
                  !newOverAvailable &&
                  newMissingAmount &&
                  " Each new category needs an amount above $0."}
              </Alert>
            ))}

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
            <>
              {/* The table below is this chart's legend: each row has its color. */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 2,
                }}
              >
                <DonutChart
                  slices={planSlices}
                  remaining={monthlyIncome > 0 ? Math.max(leftOver, 0) : 0}
                  remainingLabel="Not assigned"
                  centerValue={plannedTotal}
                  centerLabel="planned"
                  centerNote={
                    monthlyIncome === 0
                      ? undefined
                      : isOverIncome
                        ? `${formatCurrency(-leftOver)} over income`
                        : `${formatCurrency(leftOver)} to assign`
                  }
                  centerNoteColor={
                    isOverIncome ? "error.main" : "text.secondary"
                  }
                />
              </Box>
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right" sx={HIDE_ON_PHONE}>
                        Suggested %
                      </TableCell>
                      <TableCell align="right">Suggested $</TableCell>
                      <TableCell align="right">Your amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRows.map((row) => {
                      const { preset, input, amount } = row;
                      // The user's own categories have no 50/30/20 suggestion.
                      const percent = percents.get(preset.name);
                      const suggested =
                        percent === undefined
                          ? undefined
                          : Math.round((percent / 100) * monthlyIncome);
                      // When adding to a saved plan, don't suggest more than is left.
                      const isNew = !row.existing;
                      const placeholderAmount =
                        isNew && hasSavedPlan
                          ? Math.max(
                              Math.min(
                                suggested ?? availableForNew,
                                availableForNew,
                              ),
                              0,
                            )
                          : suggested;
                      return (
                        <TableRow key={preset.name}>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: "center" }}
                            >
                              <LegendDot color={rowColor(row)} />
                              <span>{preset.name}</span>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={HIDE_ON_PHONE}>
                            {percent === undefined
                              ? "—"
                              : `${Math.round(percent)}%`}
                          </TableCell>
                          <TableCell align="right">
                            {monthlyIncome > 0 && suggested !== undefined
                              ? formatCurrency(suggested)
                              : "—"}
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={input}
                              placeholder={
                                monthlyIncome > 0 &&
                                placeholderAmount !== undefined
                                  ? String(placeholderAmount)
                                  : undefined
                              }
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [preset.name]: e.target.value,
                                }))
                              }
                              error={
                                amount === null ||
                                (isNew &&
                                  hasSavedPlan &&
                                  input !== "" &&
                                  (amount ?? 0) <= 0)
                              }
                              aria-label={`${preset.name} amount`}
                              slotProps={{
                                input: {
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      $
                                    </InputAdornment>
                                  ),
                                },
                                htmlInput: { min: 0, step: "0.01" },
                              }}
                              sx={{ width: { xs: 110, sm: 140 } }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
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
              {monthlyIncome > 0 &&
                (isOverIncome ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
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
                <Button
                  onClick={() => setIsEditing(false)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
              )}
              <Button
                variant="contained"
                onClick={() => saveMutation.mutate()}
                disabled={
                  !hasChanges ||
                  hasInvalid ||
                  blocksNewCategories ||
                  saveMutation.isPending
                }
              >
                Save categories
              </Button>
            </Stack>
          </Stack>

          {toDelete.length > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ marginTop: 1 }}
            >
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
