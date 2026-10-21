import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ChecklistIcon from "@mui/icons-material/Checklist";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import InsightsIcon from "@mui/icons-material/Insights";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setAuthNotice } from "../store/uiSlice";
import { chartColors, SIDEBAR_BG } from "../theme";
import { formatCurrency } from "../utils/currency";
import AuthScreen, { type AuthMode } from "./AuthScreen";
import DonutChart, { LegendDot } from "./DonutChart";
import ThemeToggle from "./ThemeToggle";

const FEATURES = [
  {
    icon: <AccountBalanceWalletIcon />,
    title: "Budget by category",
    text: "Set your monthly income, then split it across categories. Suggestions follow the 50/30/20 rule.",
  },
  {
    icon: <ShoppingCartIcon />,
    title: "Plan your shopping",
    text: "Add items with an estimated cost, and see how your list fits each category's budget.",
  },
  {
    icon: <NotificationsActiveIcon />,
    title: "Warnings before you overspend",
    text: "Get a heads-up when an item or a payment would push a category over budget.",
  },
  {
    icon: <InsightsIcon />,
    title: "See where it went",
    text: "Charts and monthly reports show what you spent, what's left, and where you went over.",
  },
];

const STEPS = [
  { title: "Join", text: "Create a free account with your email or Google." },
  {
    title: "Set your budget",
    text: "Enter your monthly income and plan your categories.",
  },
  {
    title: "Add shopping items",
    text: "List what you need to buy, with a category and estimated cost.",
  },
  {
    title: "Check off and log",
    text: "Tick items as you buy them and log what you actually paid.",
  },
  {
    title: "Track and adjust",
    text: "Watch what's left, get alerts, and adjust your plan anytime.",
  },
];

// Sample numbers for the preview: they show what the Dashboard looks like,
// not anyone's real data.
const PREVIEW = [
  { name: "Groceries", value: 420 },
  { name: "Transportation", value: 180 },
  { name: "Dining Out", value: 208, overBy: 8 },
  { name: "Utilities", value: 72 },
];

