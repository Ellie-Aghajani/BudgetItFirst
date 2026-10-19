import { FormControlLabel, Switch } from "@mui/material";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTheme } from "../store/uiSlice";

// A labelled switch rather than a sun/moon icon button, so it reads as a
// setting and can't be mistaken for the greeting's time-of-day icon.
function ThemeToggle({ label = "Dark mode" }: { label?: string }) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  return (
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={theme === "dark"}
          onChange={() => dispatch(toggleTheme())}
        />
      }
      label={label}
      slotProps={{ typography: { variant: "body2" } }}
      sx={{ marginRight: 0, color: "inherit", whiteSpace: "nowrap" }}
    />
  );
}

export default ThemeToggle;
