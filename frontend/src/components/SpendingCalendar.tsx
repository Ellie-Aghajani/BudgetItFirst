import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { fetchExpensesForMonth, type Expense } from "../api/expenses";
import { fetchCategories } from "../api/categories";
import { useAppSelector } from "../store/hooks";
import { formatCurrency, roundToCents } from "../utils/currency";
import { getCategoryColors } from "../utils/categoryColors";
import { addDays, isSameDay, startOfWeek, toISODate } from "../utils/dates";
import { formatMonth, getCurrentMonth } from "../utils/month";
import type { SavedMessage } from "../utils/spendingMessages";
import Header from "./Header";
import AddSpendingDialog from "./AddSpendingDialog";
import EditSpendingDialog from "./EditSpendingDialog";
import { LegendDot } from "./DonutChart";

type CalendarView = "month" | "week";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatWholeDollars(amount: number): string {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Month view shows a couple of entries per day; the rest are one tap away.
const ENTRIES_PER_MONTH_CELL = 2;

// The days on screen: the whole month padded out to full weeks, or one week.
function getVisibleDays(view: CalendarView, anchor: Date): Date[] {
  if (view === "week") {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const count = Math.round(
    (addDays(startOfWeek(last), 7).getTime() - start.getTime()) / 86_400_000,
  );
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// New spending can only go on days of the current month up to today: later
// days haven't happened, and earlier months are already closed into reports.
function canAddOn(day: Date, today: Date): boolean {
  const current = getCurrentMonth();
  return (
    day.getFullYear() === current.year &&
    day.getMonth() + 1 === current.month &&
    day <= today
  );
}

interface DayInfo {
  date: Date;
  iso: string;
  expenses: Expense[];
  total: number;
  isToday: boolean;
  isOutside: boolean; // a padding day from the month before or after
  canAdd: boolean;
}

function DayCell({
  day,
  view,
  categoryName,
  categoryColor,
  onOpen,
  onAdd,
}: {
  day: DayInfo;
  view: CalendarView;
  categoryName: (id: number) => string;
  categoryColor: (id: number) => string;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const isWeek = view === "week";
  const shown = isWeek
    ? day.expenses
    : day.expenses.slice(0, ENTRIES_PER_MONTH_CELL);
  const hiddenCount = day.expenses.length - shown.length;
  const label = day.date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Box
      sx={(t) => ({
        position: "relative",
        minHeight: isWeek ? { xs: 0, md: 220 } : { xs: 56, sm: 104 },
        padding: { xs: 0.5, sm: 1 },
        borderRadius: 1,
        border: `1px solid ${t.palette.divider}`,
        backgroundColor: day.isToday
          ? alpha(t.palette.primary.main, 0.08)
          : "background.paper",
        opacity: day.isOutside ? 0.45 : 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      })}
    >
      {/* The whole cell opens the day; the + sits above it as its own button. */}
      <ButtonBase
        onClick={onOpen}
        aria-label={`${label}: ${day.total > 0 ? formatCurrency(day.total) : "no spending"}`}
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: 1,
          "&:hover": { backgroundColor: "action.hover" },
        }}
      />

      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 28,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: day.isToday ? 700 : 500,
            color: day.isToday ? "primary.main" : "text.primary",
          }}
        >
          {/* Week view on a phone is a list, so it names the weekday. */}
          {isWeek && (
            <Box component="span" sx={{ display: { md: "none" } }}>
              {WEEKDAYS[day.date.getDay()]}{" "}
            </Box>
          )}
          {day.date.getDate()}
        </Typography>
        {day.canAdd && (
          <Tooltip title="Add spending">
            <IconButton
              size="small"
              onClick={onAdd}
              aria-label={`Add spending on ${label}`}
              sx={{
                position: "relative", // above the cell's button
                padding: 0.25,
                // Month view on a phone is too small for it: tap the day instead.
                display: isWeek
                  ? "inline-flex"
                  : { xs: "none", sm: "inline-flex" },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {day.total > 0 && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "0.7rem", sm: "0.875rem" },
            lineHeight: 1.3,
          }}
          noWrap
        >
          {/* Phone month cells are ~45px wide: whole dollars fit, cents don't. */}
          {isWeek ? (
            formatCurrency(day.total)
          ) : (
            <>
              <Box
                component="span"
                sx={{ display: { xs: "inline", sm: "none" } }}
              >
                {formatWholeDollars(day.total)}
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                {formatCurrency(day.total)}
              </Box>
            </>
          )}
        </Typography>
      )}

      {/* Entries: hidden in month view on phones, where only the total fits. */}
      <Stack
        spacing={0.25}
        sx={{
          marginTop: 0.5,
          minWidth: 0,
          display: isWeek ? "flex" : { xs: "none", sm: "flex" },
        }}
      >
        {shown.map((expense) => (
          <Stack
            key={expense.id}
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", minWidth: 0 }}
          >
            <LegendDot color={categoryColor(expense.categoryId)} />
            <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap>
              {expense.note || categoryName(expense.categoryId)}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {formatCurrency(expense.amount)}
            </Typography>
          </Stack>
        ))}
        {hiddenCount > 0 && (
          <Typography variant="caption" color="primary">
            +{hiddenCount} more
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function DayDialog({
  day,
  categoryName,
  categoryColor,
  onAdd,
  onEdit,
  onClose,
}: {
  day: DayInfo;
  categoryName: (id: number) => string;
  categoryColor: (id: number) => string;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onClose: () => void;
}) {
  // Only the current month can change; past months are frozen in reports.
  const isEditable = day.canAdd;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {day.date.toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </DialogTitle>
      <DialogContent>
        {day.expenses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No spending on this day.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {day.expenses.map((expense, i) => (
              <Box key={expense.id}>
                {i > 0 && <Divider sx={{ marginBottom: 1 }} />}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <LegendDot color={categoryColor(expense.categoryId)} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {categoryName(expense.categoryId)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      component="div"
                    >
                      {expense.isAdjustment
                        ? "Adjusted on Budget page"
                        : (expense.note ?? "—")}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(expense.amount)}
                  </Typography>
                  {isEditable && !expense.isAdjustment && (
                    <IconButton
                      size="small"
                      onClick={() => onEdit(expense)}
                      aria-label="Edit spending"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              </Box>
            ))}
            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Total
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatCurrency(day.total)}
              </Typography>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {day.canAdd && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
            Add spending
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function SpendingCalendar() {
  const mode = useAppSelector((state) => state.ui.theme);
  const [view, setView] = useState<CalendarView>("month");
  // Any day inside the period on screen; the arrows move it.
  const [anchor, setAnchor] = useState(() => new Date());
  const [openDayIso, setOpenDayIso] = useState<string | null>(null);
  const [addOnIso, setAddOnIso] = useState<string | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [savedMessage, setSavedMessage] = useState<SavedMessage | null>(null);

  const today = new Date();
  const days = getVisibleDays(view, anchor);

  // One request per month on screen (a week or the padding days can reach
  // into a second month). Keyed by month, so revisiting a month is instant,
  // and invalidating ["expenses"] after a change refreshes all of them.
  const months = [
    ...new Map(
      days.map((d) => [
        `${d.getFullYear()}-${d.getMonth() + 1}`,
        { year: d.getFullYear(), month: d.getMonth() + 1 },
      ]),
    ).values(),
  ];
  const results = useQueries({
    queries: months.map((m) => ({
      queryKey: ["expenses", m.year, m.month],
      queryFn: () => fetchExpensesForMonth(m),
    })),
  });
  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const colors = getCategoryColors(categories?.map((c) => c.id) ?? [], mode);
  const names = new Map(categories?.map((c) => [c.id, c.name]));
  // Past months can hold archived categories, which the list no longer has.
  const categoryName = (id: number) => names.get(id) ?? "Archived category";
  const categoryColor = (id: number) => colors.get(id) ?? "#94A3B8";

  const byDay = new Map<string, Expense[]>();
  for (const result of results) {
    for (const expense of result.data ?? []) {
      byDay.set(expense.spentOn, [
        ...(byDay.get(expense.spentOn) ?? []),
        expense,
      ]);
    }
  }

  const dayInfos: DayInfo[] = days.map((date) => {
    const iso = toISODate(date);
    const expenses = byDay.get(iso) ?? [];
    return {
      date,
      iso,
      expenses,
      total: roundToCents(expenses.reduce((sum, e) => sum + e.amount, 0)),
      isToday: isSameDay(date, today),
      isOutside: view === "month" && date.getMonth() !== anchor.getMonth(),
      canAdd: canAddOn(date, today),
    };
  });
  const periodTotal = roundToCents(
    dayInfos.filter((d) => !d.isOutside).reduce((sum, d) => sum + d.total, 0),
  );
  const openDay = dayInfos.find((d) => d.iso === openDayIso) ?? null;

  function move(step: number) {
    setAnchor((prev) =>
      view === "week"
        ? addDays(prev, step * 7)
        : new Date(prev.getFullYear(), prev.getMonth() + step, 1),
    );
  }

  const weekStart = days[0];
  const weekEnd = days[days.length - 1];
  const title =
    view === "month"
      ? formatMonth({
          year: anchor.getFullYear(),
          month: anchor.getMonth() + 1,
        })
      : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(
          undefined,
          { month: "short", day: "numeric", year: "numeric" },
        )}`;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        minWidth: 0,
      }}
    >
      <Header />

      <Card sx={{ padding: { xs: 2, sm: 3 }, minWidth: 0 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CalendarMonthIcon color="primary" />
            <Typography variant="h2" sx={{ textTransform: "none" }}>
              Spending Calendar
            </Typography>
          </Stack>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_e, value: CalendarView | null) =>
              value && setView(value)
            }
            aria-label="Calendar view"
          >
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            marginBottom: 2,
            flexWrap: "wrap",
            rowGap: 1,
          }}
        >
          <IconButton
            onClick={() => move(-1)}
            aria-label={view === "week" ? "Previous week" : "Previous month"}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, minWidth: { sm: 190 }, textAlign: "center" }}
          >
            {title}
          </Typography>
          <IconButton
            onClick={() => move(1)}
            aria-label={view === "week" ? "Next week" : "Next month"}
          >
            <ChevronRightIcon />
          </IconButton>
          <Button size="small" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginLeft: "auto !important" }}
          >
            {view === "week" ? "This week" : "This month"}:{" "}
            <strong>{formatCurrency(periodTotal)}</strong>
          </Typography>
        </Stack>

        {isError && (
          <Alert severity="error" sx={{ marginBottom: 2 }}>
            Couldn't load your spending.
          </Alert>
        )}

        {/* Weekday names: always for the month grid; for the week only when
            it's 7 columns (on phones each day names itself). */}
        <Box
          sx={{
            display: view === "week" ? { xs: "none", md: "grid" } : "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: { xs: 0.5, sm: 1 },
            marginBottom: 0.5,
          }}
        >
          {WEEKDAYS.map((d) => (
            <Typography
              key={d}
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: "center", fontWeight: 600 }}
            >
              {d}
            </Typography>
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              view === "week"
                ? { xs: "1fr", md: "repeat(7, minmax(0, 1fr))" }
                : "repeat(7, minmax(0, 1fr))",
            gap: { xs: 0.5, sm: 1 },
            opacity: isLoading ? 0.6 : 1,
            transition: "opacity 150ms",
          }}
        >
          {dayInfos.map((day) => (
            <DayCell
              key={day.iso}
              day={day}
              view={view}
              categoryName={categoryName}
              categoryColor={categoryColor}
              onOpen={() => setOpenDayIso(day.iso)}
              onAdd={() => setAddOnIso(day.iso)}
            />
          ))}
        </Box>
      </Card>

      {openDay && (
        <DayDialog
          day={openDay}
          categoryName={categoryName}
          categoryColor={categoryColor}
          onAdd={() => {
            setAddOnIso(openDay.iso);
            setOpenDayIso(null);
          }}
          onEdit={(expense) => setExpenseToEdit(expense)}
          onClose={() => setOpenDayIso(null)}
        />
      )}

      {addOnIso && (
        <AddSpendingDialog
          key={addOnIso}
          date={addOnIso}
          onClose={() => setAddOnIso(null)}
          onSaved={setSavedMessage}
        />
      )}

      {expenseToEdit && (
        <EditSpendingDialog
          key={expenseToEdit.id}
          expense={expenseToEdit}
          onClose={() => setExpenseToEdit(null)}
        />
      )}

      <Snackbar
        open={savedMessage !== null}
        autoHideDuration={savedMessage?.severity === "warning" ? 8000 : 3000}
        onClose={() => setSavedMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={savedMessage?.severity ?? "success"}
          onClose={() => setSavedMessage(null)}
        >
          {savedMessage?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SpendingCalendar;
