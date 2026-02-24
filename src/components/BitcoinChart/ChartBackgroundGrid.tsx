import {
  DashPathEffect,
  Group,
  LinearGradient,
  Skia,
  Line as SkiaLine,
  vec,
} from "@shopify/react-native-skia";
import { memo, useMemo } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import type { ChartBounds } from "victory-native";

import { AnimatedAreaMask } from "./AnimatedAreaMask";
import type { CoordParams, NormalizedPoint } from "./types";

// Reference: DOT_SPACING = 8 in reference implementation
const GRID_DOT_SPACING = 8;

// Colors from reference implementation
const CROSSHAIR_COLOR = "rgba(232, 190, 17, 1)"; // yellow['400']
const YELLOW_FILL = "rgba(255, 221, 51, 1)"; // yellow['300'] - same as background
const SCRUBBED_LEFT_DOT_COLOR = "#D1A300"; // solid color for dots left of crosshair when scrubbing

// Dot gradient colors (top to bottom) - applies to active dots
const GRADIENT_COLORS = ["#FFDD33", "#E8BE11", "#D1A300"];

// Radius for angular/radial gradient fade from endpoint (1D non-scrubbed state)
const ENDPOINT_FADE_RADIUS = 60;

// Radius for angular/radial gradient fade from crosshair when scrubbing
const SCRUB_FADE_RADIUS = 150;

type ChartBackgroundGridProps = {
  chartBounds: ChartBounds;
  clipX?: number;
  clipY?: number;
  isActive: SharedValue<boolean>;
  fromSmoothPoints: SharedValue<NormalizedPoint[]>;
  fromDetailedPoints: SharedValue<NormalizedPoint[]>;
  toSmoothPoints: SharedValue<NormalizedPoint[]>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  rangeTransition: SharedValue<number>;
  lineEndX?: number; // X position where the line ends (for 1D padding)
  is1DTimeframe?: boolean; // Whether we're in 1D timeframe (for angular gradient from endpoint)
  // SharedValues for animated crosshairs (avoids JS thread delay on Android)
  crosshairXPosition?: SharedValue<number>;
  crosshairMatchedIndex?: SharedValue<number>;
  chartDataLength?: number;
};

// Animated crosshairs component that uses SharedValues directly
const AnimatedCrosshairs = memo(function AnimatedCrosshairs({
  chartBounds,
  crosshairXPosition,
  crosshairMatchedIndex,
  toDetailedPoints,
  coordParams,
  chartDataLength,
}: {
  chartBounds: ChartBounds;
  crosshairXPosition: SharedValue<number>;
  crosshairMatchedIndex: SharedValue<number>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  chartDataLength: number;
}) {
  // Calculate Y position from matchedIndex (same logic as ToolTip)
  const crosshairY = useDerivedValue(() => {
    const victoryIdx = crosshairMatchedIndex.value;
    const detailed = toDetailedPoints.value;

    if (detailed.length === 0 || chartDataLength === 0) return 0;
    if (victoryIdx < 0) return 0;

    // Map Victory's index to our 288-point array
    const mappedIdx = Math.round(
      (victoryIdx / Math.max(chartDataLength - 1, 1)) * (detailed.length - 1)
    );
    const clampedIdx = Math.min(Math.max(0, mappedIdx), detailed.length - 1);

    const norm = detailed[clampedIdx];
    if (!norm) return 0;

    return coordParams.chartBottom - coordParams.dotMargin - norm.y * coordParams.usableHeight;
  }, [coordParams, chartDataLength]);

  // Derived values for line endpoints
  const verticalP1 = useDerivedValue(() => vec(crosshairXPosition.value, chartBounds.top));
  const verticalP2 = useDerivedValue(() => vec(crosshairXPosition.value, chartBounds.bottom));
  const horizontalP1 = useDerivedValue(() => vec(chartBounds.left, crosshairY.value));
  const horizontalP2 = useDerivedValue(() => vec(chartBounds.right, crosshairY.value));

  return (
    <Group>
      {/* Vertical crosshair line */}
      <SkiaLine
        p1={verticalP1}
        p2={verticalP2}
        strokeWidth={2}
        color={CROSSHAIR_COLOR}
        strokeCap="round"
      />
      {/* Horizontal crosshair line */}
      <SkiaLine
        p1={horizontalP1}
        p2={horizontalP2}
        strokeWidth={2}
        color={CROSSHAIR_COLOR}
        strokeCap="round"
      />
    </Group>
  );
});

