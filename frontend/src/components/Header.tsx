import { useState, useEffect } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import WbTwilightIcon from "@mui/icons-material/WbTwilight";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import BedtimeIcon from "@mui/icons-material/Bedtime";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setDisplayName } from "../store/authSlice";
import { updateDisplayName } from "../api/auth";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { formatCurrency } from "../utils/currency";
import ThemeToggle from "./ThemeToggle";

interface TimeOfDay {
  greeting: string;
  icon: React.ReactNode;
  color: string;
  // Shown until the budget numbers load.
  fallback: string;
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour < 5)
    return {
      greeting: "Still up",
      icon: <BedtimeIcon />,
      color: "#6366F1",
      fallback: "Rest well. Tomorrow is a fresh start.",
    };
  if (hour < 12)
    return {
      greeting: "Good morning",
      icon: <WbTwilightIcon />,
      color: "#F59E0B",
      fallback: "A good day to plan before you spend.",
    };
  if (hour < 17)
    return {
      greeting: "Good afternoon",
      icon: <WbSunnyIcon />,
      color: "#F59E0B",
      fallback: "Keep your spending on track.",
    };
  return {
    greeting: "Good evening",
    icon: <NightsStayIcon />,
    color: "#8B5CF6",
    fallback: "A quick check-in before the day ends.",
  };
}

// The line under the greeting: where this month's money stands, so the
// first thing on every screen is useful, not just friendly.
function useBudgetLine(now: Date, fallback: string): string {
  const { data: spending } = useCurrentSpending();
  if (!spending) return fallback;

  if (spending.monthlyIncome === 0)
    return "Let's start by setting your monthly income on the Budget page.";
  if (spending.totalBudget === 0)
    return "Next step: plan your categories on the Budget page.";

  const left = spending.totalBudget - spending.totalSpent;
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const daysText =
    daysLeft === 1 ? "today is the last day" : `${daysLeft} days to go`;

  return left >= 0
    ? `You have ${formatCurrency(left)} left to spend this month, ${daysText}.`
    : `You're ${formatCurrency(-left)} over budget this month, ${daysText}. Small cuts add up.`;
}

function NameDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateDisplayName(name);
      dispatch(setDisplayName(name.trim()));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your name.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>What should we call you?</DialogTitle>
        <DialogContent>
          <TextField
            label="First name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            autoFocus
            fullWidth
            autoComplete="given-name"
            sx={{ marginTop: 1 }}
          />
          {error && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || isSaving}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function Header() {
  const displayName = useAppSelector((state) => state.auth.displayName);
  const [now, setNow] = useState(new Date());
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(intervalId);
  }, []);

  const timeOfDay = getTimeOfDay(now.getHours());
  const budgetLine = useBudgetLine(now, timeOfDay.fallback);
  const firstName = displayName?.trim().split(/\s+/)[0];

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
      spacing={2}
      sx={{
        justifyContent: "space-between",
        alignItems: "flex-start",
        margin: { xs: 0, sm: 3 },
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ flex: 1, minWidth: 0, alignItems: "center" }}
      >
        {/* Decorative: a soft badge marks the time of day without looking
            like a button. Hidden from screen readers, the text says it all. */}
        <Avatar
          aria-hidden
          sx={{
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            backgroundColor: alpha(timeOfDay.color, 0.15),
            color: timeOfDay.color,
            flexShrink: 0,
          }}
        >
          {timeOfDay.icon}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" sx={{ textTransform: "none" }}>
            {timeOfDay.greeting}
            {firstName ? `, ${firstName}` : ""}
            {timeOfDay.greeting === "Still up" ? "?" : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {budgetLine}
          </Typography>
          {!displayName && (
            <Button
              size="small"
              onClick={() => setIsNameDialogOpen(true)}
              sx={{ padding: 0, minWidth: 0, margin: 0, marginTop: 0.5 }}
            >
              Add your name
            </Button>
          )}
        </Box>
      </Stack>

      <Stack
        spacing={0.5}
        sx={{
          alignItems: "flex-end",
          flexShrink: 0,
          display: { xs: "none", sm: "flex" },
        }}
      >
        {/* The phone's status bar already shows the time. */}
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {dateFormatted}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeFormatted}
          </Typography>
        </Box>
        {/* Below md the navbar has the toggle, so don't show it twice. */}
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <ThemeToggle />
        </Box>
      </Stack>

      <NameDialog
        // Remount per opening, so the field starts empty each time.
        key={String(isNameDialogOpen)}
        open={isNameDialogOpen}
        onClose={() => setIsNameDialogOpen(false)}
      />
    </Stack>
  );
}

export default Header;
