import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
} from "@mui/material";
import { useEffect, useMemo } from "react";
import { getTheme } from "./theme";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { syncThemeWithClock } from "./store/uiSlice";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import BudgetScreen from "./components/BudgetScreen";
import DashboardScreen from "./components/DashboardScreen";
import ReportsScreen from "./components/ReportsScreen";
import SpendingCalendar from "./components/SpendingCalendar";
import MonthRollover from "./components/MonthRollover";
import LandingPage from "./components/LandingPage";
import MobileNavbar from "./components/MobileNavbar";
import SpendPrompt from "./components/SpendPrompt";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const dispatch = useAppDispatch();
  const mode = useAppSelector((state) => state.ui.theme);

  // Until the user picks a mode, switch to dark at 7pm and back at 7am.
  useEffect(() => {
    const intervalId = setInterval(
      () => dispatch(syncThemeWithClock(new Date().getHours())),
      60_000,
    );
    return () => clearInterval(intervalId);
  }, [dispatch]);
  const theme = useMemo(() => getTheme(mode), [mode]);
  const { uid, isLoading } = useAppSelector((state) => state.auth);
  const activeView = useAppSelector((state) => state.ui.activeView);
  const dataResetCount = useAppSelector((state) => state.ui.dataResetCount);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      ) : uid === null ? (
        // Everyone who isn't signed in starts here: what the app is, how
        // to use it, and the way in.
        <LandingPage />
      ) : (
        <Box
          sx={{
            display: "flex",
            width: "100%",
            minHeight: "100vh",
            overflowX: "hidden",
          }}
        >
          <MonthRollover />
          <SpendPrompt />
          <Sidebar />
          <Box
            sx={{
              flexGrow: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MobileNavbar />
            <Box
              component="main"
              // New key after "Clear all data": the screen remounts, so no
              // half-finished form or old selection survives the reset.
              key={dataResetCount}
              sx={{
                flexGrow: 1,
                minWidth: 0,
                padding: { xs: 2, sm: 3 },
                boxSizing: "border-box",
              }}
            >
              {/* A crash in one screen shows a message there; the sidebar
                  stays usable. Keyed by view, so moving to another screen
                  starts it fresh. */}
              <ErrorBoundary key={activeView}>
                {activeView === "dashboard" ? (
                  <DashboardScreen />
                ) : activeView === "budget" ? (
                  <BudgetScreen />
                ) : activeView === "reports" ? (
                  <ReportsScreen />
                ) : activeView === "calendar" ? (
                  <SpendingCalendar />
                ) : (
                  <MainContent />
                )}
              </ErrorBoundary>
            </Box>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