function AppPreview() {
  const theme = useTheme();
  const palette = chartColors.series[theme.palette.mode];
  const slices = PREVIEW.map((p, i) => ({
    key: p.name,
    name: p.name,
    value: p.value,
    color: palette[i],
    isAlert: p.overBy !== undefined,
  }));

  return (
    <Card
      sx={{ padding: 3, width: "100%", maxWidth: 380 }}
      aria-label="Example of the dashboard"
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
        }}
      >
        <Typography variant="subtitle2">October overview</Typography>
        <Chip size="small" label="Example" />
      </Stack>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <DonutChart
          slices={slices}
          remaining={320}
          remainingLabel="Left to spend"
          centerValue={880}
          centerLabel="spent"
          centerNote="$320 left"
          size={180}
        />
        <Stack spacing={0.75} sx={{ width: "100%" }}>
          {PREVIEW.map((p, i) => (
            <Stack
              key={p.name}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center" }}
            >
              <LegendDot color={palette[i]} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {p.name}
              </Typography>
              {p.overBy !== undefined && (
                <Stack
                  direction="row"
                  spacing={0.25}
                  sx={{ alignItems: "center", color: "error.main" }}
                >
                  <WarningAmberIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {formatCurrency(p.overBy)} over
                  </Typography>
                </Stack>
              )}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrency(p.value)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

// What everyone who isn't signed in sees: what the app does, how to use it,
// and the way in. "Join" and "Log in" swap the page for the sign-in form.
function LandingPage() {
  const dispatch = useAppDispatch();
  const notice = useAppSelector((state) => state.ui.authNotice);
  const themeMode = useAppSelector((state) => state.ui.theme);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  function openAuth(mode: AuthMode) {
    dispatch(setAuthNotice(null));
    setAuthMode(mode);
    window.scrollTo({ top: 0 });
  }

  if (authMode) {
    return (
      <AuthScreen
        key={authMode}
        initialMode={authMode}
        onBack={() => setAuthMode(null)}
      />
    );
  }

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      {/* Top bar */}
      <Box sx={{ backgroundColor: SIDEBAR_BG[themeMode], color: "#E2E8F0" }}>
        <Container maxWidth="lg">
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", paddingY: 1.5 }}
          >
            <ChecklistIcon color="primary" />
            <Typography
              variant="h2"
              noWrap
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              Budget It First
            </Typography>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <ThemeToggle />
            </Box>
            <Button color="inherit" onClick={() => openAuth("signIn")}>
              Log in
            </Button>
            <Button
              variant="contained"
              onClick={() => openAuth("signUp")}
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              Join
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ paddingY: { xs: 4, md: 8 } }}>
        {notice === "accountDeleted" && (
          <Alert
            severity="success"
            onClose={() => dispatch(setAuthNotice(null))}
            sx={{ marginBottom: 4 }}
          >
            Your account and all its data were deleted. Thanks for trying Budget
            It First.
          </Alert>
        )}

        {/* Hero */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 4, md: 8 }}
          sx={{ alignItems: "center", marginBottom: { xs: 8, md: 12 } }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="overline"
              color="primary"
              sx={{ letterSpacing: 1.2 }}
            >
              Plan today. Spend better tomorrow.
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "2.25rem", md: "3rem" },
                lineHeight: 1.15,
                marginY: 2,
              }}
            >
              Take control of your spending
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ marginBottom: 4, maxWidth: 520 }}
            >
              Set your budget first, plan every purchase against it, and see
              where your money goes before it's gone.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                size="large"
                onClick={() => openAuth("signUp")}
              >
                Join Budget It First — it's free
              </Button>
              <Button size="large" href="#how-it-works">
                How it works
              </Button>
            </Stack>
          </Box>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <AppPreview />
          </Box>
        </Stack>

        {/* Features */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
            marginBottom: { xs: 8, md: 12 },
          }}
        >
          {FEATURES.map((feature) => (
            <Card key={feature.title} sx={{ padding: 3 }}>
              <Box
                sx={(t) => ({
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: alpha(t.palette.primary.main, 0.12),
                  color: "primary.main",
                  marginBottom: 2,
                })}
              >
                {feature.icon}
              </Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, marginBottom: 0.5 }}
              >
                {feature.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {feature.text}
              </Typography>
            </Card>
          ))}
        </Box>

        {/* How it works */}
        <Box
          id="how-it-works"
          sx={{ marginBottom: { xs: 8, md: 12 }, scrollMarginTop: 24 }}
        >
          <Typography
            variant="h2"
            sx={{ textAlign: "center", marginBottom: 1 }}
          >
            How it works
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", marginBottom: 4 }}
          >
            Five steps from sign-up to a month you're in control of.
          </Typography>
          <Box
            component="ol"
            sx={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(5, 1fr)",
              },
              gap: 3,
            }}
          >
            {STEPS.map((step, i) => (
              <Box component="li" key={step.title}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: 700,
                    marginBottom: 1.5,
                  }}
                  aria-hidden
                >
                  {i + 1}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Closing call to action */}
        <Box
          sx={{
            backgroundColor: SIDEBAR_BG[themeMode],
            color: "#E2E8F0",
            borderRadius: 4,
            padding: { xs: 4, md: 6 },
            textAlign: "center",
          }}
        >
          <Typography variant="h2" sx={{ marginBottom: 1 }}>
            Ready to budget it first?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.8, marginBottom: 3 }}>
            It takes a couple of minutes to set up your first month.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ justifyContent: "center" }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => openAuth("signUp")}
            >
              Join Budget It First
            </Button>
            <Button
              color="inherit"
              size="large"
              onClick={() => openAuth("signIn")}
            >
              I already have an account
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

export default LandingPage;
