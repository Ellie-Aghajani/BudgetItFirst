import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  IconButton,
  Divider,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import LabelIcon from "@mui/icons-material/Label";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {
  fetchCategories,
  createCategory,
  deleteCategory,
  renameCategory,
  type Category,
} from "../api/categories";
import { fetchTodos } from "../api/todos";
import { formatMonth, getCurrentMonth } from "../utils/month";
import { formatCurrency } from "../utils/currency";
import { useCurrentSpending } from "../hooks/useCurrentSpending";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSelectedCategoryId } from "../store/uiSlice";

function CategoryListItems() {
  const dispatch = useAppDispatch();
  const selectedCategoryId = useAppSelector((state) => state.ui.selectedCategoryId);
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // The list only holds this month's items, which is exactly what a
  // delete removes — so the confirm dialog can count them without a request.
  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });
  const itemsToDeleteCount =
    todos?.filter((t) => t.categoryId === categoryToDelete?.id).length ?? 0;
  // This month's logged spending in the category is deleted with it too.
  const { data: spending } = useCurrentSpending();
  const spentToDelete =
    spending?.categories.find((c) => c.categoryId === categoryToDelete?.id)?.spent ?? 0;
  const deletedParts = [
    itemsToDeleteCount > 0 &&
      `${itemsToDeleteCount} shopping ${itemsToDeleteCount === 1 ? "item" : "items"}`,
    spentToDelete !== 0 && `${formatCurrency(spentToDelete)} of logged spending`,
  ].filter(Boolean);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    // Wrapped so React Query's second argument (its context object) can't
    // land in createCategory's optional budget parameter.
    mutationFn: (name: string) => createCategory(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      setNewName("");
      setIsAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (selectedCategoryId === deletedId) {
        dispatch(setSelectedCategoryId(null));
      }
      setCategoryToDelete(null);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => renameCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      setEditingId(null);
    },
  });

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate(newName);
  }

  function handleRenameSubmit(e: React.FormEvent, id: number) {
    e.preventDefault();
    if (!draftName.trim()) {
      setEditingId(null);
      return;
    }
    renameMutation.mutate({ id, name: draftName });
  }

  const visibleCategories = showAll ? categories : categories?.slice(0, 2);
  const hiddenCount = (categories?.length ?? 0) - 2;

  return (
    <>
      <Divider sx={{ my: 1 }} />

      <ListItem
        secondaryAction={
          <IconButton size="small" onClick={() => setIsAdding(true)}>
            <AddIcon fontSize="small" />
          </IconButton>
        }
      >
        <ListItemIcon>
          <LabelIcon />
        </ListItemIcon>
        <ListItemText primary="Categories" />
      </ListItem>

      {isAdding && (
        <ListItem>
          <form onSubmit={handleAddSubmit} style={{ width: "100%" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="New category"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                fullWidth
              />
              <IconButton type="submit" size="small">
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setIsAdding(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </form>
        </ListItem>
      )}

      {visibleCategories?.map((category) =>
        editingId === category.id ? (
          <ListItem key={category.id}>
            <form
              onSubmit={(e) => handleRenameSubmit(e, category.id)}
              style={{ width: "100%" }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TextField
                  size="small"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  autoFocus
                  fullWidth
                />
                <IconButton type="submit" size="small">
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setEditingId(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </form>
          </ListItem>
        ) : (
          <ListItem
            key={category.id}
            disablePadding
            secondaryAction={
              <Stack direction="row">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingId(category.id);
                    setDraftName(category.name);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setCategoryToDelete(category)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            }
          >
            <ListItemButton
              selected={selectedCategoryId === category.id}
              onClick={() =>
                dispatch(
                  setSelectedCategoryId(
                    selectedCategoryId === category.id ? null : category.id
                  )
                )
              }
              sx={{ pl: 7 }}
            >
              <ListItemText primary={category.name} />
            </ListItemButton>
          </ListItem>
        )
      )}

      {categories && categories.length > 2 && (
        <ListItem disablePadding>
          <IconButton
            size="small"
            onClick={() => setShowAll(!showAll)}
            sx={{ width: "100%", justifyContent: "flex-start", pl: 2, gap: 1 }}
          >
            {showAll ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {showAll ? "Show less" : `${hiddenCount} more`}
            </Typography>
          </IconButton>
        </ListItem>
      )}

      <Dialog open={categoryToDelete !== null} onClose={() => setCategoryToDelete(null)}>
        <DialogTitle>Delete "{categoryToDelete?.name}"?</DialogTitle>
        <DialogContent>
          {deletedParts.length > 0
            ? `This also deletes ${deletedParts.join(" and ")} from ${formatMonth(getCurrentMonth())}. `
            : ""}
          Past months' reports won't change.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryToDelete(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={deleteMutation.isPending}
            onClick={() => categoryToDelete && deleteMutation.mutate(categoryToDelete.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={errorMessage !== null}
        autoHideDuration={5000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

export default CategoryListItems;