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
import MonthRollover from "./components/MonthRollover";
import AuthScreen from "./components/AuthScreen";
import MobileNavbar from "./components/MobileNavbar";
import SpendPrompt from "./components/SpendPrompt";

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
        <AuthScreen />
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
              sx={{
                flexGrow: 1,
                minWidth: 0,
                padding: { xs: 2, sm: 3 },
                boxSizing: "border-box",
              }}
            >
              {activeView === "dashboard" ? (
                <DashboardScreen />
              ) : activeView === "budget" ? (
                <BudgetScreen />
              ) : activeView === "reports" ? (
                <ReportsScreen />
              ) : (
                <MainContent />
              )}
            </Box>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
