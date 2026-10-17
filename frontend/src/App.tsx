import { ThemeProvider, CssBaseline, Box, CircularProgress } from "@mui/material";
import { useMemo } from "react";
import { getTheme } from "./theme";
import { useAppSelector } from "./store/hooks";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import BudgetScreen from "./components/BudgetScreen";
import DashboardScreen from "./components/DashboardScreen";
import ReportsScreen from "./components/ReportsScreen";
import MonthRollover from "./components/MonthRollover";
import AuthScreen from "./components/AuthScreen";

function App() {
  const mode = useAppSelector((state) => state.ui.theme);
  const theme = useMemo(() => getTheme(mode), [mode]);
  const { uid, isLoading } = useAppSelector((state) => state.auth);
  const activeView = useAppSelector((state) => state.ui.activeView);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {isLoading ? (
        <Box sx={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : uid === null ? (
        <AuthScreen />
      ) : (
        <Box sx={{ display: "flex", width: "100%", minHeight: "100vh", overflowX: "hidden" }}>
          <MonthRollover />
          <Sidebar />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              minWidth: 0,
              // marginLeft: { xs: 0, md: "260px" },
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
      )}
    </ThemeProvider>
  );
}

export default App;