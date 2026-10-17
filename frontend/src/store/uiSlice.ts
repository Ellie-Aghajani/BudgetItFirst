import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type Filter = "all" | "active" | "completed";
export type Theme = "light" | "dark";
export type View = "tasks" | "budget";

const AFFIRMATION_KEY = "todo-app-affirmation";

function loadAffirmation(): string {
  return localStorage.getItem(AFFIRMATION_KEY) ?? "Progress, not perfection.";
}

interface UiState {
  filter: Filter;
  theme: Theme;
  affirmation: string;
  selectedCategoryId: number | null;
  isSidebarOpen: boolean;
  activeView: View;
}

const initialState: UiState = {
  filter: "all",
  theme: "light",
  affirmation: loadAffirmation(),
  selectedCategoryId: null,
  isSidebarOpen: false,
  activeView: "tasks",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Filter>) => {
      state.filter = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
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
    },
  },
});

export const {
  setFilter,
  toggleTheme,
  setAffirmation,
  setSelectedCategoryId,
  toggleSidebar,
  closeSidebar,
  setActiveView,
} = uiSlice.actions;
export default uiSlice.reducer;