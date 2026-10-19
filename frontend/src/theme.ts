import { alpha, createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    highlight: Palette["primary"];
    stats: {
      total: string;
      completed: string;
      remaining: string;
    };
  }

  interface PaletteOptions {
    highlight?: Partial<Palette["primary"]>;
    stats?: Partial<Palette["stats"]>;
  }
}

// Soft tints of the brand and status colors: about 12% of each color over
// white in light mode, and about 20% over the dark paper color in dark mode.
// They tint a white card instead of fighting the teal/navy theme.
export const cardColors = {
  teal:     { light: "#E4F7FA", dark: "#134259" },
  blue:     { light: "#EBF0F6", dark: "#0A3059" },
  green:    { light: "#E2F7F0", dark: "#104148" },
  amber:    { light: "#FEF3E2", dark: "#3E3C31" },
  purple:   { light: "#F1EBFE", dark: "#292E60" },
  rose:     { light: "#FEE8EC", dark: "#3E2941" },
} as const;

export type CardColorName = keyof typeof cardColors;

// Categorical chart colors: 11 slots, checked with a palette validator for
// colorblind-safe separation between neighbors, in both modes (light against
// white, dark against the dark paper color). Assigned in this fixed order.
// With more than 11 categories the order repeats; the legend and tooltips
// still name every slice.
export const chartColors = {
  series: {
    light: [
      "#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300",
      "#6250d6", "#e34948", "#14a3b8", "#c2782a", "#4f6fd6",
    ],
    dark: [
      "#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300",
      "#9085e9", "#e66767", "#1a9db0", "#c27a35", "#6f8de8",
    ],
  },
} as const;

// Plain constants rather than palette keys. SIDEBAR_BG is exported so the
// mobile navbar matches the sidebar it stands in for.
export const SIDEBAR_BG = { light: "#0A2A4A", dark: "#071E36" };
const SUBTLE_SURFACE = { light: "#F8FAFC", dark: "#132A44" };

// Below the "sm" breakpoint (600px). Written out because the theme can't
// read its own breakpoints helper while it's being created.
const PHONE = "@media (max-width: 599.95px)";

export function getTheme(mode: "light" | "dark") {
  const isLight = mode === "light";

  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: 1024,
        xl: 1536,
      },
    },
    palette: {
      mode,
      primary: {
        main: "#067387",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: isLight ? "#004793" : "#5B9BE0",
      },
      success: { main: "#10B981" },
      warning: { main: "#F59E0B" },
      error: { main: "#EF4444" },
      background: {
        default: isLight ? "#F2F7FA" : "#0B1726",
        paper: isLight ? "#FFFFFF" : "#10233A",
      },
      text: {
        primary: isLight ? "#1E293B" : "#E2E8F0",
        secondary: isLight ? "#6B7280" : "#94A3B8",
      },
      divider: isLight ? "#E2E8F0" : "#1E3A5F",
      highlight: {
        main: isLight ? "#E6F7FA" : "#16324F",
      },
      stats: {
        total: "#F59E0B",
        completed: "#10B981",
        remaining: "#21BFD4",
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      h1: {
        fontSize: "2rem",
        lineHeight: "2.5rem",
        fontWeight: 700,
        [PHONE]: {
          fontSize: "1.5rem",
          lineHeight: "2rem",
        },
      },
      h2: {
        fontSize: "1.5rem",
        lineHeight: "2rem",
        fontWeight: 600,
        [PHONE]: {
          fontSize: "1.25rem",
          lineHeight: "1.75rem",
        },
      },
      body1: {
        fontSize: "1rem",
        lineHeight: "1.5rem",
        fontWeight: 400,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
        fontWeight: 500,
      },
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    components: {
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        // Only flat papers (cards, panels) get the border. Menus, popovers
        // and dialogs pass their own elevation, so they keep their shadow.
        variants: [
          {
            props: { variant: "elevation", elevation: 0 },
            style: ({ theme }) => ({
              border: `1px solid ${theme.palette.divider}`,
            }),
          },
        ],
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: 4,
          },
        },
        variants: [
          {
            props: { variant: "outlined" },
            style: ({ theme }) => ({
              borderColor: theme.palette.divider,
              "&:hover": {
                borderColor: theme.palette.text.secondary,
              },
            }),
          },
        ],
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
        // Soft status pills: <Chip color="success|warning|error" />. Text uses
        // the .dark shade: the main colors on a 12% tint are only 2-3:1
        // contrast, below the 4.5:1 that small text needs.
        variants: (["success", "warning", "error"] as const).map((color) => ({
          props: { color, variant: "filled" as const },
          style: ({ theme }: { theme: Theme }) => ({
            backgroundColor: alpha(theme.palette[color].main, 0.12),
            color: isLight ? theme.palette[color].dark : theme.palette[color].light,
          }),
        })),
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: ({ theme }) => ({
            height: 8,
            borderRadius: 999,
            backgroundColor: theme.palette.divider,
          }),
          bar: {
            borderRadius: 999,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.background.paper,
            borderRadius: 8,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.divider,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
            },
          }),
          input: ({ theme }) => ({
            "&:-webkit-autofill": {
              WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
              WebkitTextFillColor: theme.palette.text.primary,
            },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          // Tables scroll sideways on phones; tighter cells mean less scrolling.
          root: {
            [PHONE]: {
              paddingLeft: 8,
              paddingRight: 8,
            },
          },
          head: ({ theme }) => ({
            backgroundColor: SUBTLE_SURFACE[mode],
            color: theme.palette.text.secondary,
            fontSize: "0.875rem",
            fontWeight: 500,
          }),
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: SIDEBAR_BG[mode],
            color: "#E2E8F0",
            border: "none",
            // MUI's defaults for these are dark greys meant for a white
            // background, so on the navy sidebar they follow its light text.
            "& .MuiListItemIcon-root, & .MuiIconButton-root": {
              color: "inherit",
            },
            "& .MuiListItemText-secondary": {
              color: "inherit",
              opacity: 0.7,
            },
            "& .MuiChip-root": {
              color: "inherit",
              backgroundColor: alpha("#FFFFFF", 0.12),
            },
            "& .MuiDivider-root": {
              borderColor: alpha("#FFFFFF", 0.12),
            },
            "& .MuiListItemButton-root": {
              borderRadius: 8,
              marginInline: 8,
            },
            "& .MuiListItemButton-root.Mui-selected, & .MuiListItemButton-root.Mui-selected:hover": {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            },
          }),
        },
      },
    },
  });
}
