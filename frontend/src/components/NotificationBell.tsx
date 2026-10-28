import { useEffect, useState } from "react";
import {
  Badge,
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { openCategoryReport } from "../store/uiSlice";
import {
  deleteNotification,
  fetchNotifications,
  isNotificationsEnabled,
  markNotificationRead,
  type BudgetNotification,
} from "../api/notifications";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Budget alerts (80% and 100% of a category) from the notification service.
// It's an extra: if the service is asleep or down, the bell stays quiet and
// the rest of the app works as usual. No error popups.
function NotificationBell() {
  const uid = useAppSelector((state) => state.auth.uid);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const { data: notifications, isPending, isError, error } = useQuery({
    // Per user, so a second account on the same device never sees the
    // first one's cached notifications.
    queryKey: ["notifications", uid],
    queryFn: fetchNotifications,
    enabled: isNotificationsEnabled && uid !== null,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    // On free hosting the service may be waking up; one retry is enough.
    retry: 1,
  });

  useEffect(() => {
    if (isError) console.warn("Notifications unavailable:", error);
  }, [isError, error]);

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (err) => console.warn("Could not mark the notification as read:", err),
  });

  // Optimistic update: the row disappears at once instead of after the
  // round trip. If the request fails, the refetch brings it back.
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", uid] });
      queryClient.setQueryData<BudgetNotification[]>(["notifications", uid], (old) =>
        old?.filter((n) => n.id !== id),
      );
    },
    onError: (err) => console.warn("Could not delete the notification:", err),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!isNotificationsEnabled) return null;

  const unreadCount = notifications?.filter((n) => n.readAt === null).length ?? 0;

  // Opens Reports on the alert's month with its category highlighted.
  function handleClick(notification: BudgetNotification) {
    if (notification.readAt === null) markReadMutation.mutate(notification.id);
    setAnchorEl(null);
    dispatch(
      openCategoryReport({
        categoryId: notification.categoryId,
        year: notification.budgetYear,
        month: notification.budgetMonth,
      }),
    );
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          aria-haspopup="true"
          aria-expanded={anchorEl ? "true" : undefined}
        >
          <Badge badgeContent={unreadCount} color="error" max={9}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "calc(100vw - 32px)", maxHeight: 420 } } }}
      >
        <Box sx={{ paddingX: 2, paddingY: 1 }}>
          <Typography variant="subtitle2">Budget alerts</Typography>
        </Box>

        {isPending && (
          <Typography variant="body2" color="text.secondary" sx={{ paddingX: 2, paddingY: 1.5 }}>
            Checking for alerts…
          </Typography>
        )}

        {isError && (
          <Typography variant="body2" color="text.secondary" sx={{ paddingX: 2, paddingY: 1.5 }}>
            Alerts aren't available right now.
          </Typography>
        )}

        {notifications?.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ paddingX: 2, paddingY: 1.5 }}>
            No alerts yet. We'll let you know when a category reaches 80% of its budget.
          </Typography>
        )}

        {notifications?.map((n) => {
          const isUnread = n.readAt === null;
          return (
            <MenuItem
              key={n.id}
              onClick={() => handleClick(n)}
              sx={{ alignItems: "flex-start", whiteSpace: "normal", gap: 1 }}
            >
              <ListItemIcon sx={{ marginTop: 0.5 }}>
                {n.threshold === 100 ? (
                  <ErrorOutlinedIcon fontSize="small" color="error" />
                ) : (
                  <ReportProblemOutlinedIcon fontSize="small" color="warning" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={n.message}
                secondary={formatDate(n.createdAt)}
                slotProps={{
                  primary: { variant: "body2", sx: { fontWeight: isUnread ? 600 : 400 } },
                }}
              />
              {isUnread && (
                <Box
                  aria-label="Unread"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "primary.main",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
              )}
              <IconButton
                size="small"
                aria-label={`Delete alert for ${n.categoryName}`}
                // Don't let the click also open the report.
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(n.id);
                }}
                sx={{ marginTop: -0.25, flexShrink: 0 }}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export default NotificationBell;
