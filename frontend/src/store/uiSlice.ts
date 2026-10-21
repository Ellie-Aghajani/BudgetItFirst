import { createSlice, nanoid } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type Filter = "all" | "active" | "completed";
export type Theme = "light" | "dark";
export type View = "dashboard" | "tasks" | "budget" | "reports" | "calendar";

const AFFIRMATION_KEY = "todo-app-affirmation";
const THEME_KEY = "budget-theme";

// Dark from 7pm to 7am. Used until the user picks a mode themselves.
export function themeForHour(hour: number): Theme {
  return hour >= 19 || hour < 7 ? "dark" : "light";
}

// A mode the user picked with the toggle, if any. null = follow the clock.
function loadChosenTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function loadAffirmation(): string {
  return localStorage.getItem(AFFIRMATION_KEY) ?? "Progress, not perfection.";
}

// Checked-off items the user hasn't logged as spending yet (they chose
// "Not now", let the prompt time out, or cancelled the form). Kept in
// localStorage so a reload doesn't forget them. Ids of items that no longer
// exist are harmless: they're only ever matched against the current list.
const UNLOGGED_KEY = "budget-unlogged-items";

function loadUnlogged(): number[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(UNLOGGED_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "number")
      : [];
  } catch {
    return [];
  }
}

function saveUnlogged(ids: number[]) {
  try {
    localStorage.setItem(UNLOGGED_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked (private window): the list just won't survive a reload.
  }
}

// Bought items from one category, to be logged as one spending entry.
// Only the item ids are stored: names and the estimate total are read from
// the live shopping list every render (see useDraftDetails), so unchecking,
// editing or deleting an item always updates the numbers.
export interface SpendingDraft {
  id: string;
  todoIds: number[];
  categoryId: number;
}

interface UiState {
  filter: Filter;
  theme: Theme;
  // "user" once the toggle is used; until then the mode follows the time of day.
  themeSource: "clock" | "user";
  affirmation: string;
  selectedCategoryId: number | null;
  isSidebarOpen: boolean;
  activeView: View;
  // A category picked on the chart, highlighted in the Budget vs Spent table.
  highlightedCategoryId: number | null;
  // Set when another screen asks the Budget page to open the plan editor
  // (the shopping list's "+ Add category"). The planner clears it once read.
  planEditorRequest: "shoppingList" | null;
  // Asked "add this to spending?" after an item was checked off.
  spendPrompt: SpendingDraft | null;
  unloggedTodoIds: number[];
  // The user said yes: Add Spending shows these details until saved or cancelled.
  spendingDraft: SpendingDraft | null;
  // Bumped by "Clear all data". App keys the screens with it, so every
  // screen remounts and starts fresh, like for a brand-new user.
  dataResetCount: number;
  // A message for the landing page after the user is signed out.
  authNotice: "accountDeleted" | null;
}

const initialState: UiState = {
  filter: "all",
  theme: loadChosenTheme() ?? themeForHour(new Date().getHours()),
  themeSource: loadChosenTheme() ? "user" : "clock",
  affirmation: loadAffirmation(),
  selectedCategoryId: null,
  isSidebarOpen: false,
  activeView: "dashboard",
  highlightedCategoryId: null,
  planEditorRequest: null,
  spendPrompt: null,
  spendingDraft: null,
  dataResetCount: 0,
  authNotice: null,
  unloggedTodoIds: loadUnlogged(),
};

// Puts items back on the "bought but not logged" list.
function markUnlogged(state: UiState, ids: number[]) {
  state.unloggedTodoIds = [...new Set([...state.unloggedTodoIds, ...ids])];
  saveUnlogged(state.unloggedTodoIds);
}

function unmarkUnlogged(state: UiState, ids: number[]) {
  state.unloggedTodoIds = state.unloggedTodoIds.filter(
    (id) => !ids.includes(id),
  );
  saveUnlogged(state.unloggedTodoIds);
}

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Filter>) => {
      state.filter = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
      // A deliberate choice: remember it and stop following the clock.
      state.themeSource = "user";
      try {
        localStorage.setItem(THEME_KEY, state.theme);
      } catch {
        // Storage blocked: the choice lasts until the page reloads.
      }
    },
    // Called every minute by App. Only moves the mode while the user hasn't
    // picked one, so it never fights the toggle.
    syncThemeWithClock: (state, action: PayloadAction<number>) => {
      if (state.themeSource === "clock")
        state.theme = themeForHour(action.payload);
    },
    setAffirmation: (state, action: PayloadAction<string>) => {
      state.affirmation = action.payload;
      localStorage.setItem(AFFIRMATION_KEY, action.payload);
    },
    setSelectedCategoryId: (state, action: PayloadAction<number | null>) => {
      state.selectedCategoryId = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    closeSidebar: (state) => {
      state.isSidebarOpen = false;
    },
    setActiveView: (state, action: PayloadAction<View>) => {
      state.activeView = action.payload;
      // A highlight belongs to the screen it was made on.
      state.highlightedCategoryId = null;
    },
    setHighlightedCategoryId: (state, action: PayloadAction<number | null>) => {
      state.highlightedCategoryId = action.payload;
    },
    openPlanEditor: (state) => {
      state.activeView = "budget";
      state.highlightedCategoryId = null;
      state.planEditorRequest = "shoppingList";
    },
    clearPlanEditorRequest: (state) => {
      state.planEditorRequest = null;
    },
    // Asked when an item is checked off. If other items in the same category
    // were bought earlier but never logged, they're bundled in, so the user
    // can enter one total for the trip instead of item by item.
    promptSpending: {
      reducer: (
        state,
        action: PayloadAction<{
          id: string;
          categoryId: number;
          itemId: number;
          // The category's other checked-off items, from the current list.
          otherBoughtIds: number[];
        }>,
      ) => {
        const { id, categoryId, itemId, otherBoughtIds } = action.payload;
        const pending = otherBoughtIds.filter((b) =>
          state.unloggedTodoIds.includes(b),
        );
        const ids = [...pending, itemId];
        unmarkUnlogged(state, ids);

        // Already filling in Add Spending for this category: add the item to
        // that entry instead of asking again.
        if (state.spendingDraft?.categoryId === categoryId) {
          state.spendingDraft.todoIds = [
            ...new Set([...state.spendingDraft.todoIds, ...ids]),
          ];
          return;
        }

        // A question nobody answered yet counts as "not now"; if it's the same
        // category, its items join this one.
        if (state.spendPrompt) {
          if (state.spendPrompt.categoryId === categoryId) {
            ids.unshift(
              ...state.spendPrompt.todoIds.filter((t) => !ids.includes(t)),
            );
          } else {
            markUnlogged(state, state.spendPrompt.todoIds);
          }
        }
        state.spendPrompt = { id, todoIds: ids, categoryId };
      },
      // The id is made here, not in the reducer: reducers must be pure, and
      // a random id would give a different result each time it ran.
      prepare: (details: {
        categoryId: number;
        itemId: number;
        otherBoughtIds: number[];
      }) => ({
        payload: { ...details, id: nanoid() },
      }),
    },
    // "Not now" or the timer: everything in the prompt stays unlogged.
    dismissSpendPrompt: (state) => {
      if (state.spendPrompt) markUnlogged(state, state.spendPrompt.todoIds);
      state.spendPrompt = null;
    },
    // Unchecked: it wasn't bought after all. It leaves the waiting list and
    // any open prompt or Add Spending entry, whose totals then recalculate.
    // A prompt with nothing left in it is withdrawn.
    itemUnchecked: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      unmarkUnlogged(state, [id]);
      if (state.spendPrompt) {
        state.spendPrompt.todoIds = state.spendPrompt.todoIds.filter(
          (t) => t !== id,
        );
        if (state.spendPrompt.todoIds.length === 0) state.spendPrompt = null;
      }
      if (state.spendingDraft) {
        state.spendingDraft.todoIds = state.spendingDraft.todoIds.filter(
          (t) => t !== id,
        );
      }
    },
    acceptSpendPrompt: (state) => {
      state.spendingDraft = state.spendPrompt;
      state.spendPrompt = null;
      state.activeView = "dashboard";
      state.highlightedCategoryId = null;
    },
    // Saved: the items are logged, so they're simply forgotten.
    finishSpendingDraft: (state) => {
      state.spendingDraft = null;
    },
    // Cancelled: the items are still bought but not logged.
    // After "Clear all data": forget anything that pointed at the old data.
    resetLocalData: (state) => {
      state.selectedCategoryId = null;
      state.highlightedCategoryId = null;
      state.spendPrompt = null;
      state.spendingDraft = null;
      state.unloggedTodoIds = [];
      saveUnlogged([]);
      state.planEditorRequest = null;
      // Start over where a new user starts: setting income and a plan.
      state.activeView = "budget";
      state.dataResetCount += 1;
    },
    setAuthNotice: (state, action: PayloadAction<UiState["authNotice"]>) => {
      state.authNotice = action.payload;
    },
    cancelSpendingDraft: (state) => {
      if (state.spendingDraft) markUnlogged(state, state.spendingDraft.todoIds);
      state.spendingDraft = null;
    },
  },
});

export const {
  setFilter,
  toggleTheme,
  syncThemeWithClock,
  setAffirmation,
  setSelectedCategoryId,
  toggleSidebar,
  closeSidebar,
  setActiveView,
  setHighlightedCategoryId,
  openPlanEditor,
  clearPlanEditorRequest,
  promptSpending,
  dismissSpendPrompt,
  itemUnchecked,
  acceptSpendPrompt,
  finishSpendingDraft,
  cancelSpendingDraft,
  resetLocalData,
  setAuthNotice,
} = uiSlice.actions;
export default uiSlice.reducer;
