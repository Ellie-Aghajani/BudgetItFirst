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
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resetPassword,
} from "../api/auth";
import { useAppDispatch } from "../store/hooks";
import { setDisplayName } from "../store/authSlice";

type Mode = "signIn" | "signUp" | "resetPassword";

function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signIn");
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
      await signInWithGoogle();
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
      }}
    >
      <Card sx={{ padding: 4, width: "100%", maxWidth: 420 }}>
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
