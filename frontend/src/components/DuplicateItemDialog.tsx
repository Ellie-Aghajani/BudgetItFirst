import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import type { Todo } from "../api/todos";
import { formatCurrency } from "../utils/currency";

function DuplicateItemDialog({
  match,
  onCancel,
  onConfirm,
}: {
  match: Todo | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={match !== null} onClose={onCancel} maxWidth="xs" fullWidth>
      {match && (
        <>
          <DialogTitle sx={{ textAlign: "center" }}>
            <ContentCopyIcon
              color="warning"
              sx={{ display: "block", margin: "0 auto 8px" }}
            />
            {match.isComplete ? "Already bought" : "Already on your list"}
          </DialogTitle>
          <DialogContent sx={{ textAlign: "center" }}>
            {match.isComplete
              ? `You already bought "${match.title}" (${formatCurrency(match.estimatedCost)}) this month.`
              : `"${match.title}" (${formatCurrency(match.estimatedCost)}) is already on your shopping list.`}{" "}
            Do you want to buy it again?
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center" }}>
            <Button onClick={onCancel}>Cancel</Button>
            <Button variant="contained" onClick={onConfirm} autoFocus>
              Add again
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default DuplicateItemDialog;
