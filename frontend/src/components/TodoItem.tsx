import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  ListItem,
  ListItemText,
  TextField,
  Stack,
  Box,
  InputAdornment,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { toggleTodo, deleteTodo, updateTodo } from "../api/todos";
import type { Todo } from "../api/todos";
import { useOverBudgetWarning } from "../hooks/useOverBudgetWarning";
import { formatCurrency, parseCost } from "../utils/currency";
import OverBudgetDialog from "./OverBudgetDialog";

function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftCost, setDraftCost] = useState(String(todo.estimatedCost));
  const { saveWithWarning, dialogProps } = useOverBudgetWarning();
  const parsedCost = parseCost(draftCost);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const toggleMutation = useMutation({
    mutationFn: toggleTodo,
    onMutate: async (todoBeingToggled) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old?.map((t) =>
          t.id === todoBeingToggled.id
            ? { ...t, isComplete: !t.isComplete }
            : t,
        ),
      );
      return { previousTodos };
    },
    onError: (_err, _todo, context) => {
      queryClient.setQueryData(["todos"], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onMutate: async (idBeingDeleted) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old?.filter((t) => t.id !== idBeingDeleted),
      );
      return { previousTodos };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["todos"], context?.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (changes: { title: string; estimatedCost: number }) =>
      updateTodo(todo, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["spending"] });
      setIsEditing(false);
    },
  });

  function startEditing() {
    setDraftTitle(todo.title);
    setDraftCost(String(todo.estimatedCost));
    setIsEditing(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedCost === null) return;

    const title = draftTitle.trim();
    const estimatedCost = parsedCost;
    if (!title || (title === todo.title && estimatedCost === todo.estimatedCost)) {
      setIsEditing(false);
      return;
    }
    // Only the increase counts toward the budget: editing $10 → $12 adds $2.
    saveWithWarning(todo.categoryId, estimatedCost - todo.estimatedCost, () =>
      updateMutation.mutate({ title, estimatedCost }),
    );
  }

  return (
    <ListItem sx={{ display: "block", minWidth: 0, px: { xs: 0.5, sm: 1 } }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          minWidth: 0,
          width: "100%",
          gap: 0.5,
        }}
      >
        <Checkbox
          checked={todo.isComplete}
          onChange={() => toggleMutation.mutate(todo)}
          sx={{ p: { xs: 0.5, sm: 1 }, flexShrink: 0 }}
        />

        {isEditing ? (
          <form onSubmit={handleEditSubmit} style={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                alignItems: { xs: "stretch", sm: "center" },
                width: "100%",
              }}
            >
              <TextField
                size="small"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                autoFocus
                fullWidth
              />
              <TextField
                size="small"
                type="number"
                value={draftCost}
                onChange={(e) => setDraftCost(e.target.value)}
                error={parsedCost === null}
                aria-label="Estimated cost"
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  },
                  htmlInput: { min: 0, step: "0.01" },
                }}
                sx={{ width: { sm: 140 }, flexShrink: 0 }}
              />
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: "flex-end" }}
              >
                <IconButton type="submit" size="small" aria-label="Save item">
                  ✓
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(false)}
                  aria-label="Cancel edit"
                >
                  ✕
                </IconButton>
              </Stack>
            </Stack>
          </form>
        ) : (
          <ListItemText
            primary={todo.title}
            secondary={todo.estimatedCost > 0 ? formatCurrency(todo.estimatedCost) : undefined}
            sx={{
              textDecoration: todo.isComplete ? "line-through" : "none",
              color: (t) =>
                todo.isComplete
                  ? t.palette.text.secondary
                  : t.palette.text.primary,
              overflowWrap: "break-word",
              wordBreak: "break-word",
              minWidth: 0,
              pr: 1,
              fontSize: { xs: "0.9rem", sm: "1rem" },
              flex: 1,
            }}
          />
        )}
      </Box>

      {!isEditing && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: "none", sm: "flex" } }}
          >
            <IconButton
              size="small"
              onClick={startEditing}
              aria-label="Edit item"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => deleteMutation.mutate(todo.id)}
              aria-label="Delete item"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>

          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ display: { xs: "inline-flex", sm: "none" } }}
          >
            <MoreHorizIcon />
          </IconButton>
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            startEditing();
            setMenuAnchor(null);
          }}
        >
          Update
        </MenuItem>
        <MenuItem
          onClick={() => {
            deleteMutation.mutate(todo.id);
            setMenuAnchor(null);
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      <OverBudgetDialog {...dialogProps} />
    </ListItem>
  );
}

export default TodoItem;
