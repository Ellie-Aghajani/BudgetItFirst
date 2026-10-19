import { Box, Tooltip, Typography, useTheme } from "@mui/material";
import { formatCurrency } from "../utils/currency";
import { REMAINING_COLOR } from "../utils/categoryColors";

export interface DonutSlice {
  key: number | string;
  name: string;
  value: number;
  color: string;
  // Draws a red ring outside the slice. The slice keeps its own color.
  isAlert?: boolean;
  // Replaces the default "Name: $X (Y%)" tooltip.
  tooltip?: string;
}

const GAP = 2;
const ALERT_RING_WIDTH = 4;

// A donut drawn as one circle per slice. Each circle's dash covers only its
// slice, offset to start where the previous slice ended. Unlike arc paths,
// this also draws a single 100% slice correctly.
function DonutChart({
  slices,
  remaining = 0,
  remainingLabel = "Left over",
  centerValue,
  centerLabel,
  centerNote,
  centerNoteColor = "text.secondary",
  size = 220,
  highlightedKey = null,
  onSelect,
}: {
  slices: DonutSlice[];
  // A gray slice after the others; 0 draws nothing.
  remaining?: number;
  remainingLabel?: string;
  centerValue: number;
  centerLabel: string;
  centerNote?: string;
  centerNoteColor?: string;
  size?: number;
  highlightedKey?: DonutSlice["key"] | null;
  onSelect?: (key: DonutSlice["key"]) => void;
}) {
  const theme = useTheme();

  // Ring geometry, all derived from size: the red alert ring sits on the
  // outside, then a small gap, then the donut itself.
  const center = size / 2;
  const alertRadius = center - ALERT_RING_WIDTH / 2 - 1;
  const stroke = Math.round(size * 0.15);
  const radius = alertRadius - ALERT_RING_WIDTH / 2 - 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const alertCircumference = 2 * Math.PI * alertRadius;

  const visibleSlices = slices.filter((s) => s.value > 0);
  const total = visibleSlices.reduce((sum, s) => sum + s.value, 0) + remaining;
  const hasGaps = visibleSlices.length + (remaining > 0 ? 1 : 0) > 1;

  // Where each slice starts along the ring: the sum of the slices before it.
  const lengths = visibleSlices.map((s) => (s.value / total) * circumference);
  const starts = lengths.map((_, i) =>
    lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
  );
  const remainingStart = lengths.reduce((sum, l) => sum + l, 0);
  const remainingLength = (remaining / total) * circumference;
  const visible = (length: number) =>
    hasGaps ? Math.max(length - GAP, 1) : length;
  const fade = (key: DonutSlice["key"] | null) =>
    highlightedKey === null || highlightedKey === key ? 1 : 0.35;

  return (
    <Box
      sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel} by category`}
      >
        {/* Start at 12 o'clock instead of 3 o'clock. */}
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total > 0 &&
            visibleSlices.map((slice, i) => {
              const length = visible(lengths[i]);
              return (
                <Tooltip
                  key={slice.key}
                  title={
                    slice.tooltip ??
                    `${slice.name}: ${formatCurrency(slice.value)} (${Math.round((slice.value / total) * 100)}%)`
                  }
                  followCursor
                >
                  <g
                    onClick={onSelect ? () => onSelect(slice.key) : undefined}
                    opacity={fade(slice.key)}
                    style={{
                      cursor: onSelect ? "pointer" : "default",
                      transition: "opacity 150ms",
                    }}
                  >
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={stroke}
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-starts[i]}
                    />
                    {slice.isAlert && (
                      // Same angles as the slice, on a bigger circle: scale the
                      // dash lengths by the ratio of the two circumferences.
                      <circle
                        cx={center}
                        cy={center}
                        r={alertRadius}
                        fill="none"
                        stroke={theme.palette.error.main}
                        strokeWidth={ALERT_RING_WIDTH}
                        strokeLinecap="round"
                        strokeDasharray={`${(length / circumference) * alertCircumference} ${alertCircumference}`}
                        strokeDashoffset={
                          -(starts[i] / circumference) * alertCircumference
                        }
                      />
                    )}
                  </g>
                </Tooltip>
              );
            })}

          {remaining > 0 && (
            <Tooltip
              title={`${remainingLabel}: ${formatCurrency(remaining)}`}
              followCursor
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={REMAINING_COLOR[theme.palette.mode]}
                strokeWidth={stroke}
                strokeDasharray={`${visible(remainingLength)} ${circumference}`}
                strokeDashoffset={-remainingStart}
                opacity={fade(null)}
              />
            </Tooltip>
          )}

          {/* Nothing to show yet: an empty gray ring keeps the layout steady. */}
          {total === 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={theme.palette.divider}
              strokeWidth={stroke}
            />
          )}
        </g>
      </svg>

      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: size >= 200 ? "1.5rem" : "1.125rem",
            lineHeight: 1.2,
          }}
        >
          {formatCurrency(centerValue)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {centerLabel}
        </Typography>
        {centerNote && (
          <Typography
            variant="caption"
            sx={{ color: centerNoteColor, fontWeight: 600 }}
          >
            {centerNote}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function LegendDot({ color }: { color: string }) {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

export default DonutChart;
