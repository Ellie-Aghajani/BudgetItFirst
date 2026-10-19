import { useState, useEffect } from "react";
import { Box, Typography, Stack, IconButton } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WbTwilightIcon from "@mui/icons-material/WbTwilight";
import NightlightIcon from "@mui/icons-material/Nightlight";
import Brightness5Icon from "@mui/icons-material/Brightness5";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTheme } from "../store/uiSlice";

function getGreeting(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function getGreetingIcon(hour: number) {
  if (hour < 5) return <NightlightIcon sx={{ color: "#818cf8" }} />;
  if (hour < 12) return <WbSunnyIcon sx={{ color: "#f59e0b" }} />;
  if (hour < 17) return <Brightness5Icon sx={{ color: "#f59e0b" }} />;
  if (hour < 21) return <WbTwilightIcon sx={{ color: "#fb923c" }} />;
  return <NightlightIcon sx={{ color: "#818cf8" }} />;
}

function getAffirmation(hour: number): string {
  if (hour < 5) return "Rest well — tomorrow is a fresh start.";
  if (hour < 12) return "Small steps make big progress!";
  if (hour < 17) return "Keep up the good work!"!;
  if (hour < 21) return "Wrap up strong, you're almost there!";
  return "Time to slow down and recharge.";
}

function Header() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.theme);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const hour = now.getHours();

  const dateFormatted = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        justifyContent: "space-between",
        alignItems: "flex-start",
        margin: { xs: 0, sm: 3 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="h1" sx={{ textTransform: "none" }}>
            {getGreeting(hour)}
          </Typography>
          {getGreetingIcon(hour)}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {getAffirmation(hour)}
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", flexShrink: 0 }}
      >
        {/* The phone's status bar already shows the time. */}
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {dateFormatted}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeFormatted}
          </Typography>
        </Box>
        {/* Below md the navbar has this toggle, so don't show it twice. */}
        <IconButton
          onClick={() => dispatch(toggleTheme())}
          color="inherit"
          aria-label="Toggle dark mode"
          sx={{ display: { xs: "none", md: "inline-flex" } }}
        >
          {themeMode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      </Stack>
    </Stack>
  );
}

export default Header;
