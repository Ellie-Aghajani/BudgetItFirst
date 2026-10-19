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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ChecklistIcon from "@mui/icons-material/Checklist";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { fetchTodos, deleteAllTodos } from "../api/todos";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setFilter, closeSidebar, setActiveView } from "../store/uiSlice";
import type { Filter } from "../store/uiSlice";
import { signOutUser } from "../api/auth";

const DRAWER_WIDTH = 260;

function Sidebar() {
  const dispatch = useAppDispatch();
  const filter = useAppSelector((state) => state.ui.filter);
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
      queryClient.invalidateQueries({ queryKey: ["spending"] });
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
    { label: "All Items", icon: <ChecklistIcon />, filter: "all", count: total },
    { label: "To Buy", icon: <PlayArrowIcon />, filter: "active", count: activeCount },
    { label: "Bought", icon: <CheckCircleIcon />, filter: "completed", count: completedCount },
  ];

  const drawerContent = (
    <>
      <Box sx={{ padding: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ChecklistIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none" }}>
            Budget It First
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List>
          <ListItemButton
            selected={activeView === "dashboard"}
            onClick={() => {
              dispatch(setActiveView("dashboard"));
              dispatch(closeSidebar());
            }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>

          <ListItemButton
            selected={activeView === "tasks"}
            onClick={() => {
              dispatch(setActiveView("tasks"));
              dispatch(closeSidebar());
            }}
          >
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Shopping List" />
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

          <ListItemButton
            selected={activeView === "reports"}
            onClick={() => {
              dispatch(setActiveView("reports"));
              dispatch(closeSidebar());
            }}
          >
            <ListItemIcon>
              <AssessmentIcon />
            </ListItemIcon>
            <ListItemText primary="Reports" />
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
            <ListItemText primary="Clear List" sx={{ color: "error.main" }} />
          </ListItemButton>

        </List>
      </Box>

      <Box sx={{ marginTop: "auto", padding: 3 }}>
        {email && (
          <Typography
            variant="body2"
            sx={{ marginBottom: 1, wordBreak: "break-word", opacity: 0.7 }}
          >
            {email}
          </Typography>
        )}

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
        <DialogTitle>Clear the shopping list?</DialogTitle>
        <DialogContent>
          This will permanently delete all {total} items on this month's list. This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={() => deleteAllMutation.mutate()}>
            Clear list
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
          The shopping list is already empty.
        </Alert>
      </Snackbar>
    </>
  );
}

export default Sidebar;