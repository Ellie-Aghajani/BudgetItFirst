import { useState } from "react";
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
import type { Todo } from "../api/todos";
import { useTodoActions } from "../hooks/useTodoActions";
import { formatCurrency, parseCost } from "../utils/currency";
import OverBudgetDialog from "./OverBudgetDialog";

function TodoItem({ todo }: { todo: Todo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftCost, setDraftCost] = useState(String(todo.estimatedCost));
  const { toggle, remove, saveEdit, dialogProps } = useTodoActions(todo);
  const parsedCost = parseCost(draftCost);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  function startEditing() {
    setDraftTitle(todo.title);
    setDraftCost(String(todo.estimatedCost));
    setIsEditing(true);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedCost === null) return;
    saveEdit(draftTitle, parsedCost, () => setIsEditing(false));
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
          onChange={toggle}
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
              onClick={remove}
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
            remove();
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
