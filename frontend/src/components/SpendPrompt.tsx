import { Button, Snackbar } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { acceptSpendPrompt, dismissSpendPrompt } from "../store/uiSlice";
import { useDraftDetails } from "../hooks/useDraftDetails";
import { formatCurrency } from "../utils/currency";

// "Add it to your spending?" after an item is checked off. Lives in App, not
// in the list, so it works from both the Dashboard card and the Shopping
// List page, and survives the switch to the Dashboard.
function SpendPrompt() {
  const dispatch = useAppDispatch();
  const prompt = useAppSelector((state) => state.ui.spendPrompt);
  const { titles, total, categoryName } = useDraftDetails(prompt);

  const message =
    titles.length === 0
      ? ""
      : titles.length === 1
        ? `Bought "${titles[0]}". Add it to your spending?`
        : // Earlier check-offs in this category weren't logged: offer one total.
          `${titles.length} ${categoryName} items bought and not logged yet (${titles.join(", ")}), about ${formatCurrency(total)}. Add their total to your spending?`;

  return (
    <Snackbar
      // Re-keyed per prompt so a new check-off restarts the timer.
      key={prompt?.id}
      open={prompt !== null && titles.length > 0}
      autoHideDuration={10000}
      onClose={(_e, reason) => {
        // A click elsewhere (like checking off the next item) shouldn't
        // dismiss it; only the timer or "Not now" does.
        if (reason !== "clickaway") dispatch(dismissSpendPrompt());
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      message={message}
      action={
        <>
          <Button color="primary" size="small" onClick={() => dispatch(acceptSpendPrompt())}>
            {titles.length > 1 ? "Add total" : "Add spending"}
          </Button>
          <Button color="inherit" size="small" onClick={() => dispatch(dismissSpendPrompt())}>
            Not now
          </Button>
        </>
      }
    />
  );
}

export default SpendPrompt;
