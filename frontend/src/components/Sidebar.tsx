import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  Box,
  Stack,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ChecklistIcon from "@mui/icons-material/Checklist";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { fetchTodos, deleteAllTodos } from "../api/todos";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTheme, setFilter, closeSidebar, setActiveView } from "../store/uiSlice";
import type { Filter } from "../store/uiSlice";
import CategoryListItems from "./CategoryListItems";
import { signOutUser } from "../api/auth";

const DRAWER_WIDTH = 260;

function Sidebar() {
  const dispatch = useAppDispatch();
  const filter = useAppSelector((state) => state.ui.filter);
  const theme = useAppSelector((state) => state.ui.theme);
  const isSidebarOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const activeView = useAppSelector((state) => state.ui.activeView);
  const email = useAppSelector((state) => state.auth.email);
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [noTodosMessage, setNoTodosMessage] = useState(false);

  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  const total = todos?.length ?? 0;
  const activeCount = todos?.filter((t) => !t.isComplete).length ?? 0;
  const completedCount = todos?.filter((t) => t.isComplete).length ?? 0;

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllTodos,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setIsConfirmOpen(false);
    },
  });

  function handleDeleteAllClick() {
    if (total === 0) {
      setNoTodosMessage(true);
      return;
    }
    setIsConfirmOpen(true);
  }

  const navItems: { label: string; icon: React.ReactNode; filter: Filter; count: number }[] = [
    { label: "All Tasks", icon: <ChecklistIcon />, filter: "all", count: total },
    { label: "Active", icon: <PlayArrowIcon />, filter: "active", count: activeCount },
    { label: "Completed", icon: <CheckCircleIcon />, filter: "completed", count: completedCount },
  ];

  const drawerContent = (
    <>
      <Box sx={{ padding: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ChecklistIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none" }}>
            To-Do
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List>
          <ListItemButton
            selected={activeView === "tasks"}
            onClick={() => {
              dispatch(setActiveView("tasks"));
              dispatch(closeSidebar());
            }}
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>

          <ListItemButton
            selected={activeView === "budget"}
            onClick={() => {
              dispatch(setActiveView("budget"));
              dispatch(closeSidebar());
            }}
          >
            <ListItemIcon>
              <AccountBalanceWalletIcon />
            </ListItemIcon>
            <ListItemText primary="Budget" />
          </ListItemButton>

          {navItems.map((item) => (
            <ListItemButton
              key={item.filter}
              selected={activeView === "tasks" && filter === item.filter}
              onClick={() => {
                dispatch(setFilter(item.filter));
                dispatch(setActiveView("tasks"));
                dispatch(closeSidebar());
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              <Chip label={item.count} size="small" />
            </ListItemButton>
          ))}

          <ListItemButton onClick={handleDeleteAllClick}>
            <ListItemIcon>
              <DeleteSweepIcon color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete All" sx={{ color: "error.main" }} />
          </ListItemButton>

          <CategoryListItems />
        </List>
      </Box>

      <Box sx={{ marginTop: "auto", padding: 3 }}>
        {email && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginBottom: 1, wordBreak: "break-word" }}
          >
            {email}
          </Typography>
        )}

        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <DarkModeIcon fontSize="small" />
            <Typography variant="body2">Dark Mode</Typography>
          </Stack>
          <Switch checked={theme === "dark"} onChange={() => dispatch(toggleTheme())} />
        </Stack>

        <Button
          variant="outlined"
          color="inherit"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={() => signOutUser()}
        >
          Sign Out
        </Button>
      </Box>
    </>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: { xs: 0, md: DRAWER_WIDTH },
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            position: "fixed",
            top: 0,
            left: 0,
            height: "100vh",
            border: "none",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="temporary"
        open={isSidebarOpen}
        onClose={() => dispatch(closeSidebar())}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <DialogTitle>Delete all tasks?</DialogTitle>
        <DialogContent>
          This will permanently delete all {total} tasks. This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteAllMutation.mutate()}>
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={noTodosMessage}
        autoHideDuration={4000}
        onClose={() => setNoTodosMessage(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" onClose={() => setNoTodosMessage(false)}>
          There aren't any todos to delete.
        </Alert>
      </Snackbar>
    </>
  );
}

export default Sidebar;