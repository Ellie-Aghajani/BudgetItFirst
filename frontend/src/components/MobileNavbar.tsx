import { AppBar, Toolbar, Typography, IconButton, Stack } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChecklistIcon from "@mui/icons-material/Checklist";
import HomeIcon from "@mui/icons-material/Home";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTheme, toggleSidebar, setActiveView } from "../store/uiSlice";
import { SIDEBAR_BG } from "../theme";

// Stands in for the permanent sidebar below the "md" breakpoint (900px),
// where the sidebar becomes a slide-out drawer opened from the menu button.
function MobileNavbar() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.theme);
  const activeView = useAppSelector((state) => state.ui.activeView);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        display: { xs: "flex", md: "none" },
        backgroundColor: SIDEBAR_BG[themeMode],
        color: "#E2E8F0",
        border: "none",
      }}
    >
      <Toolbar sx={{ gap: 1, paddingX: { xs: 1, sm: 2 } }}>
        <IconButton
          color="inherit"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flex: 1, minWidth: 0 }}
        >
          <ChecklistIcon color="primary" />
          <Typography
            variant="h2"
            noWrap
            sx={{ fontSize: "1.125rem", lineHeight: 1.5 }}
          >
            Budget It First
          </Typography>
        </Stack>

        <IconButton
          color={activeView === "dashboard" ? "primary" : "inherit"}
          onClick={() => dispatch(setActiveView("dashboard"))}
          aria-label="Home"
          aria-current={activeView === "dashboard" ? "page" : undefined}
        >
          <HomeIcon />
        </IconButton>
        <IconButton
          color="inherit"
          onClick={() => dispatch(toggleTheme())}
          aria-label="Toggle dark mode"
        >
          {themeMode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

export default MobileNavbar;
