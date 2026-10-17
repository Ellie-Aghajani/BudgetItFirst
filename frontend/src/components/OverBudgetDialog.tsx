import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { OverBudgetWarning } from "../hooks/useOverBudgetWarning";
import { formatCurrency } from "../utils/currency";

function OverBudgetDialog({
  warning,
  onCancel,
  onConfirm,
}: {
  warning: OverBudgetWarning | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={warning !== null} onClose={onCancel} maxWidth="xs" fullWidth>
      {warning && (
        <>
          <DialogTitle sx={{ textAlign: "center" }}>
            <WarningAmberIcon color="error" sx={{ display: "block", margin: "0 auto 8px" }} />
            Your list is over budget
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ textAlign: "center", marginBottom: 2 }}>
              With this item, your {warning.categoryName} list is estimated at{" "}
              {formatCurrency(warning.overBy)} over budget.
            </Typography>
            <Stack spacing={0.5}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2">{warning.categoryName} budget:</Typography>
                <Typography variant="body2">{formatCurrency(warning.budget)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" color="error">
                  List estimate with this item:
                </Typography>
                <Typography variant="body2" color="error">
                  {formatCurrency(warning.newEstimate)}
                </Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="contained" color="error" onClick={onConfirm}>
              Save anyway
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default OverBudgetDialog;
