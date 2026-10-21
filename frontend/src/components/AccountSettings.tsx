import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import { clearAllData, deleteAccount } from "../api/account";
import { getSignInMethod, reauthenticate, signOutUser } from "../api/auth";
import { useAppDispatch } from "../store/hooks";
import { resetLocalData, setAuthNotice } from "../store/uiSlice";

type Action = "clear" | "delete";
const CONFIRM_WORD = "DELETE";

// Per-browser leftovers that refer to the old data (card colors by category).
function clearLocalLeftovers() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("todo-app-card-color-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage blocked: nothing was saved there anyway.
  }
}

function ConfirmDialog({
  action,
  onClose,
}: {
  action: Action;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const isDelete = action === "delete";
  const usesPassword = getSignInMethod() === "password";
  const canConfirm =
    typed === CONFIRM_WORD && (!isDelete || !usesPassword || password !== "");

  async function handleConfirm() {
    setIsWorking(true);
    setError(null);
    try {
      if (isDelete) {
        await reauthenticate(usesPassword ? password : undefined);
        await deleteAccount();
        clearLocalLeftovers();
        dispatch(resetLocalData());
        queryClient.clear();
        // Shown on the landing page the user lands on next.
        dispatch(setAuthNotice("accountDeleted"));
        // The Firebase user is gone; signing out clears the local session.
        await signOutUser();
      } else {
        await clearAllData();
        clearLocalLeftovers();
        dispatch(resetLocalData());
        // Drop every cached list and refetch: the screens show the empty state.
        await queryClient.resetQueries();
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <Dialog
      open
      onClose={isWorking ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        {isDelete ? "Delete your account?" : "Clear all your data?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ marginBottom: 2 }}>
          {isDelete
            ? "This permanently deletes your account and everything in it: income, categories, shopping lists, spending and reports. You won't be able to sign in again."
            : "This permanently deletes your income, categories, shopping lists, spending and reports. Your account stays, so you can start over."}{" "}
          This can't be undone.
        </DialogContentText>
        <Stack spacing={2}>
          {isDelete && usesPassword && (
            <TextField
              label="Your password"
              type="password"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />
          )}
          {isDelete && !usesPassword && (
            <Typography variant="body2" color="text.secondary">
              You'll be asked to confirm with Google.
            </Typography>
          )}
          <TextField
            label={`Type ${CONFIRM_WORD} to confirm`}
            size="small"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isWorking}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleConfirm}
          disabled={!canConfirm || isWorking}
        >
          {isDelete ? "Delete account" : "Clear data"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// The email line in the sidebar, with a gear that opens the account actions.
function AccountSettings({ email }: { email: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);

  return (
    <Box sx={{ marginBottom: 1 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Typography
          variant="body2"
          sx={{ flex: 1, minWidth: 0, wordBreak: "break-word", opacity: 0.7 }}
        >
          {email}
        </Typography>
        <IconButton
          size="small"
          color="inherit"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Account settings"
          aria-expanded={isOpen}
          sx={{
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform 200ms",
          }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Collapse in={isOpen}>
        <Stack spacing={0.5} sx={{ paddingTop: 1 }}>
          <Button
            color="inherit"
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setAction("clear")}
            sx={{ justifyContent: "flex-start", opacity: 0.85 }}
          >
            Clear all data
          </Button>
          <Button
            size="small"
            startIcon={<PersonRemoveIcon />}
            onClick={() => setAction("delete")}
            sx={{ justifyContent: "flex-start", color: "error.light" }}
          >
            Delete account
          </Button>
        </Stack>
      </Collapse>

      {/* Keyed by action, so each opening starts with empty fields. */}
      {action && (
        <ConfirmDialog
          key={action}
          action={action}
          onClose={() => setAction(null)}
        />
      )}
    </Box>
  );
}

export default AccountSettings;
