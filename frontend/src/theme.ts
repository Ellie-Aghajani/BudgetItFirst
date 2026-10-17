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

export const cardColors = {
peach:    { light: "#FFD9B3", dark: "#9A6A45" },
yellow:   { light: "#FFF3B0", dark: "#8F8142" },
mint:     { light: "#C8F0DE", dark: "#3F785C" },
blue:     { light: "#CFE3FA", dark: "#426F9F" },
lavender: { light: "#E6DEFA", dark: "#69568F" },
pink:     { light: "#FBD3DE", dark: "#965A6C" },
} as const;

export type CardColorName = keyof typeof cardColors;

// Categorical chart colors, checked for colorblind-safe separation in both
// modes. Assigned in this fixed order — never cycled. Categories past the
// last slot fold into "Other".
export const chartColors = {
  series: {
    light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
    dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
  },
  other: { light: "#9a9994", dark: "#6e7f93" },
} as const;

// Plain constants rather than palette keys: they're only used by the
// overrides below, so they don't need to be on the theme object.
const SIDEBAR_BG = { light: "#0A2A4A", dark: "#071E36" };
const SUBTLE_SURFACE = { light: "#F8FAFC", dark: "#132A44" };

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
        main: "#21BFD4",
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
      },
      h2: {
        fontSize: "1.5rem",
        lineHeight: "2rem",
        fontWeight: 600,
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
