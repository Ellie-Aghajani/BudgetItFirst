import { Button, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setFilter, setSelectedCategoryId } from "../store/uiSlice";
import type { Filter } from "../store/uiSlice";
import { fetchCategories } from "../api/categories";

// The stored values stay the same; only what the user sees changed.
const options: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "To buy" },
  { value: "completed", label: "Bought" },
];

function FilterBar() {
  const dispatch = useAppDispatch();
  const filter = useAppSelector((state) => state.ui.filter);
  const selectedCategoryId = useAppSelector(
    (state) => state.ui.selectedCategoryId,
  );

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        justifyContent: "center",
        width: "100%",
        flexWrap: "wrap",
        rowGap: 1,
      }}
    >
      {options.map((option) => (
        <Button
          size="small"
          key={option.value}
          variant={filter === option.value ? "contained" : "outlined"}
          color={filter === option.value ? "primary" : "inherit"}
          onClick={() => {
            dispatch(setFilter(option.value));
            dispatch(setSelectedCategoryId(null));
          }}
          sx={{ minWidth: 100 }}
        >
          {option.label}
        </Button>
      ))}

      {categories?.map((category) => (
        <Button
          size="small"
          key={category.id}
          variant={selectedCategoryId === category.id ? "contained" : "outlined"}
          color={selectedCategoryId === category.id ? "primary" : "inherit"}
          onClick={() =>
            dispatch(
              setSelectedCategoryId(
                selectedCategoryId === category.id ? null : category.id,
              ),
            )
          }
          sx={{ minWidth: 100 }}
        >
          {category.name}
        </Button>
      ))}
    </Stack>
  );
}

export default FilterBar;
