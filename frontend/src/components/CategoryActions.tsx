import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { deleteCategory, renameCategory } from "../api/categories";
import { fetchTodos } from "../api/todos";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSelectedCategoryId } from "../store/uiSlice";
import { formatCurrency } from "../utils/currency";
import { formatMonth, getCurrentMonth } from "../utils/month";

// Rename and delete for one category: a ⋮ menu plus the two dialogs.
// These used to live in the sidebar; the Budget page is now the one place
// categories are managed.
function CategoryActions({
  categoryId,
  name,
}: {
  categoryId: number;
  name: string;
}) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const selectedCategoryId = useAppSelector(
    (state) => state.ui.selectedCategoryId,
  );
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [draftName, setDraftName] = useState(name);

  // The list only holds this month's items, which is exactly what a delete
  // removes, so the confirm dialog can count them without a request.
  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });
  const { data: spending } = useCurrentSpending();
  const itemCount =
    todos?.filter((t) => t.categoryId === categoryId).length ?? 0;
  const spent =
    spending?.categories.find((c) => c.categoryId === categoryId)?.spent ?? 0;
  const deletedParts = [
    itemCount > 0 &&
      `${itemCount} shopping ${itemCount === 1 ? "item" : "items"}`,
    spent !== 0 && `${formatCurrency(spent)} of logged spending`,
  ].filter(Boolean);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["spending"] });
  }

  const renameMutation = useMutation({
    mutationFn: (newName: string) => renameCategory(categoryId, newName),
    onSuccess: () => {
      invalidateAll();
      setDialog(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(categoryId),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (selectedCategoryId === categoryId)
        dispatch(setSelectedCategoryId(null));
      setDialog(null);
    },
  });

  function open(which: "rename" | "delete") {
    setMenuAnchor(null);
    setDraftName(name);
    renameMutation.reset();
    deleteMutation.reset();
    setDialog(which);
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === name) {
      setDialog(null);
      return;
    }
    renameMutation.mutate(trimmed);
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        aria-label={`${name} options`}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => open("rename")}>Rename</MenuItem>
        <MenuItem onClick={() => open("delete")} sx={{ color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleRenameSubmit}>
          <DialogTitle>Rename category</DialogTitle>
          <DialogContent>
            <TextField
              size="small"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.slice(0, 50))}
              autoFocus
              fullWidth
              aria-label="Category name"
              sx={{ marginTop: 1 }}
            />
            {renameMutation.isError && (
              <Alert severity="error" sx={{ marginTop: 2 }}>
                {renameMutation.error.message}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!draftName.trim() || renameMutation.isPending}
            >
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={dialog === "delete"} onClose={() => setDialog(null)}>
        <DialogTitle>Delete "{name}"?</DialogTitle>
        <DialogContent>
          {deletedParts.length > 0
            ? `This also deletes ${deletedParts.join(" and ")} from ${formatMonth(getCurrentMonth())}. `
            : ""}
          Past months' reports won't change.
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ marginTop: 2 }}>
              {deleteMutation.error.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CategoryActions;