// Animated scrubbed dots that use SharedValue for clip position
const AnimatedScrubbedDots = memo(function AnimatedScrubbedDots({
  chartBounds,
  crosshairXPosition,
  dotPositions,
}: {
  chartBounds: ChartBounds;
  crosshairXPosition: SharedValue<number>;
  dotPositions: number[];
}) {
  const topOffset = chartBounds.top + 1;

  // Create animated clip rect that follows crosshair position
  const clipRect = useDerivedValue(() => {
    return Skia.XYWHRect(
      chartBounds.left,
      chartBounds.top,
      crosshairXPosition.value - chartBounds.left,
      chartBounds.bottom - chartBounds.top
    );
  }, [chartBounds]);

  return (
    <Group clip={clipRect}>
      {/* Solid colored dots (visible only left of crosshair via clip) */}
      {dotPositions.map((x, index) => (
        <SkiaLine
          key={`solid-dot-${index}`}
          p1={vec(x, topOffset)}
          p2={vec(x, chartBounds.bottom)}
          strokeWidth={2}
          color={SCRUBBED_LEFT_DOT_COLOR}
          strokeCap="round"
        >
          <DashPathEffect intervals={[0.1, GRID_DOT_SPACING - 0.1]} />
        </SkiaLine>
      ))}
    </Group>
  );
});

