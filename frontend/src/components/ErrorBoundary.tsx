import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertTitle, Box, Button, Stack } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Catches a crash while rendering the screens inside it and shows a message
// instead of a blank page. A class on purpose: React has no hook for this,
// only componentDidCatch / getDerivedStateFromError.
// It doesn't catch errors in event handlers or async code (those don't break
// rendering); React Query and try/catch already handle those.
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Still visible in the console, with the component stack, for debugging.
    console.error("Screen crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error === null) return this.props.children;

    return (
      <Box sx={{ padding: { xs: 2, sm: 3 }, maxWidth: 560 }}>
        <Alert severity="error">
          <AlertTitle>Something went wrong on this screen</AlertTitle>
          Your data is safe. Try again, or reload the page if it keeps
          happening.
          <Stack direction="row" spacing={1} sx={{ marginTop: 2 }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </Button>
            <Button
              size="small"
              color="inherit"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          </Stack>
        </Alert>
      </Box>
    );
  }
}

export default ErrorBoundary;
