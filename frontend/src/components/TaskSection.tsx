import { Alert, AlertTitle, Button, Stack } from "@mui/material";
import { useAppDispatch } from "../store/hooks";
import { setActiveView } from "../store/uiSlice";
import AddTodo from "./AddTodo";
import FilterBar from "./FilterBar";
import TodoList from "./TodoList";

function TaskSection() {
  const dispatch = useAppDispatch();

  return (
    <Stack spacing={2} sx={{ width: "100%", minWidth: 0 }}>
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={() => dispatch(setActiveView("dashboard"))}>
            Add spending
          </Button>
        }
      >
        <AlertTitle>Estimates only</AlertTitle>
        Costs on your shopping list are estimates, used to check your plan against each
        category's budget. They don't count as spending. When you pay, log the real amount
        from the Dashboard.
      </Alert>
      <AddTodo />
      <FilterBar />
      <TodoList />
    </Stack>
  );
}

export default TaskSection;
