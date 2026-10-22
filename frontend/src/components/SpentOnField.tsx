import { TextField } from "@mui/material";
import { getSpendableRange, isSpendableDate } from "../utils/dates";

// A date picker for when the money was spent. Uses the browser's own date
// input: a native calendar on phones, keyboard-friendly on desktop.
function SpentOnField({
  value,
  onChange,
}: {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
}) {
  const { min, max } = getSpendableRange();
  return (
    <TextField
      label="Date"
      type="date"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={!isSpendableDate(value)}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { min, max },
      }}
      sx={{ minWidth: 150 }}
    />
  );
}

export default SpentOnField;
