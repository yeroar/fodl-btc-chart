import { LinearGradient, Path, vec } from "@shopify/react-native-skia";
import { memo } from "react";
import {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { ChartBounds } from "victory-native";

import type { CoordParams, NormalizedPoint } from "./types";
import { generateAreaPath } from "./utils";

type AnimatedAreaMaskProps = {
  fromSmoothPoints: SharedValue<NormalizedPoint[]>;
  fromDetailedPoints: SharedValue<NormalizedPoint[]>;
  toSmoothPoints: SharedValue<NormalizedPoint[]>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  isActive: SharedValue<boolean>;
  rangeTransition: SharedValue<number>;
  color: string;
  gradientColors?: string[];
  chartBounds?: ChartBounds;
};

// Animated area mask that morphs between smooth and detailed views
// This ensures the area mask always matches the current line position
// Uses SharedValues for thread-safe access to from/to points - eliminates jump on timeframe change
export const AnimatedAreaMask = memo(function AnimatedAreaMask({
  fromSmoothPoints,
  fromDetailedPoints,
  toSmoothPoints,
  toDetailedPoints,
  coordParams,
  isActive,
  rangeTransition,
  color,
  gradientColors,
  chartBounds,
}: AnimatedAreaMaskProps) {
  // Interaction progress: 0 = smooth view, 1 = detailed view
  const interactionProgress = useSharedValue(0);

  // Smooth eased transition for interaction (scrubbing) - no bounce
  // Uses SharedValue directly for instant UI thread response (no JS thread delay)
  useAnimatedReaction(
    () => isActive.value,
    (active) => {
      interactionProgress.value = withTiming(active ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    },
    []
  );

  // Create interpolated area path using dual-axis interpolation
  // Reading from SharedValues on the UI thread ensures atomic access - no race conditions
  const animatedAreaPath = useDerivedValue(() => {
    const tInteraction = interactionProgress.value;
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

    const interpolatedPoints: Array<{ x: number; y: number | null }> = [];
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

    return generateAreaPath(interpolatedPoints, chartBottom, smoothingPasses);
  }, [coordParams]);

  // Use gradient if provided, otherwise fall back to solid color
  if (gradientColors && chartBounds) {
    return (
      <Path path={animatedAreaPath} style="fill">
        <LinearGradient
          start={vec(chartBounds.left, chartBounds.top)}
          end={vec(chartBounds.left, chartBounds.bottom)}
          colors={gradientColors}
        />
      </Path>
    );
  }

  return <Path path={animatedAreaPath} color={color} style="fill" />;
});
