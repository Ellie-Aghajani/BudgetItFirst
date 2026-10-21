import { useState } from "react";
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Stack,
  Divider,
  Link,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPassword,
} from "../api/auth";
import { useAppDispatch } from "../store/hooks";
import { setDisplayName } from "../store/authSlice";
import { setActiveView } from "../store/uiSlice";

export type AuthMode = "signIn" | "signUp" | "resetPassword";
type Mode = AuthMode;

function AuthScreen({
  initialMode = "signIn",
  onBack,
}: {
  initialMode?: AuthMode;
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const dispatch = useAppDispatch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (mode === "signIn") {
        await signInWithEmail(email, password);
      } else if (mode === "signUp") {
        await signUpWithEmail(email, password, name);
        // Firebase reports the new user before the name is saved, so pass
        // the name along directly for the greeting.
        dispatch(setDisplayName(name.trim()));
        // A new account has nothing yet: start on the Budget page to set
        // income and plan categories.
        dispatch(setActiveView("budget"));
      } else if (mode === "resetPassword") {
        await resetPassword(email);
        setInfoMessage("Password reset email sent — check your inbox.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  async function handleGoogleSignIn() {
    setErrorMessage(null);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) dispatch(setActiveView("budget"));
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "background.default",
        padding: 2,
      }}
    >
      <Card sx={{ padding: { xs: 3, sm: 4 }, width: "100%", maxWidth: 420 }}>
        {onBack && (
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ marginLeft: -1, marginBottom: 1 }}
          >
            Back
          </Button>
        )}
        <Stack spacing={1} sx={{ marginBottom: 3 }}>
          <Typography
            variant="overline"
            color="primary"
            sx={{ letterSpacing: 1.2 }}
          >
            Budget It First
          </Typography>
          <Typography
            variant="h1"
            sx={{ textTransform: "none", marginBottom: 0 }}
          >
            {mode === "signIn" && "Welcome back"}
            {mode === "signUp" && "Create your account"}
            {mode === "resetPassword" && "Reset your password"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {mode === "signIn" &&
              "Sign in to plan your shopping and stay on budget."}
            {mode === "signUp" &&
              "Set your budget first, then plan every purchase against it."}
            {mode === "resetPassword" &&
              "We’ll send you a reset link so you can get back into your account."}
          </Typography>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {mode === "signUp" && (
              <TextField
                label="First name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                required
                fullWidth
                autoComplete="given-name"
              />
            )}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />

            {mode !== "resetPassword" && (
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
            )}

            {errorMessage && (
              <Typography variant="body2" color="error">
                {errorMessage}
              </Typography>
            )}
            {infoMessage && (
              <Typography variant="body2" color="success.main">
                {infoMessage}
              </Typography>
            )}

            <Button type="submit" variant="contained" color="primary" fullWidth>
              {mode === "signIn" && "Sign In"}
              {mode === "signUp" && "Create Account"}
              {mode === "resetPassword" && "Send Reset Email"}
            </Button>
          </Stack>
        </form>

        {mode !== "resetPassword" && (
          <>
            <Divider sx={{ marginY: 2 }}>or</Divider>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>
          </>
        )}

        <Stack sx={{ marginTop: 2, alignItems: "center" }} spacing={1}>
          {mode === "signIn" && (
            <>
              <Link
                component="button"
                type="button"
                onClick={() => setMode("resetPassword")}
              >
                Forgot password?
              </Link>
              <Link
                component="button"
                type="button"
                onClick={() => setMode("signUp")}
              >
                Don't have an account? Sign up
              </Link>
            </>
          )}
          {mode === "signUp" && (
            <Link
              component="button"
              type="button"
              onClick={() => setMode("signIn")}
            >
              Already have an account? Sign in
            </Link>
          )}
          {mode === "resetPassword" && (
            <Link
              component="button"
              type="button"
              onClick={() => setMode("signIn")}
            >
              Back to sign in
            </Link>
          )}
        </Stack>
      </Card>
    </Box>
  );
}

export default AuthScreen;
