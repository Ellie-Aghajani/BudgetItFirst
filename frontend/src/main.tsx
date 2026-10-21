import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { store } from "./store/store";
// Only the weights the theme uses, so unused font files aren't bundled.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./index.css";
import App from "./App.tsx";
import AuthListener from "./components/AuthListener.tsx";

// Wake the API (and its database) as soon as the app opens. On free hosting
// both go to sleep when idle and take a while to start; this way they start
// while the user is still typing their password. Fire-and-forget: the
// response doesn't matter, and a failure here is harmless.
fetch(`${import.meta.env.VITE_API_URL}/api/health`).catch(() => {});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthListener>
          <App />
        </AuthListener>
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
);
