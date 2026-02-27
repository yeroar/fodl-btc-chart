import { Group, Path, Skia, type SkRect } from "@shopify/react-native-skia";
import { memo } from "react";
import {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { CoordParams, NormalizedPoint } from "./types";
import { generateSmoothPath } from "./utils";

type AnimatedChartLineProps = {
  fromSmoothPoints: SharedValue<NormalizedPoint[]>;
  fromDetailedPoints: SharedValue<NormalizedPoint[]>;
  toSmoothPoints: SharedValue<NormalizedPoint[]>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  isActive: SharedValue<boolean>;
  rangeTransition: SharedValue<number>;
  clipRect?: SkRect;
  color: string;
  containerHeight: number;
  // For animated clipping (smooth Android performance)
  animatedClipX?: SharedValue<number>;
  clipSide?: "left" | "right"; // Which side of animatedClipX to show
  chartBounds?: { left: number; right: number; top: number; bottom: number };
  showLine?: boolean;
  // External interaction progress (e.g. spring-driven from rolling cursor)
  // When provided, overrides the internal withTiming-based interactionProgress
  externalInteractionProgress?: SharedValue<number>;
};

// Animated chart line that morphs between smooth and detailed views
// Implements dual-axis interpolation for simultaneous range and interaction transitions
// Uses SharedValues for thread-safe access to from/to points - eliminates jump on timeframe change
export const AnimatedChartLine = memo(function AnimatedChartLine({
  fromSmoothPoints,
  fromDetailedPoints,
  toSmoothPoints,
  toDetailedPoints,
  coordParams,
  isActive,
  rangeTransition,
  clipRect,
  color,
  containerHeight,
  animatedClipX,
  clipSide,
  chartBounds,
  showLine = true,
  externalInteractionProgress,
}: AnimatedChartLineProps) {
  // Interaction progress: 0 = smooth view, 1 = detailed view
  const internalInteractionProgress = useSharedValue(0);

  // Smooth eased transition for interaction (scrubbing) - no bounce
  // Uses SharedValue directly for instant UI thread response (no JS thread delay)
  // Only used when no external progress is provided
  useAnimatedReaction(
    () => isActive.value,
    (active) => {
      if (externalInteractionProgress) return; // skip when externally controlled
      internalInteractionProgress.value = withTiming(active ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    },
    [externalInteractionProgress]
  );

  const interactionProgress = externalInteractionProgress ?? internalInteractionProgress;

  // Create animated clip rect from SharedValue (for smooth Android performance)
  // Always returns a valid rect - uses full bounds as fallback when not actively clipping
  const animatedClipRect = useDerivedValue(() => {
    if (!animatedClipX || !chartBounds) {
      // Return a large rect that clips nothing as fallback
      return Skia.XYWHRect(0, 0, 10000, 10000);
    }

    if (clipSide === "left") {
      // Show content LEFT of animatedClipX
      return Skia.XYWHRect(
        chartBounds.left,
        chartBounds.top,
        animatedClipX.value - chartBounds.left,
        chartBounds.bottom - chartBounds.top
      );
    } else {
      // Show content RIGHT of animatedClipX
      return Skia.XYWHRect(
        animatedClipX.value,
        chartBounds.top,
        chartBounds.right - animatedClipX.value,
        chartBounds.bottom - chartBounds.top
      );
    }
  }, [chartBounds, clipSide]);

  // Create interpolated path using dual-axis interpolation
  // This handles both range changes (timeframe switches) and interaction changes (scrubbing) simultaneously
  // Reading from SharedValues on the UI thread ensures atomic access - no race conditions
  const animatedPath = useDerivedValue(() => {
    // Cap morph at 75% to keep the line smooth even when fully scrubbing
    const tInteraction = Math.min(interactionProgress.value, 0.75);
    const tRange = rangeTransition.value;

    // Read from SharedValues (thread-safe on UI thread)
    const fromSmooth = fromSmoothPoints.value;
    const fromDetailed = fromDetailedPoints.value;
    const toSmooth = toSmoothPoints.value;
    const toDetailed = toDetailedPoints.value;

    // Early exit if no data
    if (toDetailed.length === 0) return "";

    const { chartLeft, chartBottom, dotMargin, usableWidth, usableHeight } = coordParams;

    // Convert normalized (0-1) to pixel coordinates - worklet-safe
    const normalizedToPixel = (norm: NormalizedPoint): { x: number; y: number } => {
      "worklet";
      return {
        x: chartLeft + norm.x * usableWidth,
        y: chartBottom - dotMargin - norm.y * usableHeight,
      };
    };

    const interpolatedPoints: Array<{ x: number; y: number }> = [];
    const pointCount = toDetailed.length;

    for (let i = 0; i < pointCount; i++) {
      const toDetailedNorm = toDetailed[i];
      const toSmoothNorm = toSmooth[i];

      if (!toDetailedNorm || !toSmoothNorm) continue;

      // Use "to" as fallback if "from" doesn't have enough points (first load)
      const fromDetailedNorm = fromDetailed[i] ?? toDetailedNorm;
      const fromSmoothNorm = fromSmooth[i] ?? toSmoothNorm;

      // Step 1: Calculate target in TO dataset (Smooth vs Detailed based on interaction)
      const toTargetNormX = toSmoothNorm.x + (toDetailedNorm.x - toSmoothNorm.x) * tInteraction;
      const toTargetNormY = toSmoothNorm.y + (toDetailedNorm.y - toSmoothNorm.y) * tInteraction;

      // Step 2: Calculate target in FROM dataset (Smooth vs Detailed based on interaction)
      const fromTargetNormX =
        fromSmoothNorm.x + (fromDetailedNorm.x - fromSmoothNorm.x) * tInteraction;
      const fromTargetNormY =
        fromSmoothNorm.y + (fromDetailedNorm.y - fromSmoothNorm.y) * tInteraction;

      // Step 3: Morph between FROM and TO based on range transition (in normalized space)
      const finalNormX = fromTargetNormX + (toTargetNormX - fromTargetNormX) * tRange;
      const finalNormY = fromTargetNormY + (toTargetNormY - fromTargetNormY) * tRange;

      // Convert to pixel coordinates
      interpolatedPoints.push(normalizedToPixel({ x: finalNormX, y: finalNormY }));
    }

    // Calculate smoothing passes based on interaction state
    // tInteraction = 0 (not scrubbing) → 3 passes (smooth)
    // tInteraction = 1 (scrubbing) → 0 passes (show detail)
    const smoothingPasses = Math.round(3 * (1 - tInteraction));

    return generateSmoothPath(interpolatedPoints, containerHeight, smoothingPasses);
  }, [coordParams, containerHeight]);

  // Use animated clip if available, otherwise fall back to static clipRect
  const effectiveClip = animatedClipX && chartBounds && clipSide ? animatedClipRect : clipRect;

  return (
    <Group clip={effectiveClip} opacity={showLine ? 1 : 0}>
      <Path path={animatedPath} style="stroke" strokeWidth={2} color={color} />
    </Group>
  );
});
