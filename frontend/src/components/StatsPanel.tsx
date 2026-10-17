import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Card,
  Stack,
  Typography,
  Avatar,
  TextField,
  IconButton,
} from "@mui/material";
import type { Theme as Theme } from "@mui/material/styles";
import BarChartIcon from "@mui/icons-material/BarChart";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckIcon from "@mui/icons-material/Check";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import EditIcon from "@mui/icons-material/Edit";
import { fetchTodos } from "../api/todos";
import { formatCurrency } from "../utils/currency";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setAffirmation } from "../store/uiSlice";

const AFFIRMATION_MAX_LENGTH = 60;

function StatsPanel() {
  const dispatch = useAppDispatch();
  const affirmation = useAppSelector((state) => state.ui.affirmation);
  const [isEditingAffirmation, setIsEditingAffirmation] = useState(false);
  const [draftAffirmation, setDraftAffirmation] = useState(affirmation);

  const { data: todos } = useQuery({
    queryKey: ["todos"],
    queryFn: fetchTodos,
  });

  const total = todos?.length ?? 0;
  const completedCount = todos?.filter((t) => t.isComplete).length ?? 0;
  const remainingCount = total - completedCount;
  const estimatedTotal = todos?.reduce((sum, t) => sum + t.estimatedCost, 0) ?? 0;

  const stats = [
    {
      label: "Total Items",
      value: total,
      color: (t: Theme) => t.palette.stats.total,
      icon: <CheckIcon fontSize="small" />,
    },
    {
      label: "Bought",
      value: completedCount,
      color: (t: Theme) => t.palette.stats.completed,
      icon: <DoneAllIcon fontSize="small" />,
    },
    {
      label: "To Buy",
      value: remainingCount,
      color: (t: Theme) => t.palette.stats.remaining,
      icon: <ScheduleIcon fontSize="small" />,
    },
    {
      label: "List Estimate",
      value: formatCurrency(estimatedTotal),
      color: (t: Theme) => t.palette.stats.total,
      icon: <ShoppingCartIcon fontSize="small" />,
    },
  ];

  function handleAffirmationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (draftAffirmation.trim()) {
      dispatch(setAffirmation(draftAffirmation.trim()));
    }
    setIsEditingAffirmation(false);
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        "@media (min-width: 600px) and (max-width: 1023px)": {
          flexDirection: "row",
        },
      }}
    >
      {/* Sized ~30% shorter than before: less padding, tighter rows, 24px avatars. */}
      <Card sx={{ padding: 2, flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", marginBottom: 1 }}
        >
          <BarChartIcon color="primary" />
          <Typography variant="h2" sx={{ textTransform: "none" }}>
            Quick Stats
          </Typography>
        </Stack>

        <Stack spacing={1}>
          {stats.map((stat) => (
            <Stack
              key={stat.label}
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Avatar
                  sx={{ width: 24, height: 24, backgroundColor: stat.color, "& svg": { fontSize: 16 } }}
                >
                  {stat.icon}
                </Avatar>
                <Typography variant="body2">{stat.label}</Typography>
              </Stack>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {stat.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Card>

      <Card
        sx={{
          padding: 2,
          flex: 1,
          minWidth: 0,
          minHeight: 126,
          textAlign: "center",
          backgroundColor: (t) => t.palette.highlight.main,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
           alignItems: "center",
        }}
      >
        <AutoAwesomeIcon color="primary" />

        {isEditingAffirmation ? (
          <form onSubmit={handleAffirmationSubmit}>
            <TextField
              size="small"
              value={draftAffirmation}
              onChange={(e) =>
                setDraftAffirmation(
                  e.target.value.slice(0, AFFIRMATION_MAX_LENGTH),
                )
              }
              autoFocus
              fullWidth
              helperText={`${draftAffirmation.length}/${AFFIRMATION_MAX_LENGTH}`}
              sx={{ marginTop: 1 }}
            />
            <IconButton type="submit" size="small" sx={{ marginTop: 1 }}>
              <CheckIcon fontSize="small" />
            </IconButton>
          </form>
        ) : (
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              marginTop: 1,
              cursor: "pointer",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
            onClick={() => {
              setDraftAffirmation(affirmation);
              setIsEditingAffirmation(true);
            }}
          >
            {affirmation}
            <EditIcon
              fontSize="inherit"
              sx={{ marginLeft: 0.5, verticalAlign: "middle" }}
            />
          </Typography>
        )}

        <FavoriteBorderIcon color="primary" sx={{ marginTop: 1 }} />
      </Card>
    </Box>
  );
}

export default StatsPanel;