export const ChartBackgroundGrid = memo(function ChartBackgroundGrid({
  chartBounds,
  clipX,
  clipY,
  isActive,
  fromSmoothPoints,
  fromDetailedPoints,
  toSmoothPoints,
  toDetailedPoints,
  coordParams,
  rangeTransition,
  lineEndX,
  is1DTimeframe,
  crosshairXPosition,
  crosshairMatchedIndex,
  chartDataLength,
}: ChartBackgroundGridProps) {
  // Use animated approach if SharedValues are provided
  const useAnimatedApproach =
    crosshairXPosition !== undefined &&
    crosshairMatchedIndex !== undefined &&
    chartDataLength !== undefined;

  // Generate static dot positions (doesn't depend on scrub state)
  const dotPositions = useMemo(() => {
    const rightBound = is1DTimeframe && lineEndX ? lineEndX : chartBounds.right;
    const positions: number[] = [];
    for (let x = chartBounds.left; x <= rightBound; x += GRID_DOT_SPACING) {
      positions.push(x);
    }
    return positions;
  }, [chartBounds.left, chartBounds.right, is1DTimeframe, lineEndX]);

  // Calculate opacity for each dot position (for gradient dots)
  // This is used for the fade effect from endpoint (1D) or from crosshair (scrubbing)
  // Note: Reading isActive.value here works because re-render happens on state change
  const gradientDots = useMemo(() => {
    const isActiveValue = isActive.value;
    const is1DNonScrubbed = is1DTimeframe && !isActiveValue && lineEndX !== undefined;

    if (isActiveValue && useAnimatedApproach) {
      // When scrubbing with animated approach: gradient dots have fade from right edge
      // The solid color overlay (AnimatedScrubbedDots) handles the left side
      return dotPositions.map((x) => {
        // All dots at full opacity - the animated clip handles the color change
        return { x, opacity: 1 };
      });
    } else if (isActiveValue && clipX !== undefined) {
      // Fallback scrubbing state (no SharedValues): use clipX from props
      return dotPositions.map((x) => {
        if (x <= clipX) {
          return { x, opacity: 1, useGradient: false };
        } else {
          const distFromCrosshair = x - clipX;
          const opacity = Math.max(0.15, 1 - (distFromCrosshair / SCRUB_FADE_RADIUS) * 0.85);
          return { x, opacity, useGradient: true };
        }
      });
    } else if (is1DNonScrubbed && lineEndX !== undefined) {
      // 1D NON-SCRUBBED STATE: Angular gradient from endpoint
      const fadeStartX = lineEndX - ENDPOINT_FADE_RADIUS;
      return dotPositions.map((x) => {
        if (x <= fadeStartX) {
          return { x, opacity: 1 };
        } else {
          const distFromEndpoint = lineEndX - x;
          const opacity = Math.max(0, Math.min(1, distFromEndpoint / ENDPOINT_FADE_RADIUS));
          return { x, opacity };
        }
      });
    } else {
      // NON-SCRUBBED STATE: Full opacity gradient
      return dotPositions.map((x) => ({ x, opacity: 1 }));
    }
  }, [dotPositions, isActive.value, clipX, is1DTimeframe, lineEndX, useAnimatedApproach]);

  const topOffset = chartBounds.top + 1;

  return (
    <Group>
      {/* Base layer: Gradient dots */}
      {gradientDots.map((dot, index) => {
        // For fallback mode (no animated approach), check useGradient flag
        const dotWithFlag = dot as { x: number; opacity: number; useGradient?: boolean };
        if (dotWithFlag.useGradient === false) {
          // Fallback solid color dot
          return (
            <SkiaLine
              key={`dot-${index}`}
              p1={vec(dot.x, topOffset)}
              p2={vec(dot.x, chartBounds.bottom)}
              strokeWidth={2}
              opacity={dot.opacity}
              color={SCRUBBED_LEFT_DOT_COLOR}
              strokeCap="round"
            >
              <DashPathEffect intervals={[0.1, GRID_DOT_SPACING - 0.1]} />
            </SkiaLine>
          );
        }
        return (
          <SkiaLine
            key={`dot-${index}`}
            p1={vec(dot.x, topOffset)}
            p2={vec(dot.x, chartBounds.bottom)}
            strokeWidth={2}
            opacity={dot.opacity}
            strokeCap="round"
          >
            <LinearGradient
              start={vec(dot.x, topOffset)}
              end={vec(dot.x, chartBounds.bottom)}
              colors={GRADIENT_COLORS}
            />
            <DashPathEffect intervals={[0.1, GRID_DOT_SPACING - 0.1]} />
          </SkiaLine>
        );
      })}

      {/* Animated solid-color overlay for scrubbing (clips to left of crosshair) */}
      {isActive.value && useAnimatedApproach && crosshairXPosition && (
        <AnimatedScrubbedDots
          chartBounds={chartBounds}
          crosshairXPosition={crosshairXPosition}
          dotPositions={dotPositions}
        />
      )}

      {/* Animated yellow fill over the area under the line - masks dots below the line */}
      {/* Background is solid yellow, so mask uses solid yellow to blend */}
      <AnimatedAreaMask
        fromSmoothPoints={fromSmoothPoints}
        fromDetailedPoints={fromDetailedPoints}
        toSmoothPoints={toSmoothPoints}
        toDetailedPoints={toDetailedPoints}
        coordParams={coordParams}
        isActive={isActive}
        rangeTransition={rangeTransition}
        color={YELLOW_FILL}
      />

      {/* Animated crosshairs using SharedValues (for smooth Android performance) */}
      {isActive.value && useAnimatedApproach && crosshairXPosition && crosshairMatchedIndex && (
        <AnimatedCrosshairs
          chartBounds={chartBounds}
          crosshairXPosition={crosshairXPosition}
          crosshairMatchedIndex={crosshairMatchedIndex}
          toDetailedPoints={toDetailedPoints}
          coordParams={coordParams}
          chartDataLength={chartDataLength}
        />
      )}

      {/* Fallback static crosshairs (when SharedValues not provided) */}
      {!useAnimatedApproach && isActive.value && clipX !== undefined && (
        <SkiaLine
          p1={vec(clipX, chartBounds.top)}
          p2={vec(clipX, chartBounds.bottom)}
          strokeWidth={2}
          color={CROSSHAIR_COLOR}
          strokeCap="round"
        />
      )}
      {!useAnimatedApproach && isActive.value && clipY !== undefined && (
        <SkiaLine
          p1={vec(chartBounds.left, clipY)}
          p2={vec(chartBounds.right, clipY)}
          strokeWidth={2}
          color={CROSSHAIR_COLOR}
          strokeCap="round"
        />
      )}
    </Group>
  );
});
