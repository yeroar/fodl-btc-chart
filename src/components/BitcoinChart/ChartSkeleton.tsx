import {
  Canvas,
  DashPathEffect,
  Group,
  LinearGradient,
  Line as SkiaLine,
  vec,
} from "@shopify/react-native-skia";
import { memo, useEffect, useMemo } from "react";
import { View } from "react-native";
import {
  Easing,
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Match the grid dot spacing from ChartBackgroundGrid
const GRID_DOT_SPACING = 8;

// Size of each shimmer wave
const WAVE_SIZE = 150;

// Shimmer loading animation for chart
// Shows the dot grid pattern with two waves: one horizontal (right to left), one vertical (bottom to top)
export const ChartSkeleton = memo(function ChartSkeleton() {
  // Horizontal wave (right to left)
  const horizontalProgress = useSharedValue(1);
  // Vertical wave (bottom to top)
  const verticalProgress = useSharedValue(1);

  useEffect(() => {
    // Horizontal wave: right to left and back (starts at 1, goes to 0, back to 1)
    horizontalProgress.value = withRepeat(
      withTiming(0, {
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true // Reverse (back and forth)
    );

    // Vertical wave: bottom to top and back (starts at 1, goes to 0, back to 1)
    verticalProgress.value = withRepeat(
      withTiming(0, {
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      true // Reverse (back and forth)
    );
  }, [horizontalProgress, verticalProgress]);

  return (
    <View style={{ flex: 1, width: "100%" }}>
      <Canvas style={{ flex: 1 }}>
        <ShimmerGrid horizontalProgress={horizontalProgress} verticalProgress={verticalProgress} />
      </Canvas>
    </View>
  );
});

// Separate component to handle the grid rendering with two-wave shimmer
const ShimmerGrid = memo(function ShimmerGrid({
  horizontalProgress,
  verticalProgress,
}: {
  horizontalProgress: { value: number };
  verticalProgress: { value: number };
}) {
  // Generate dot columns
  const left = 0;
  const right = 420;
  const top = 1;
  const bottom = 600;
  const height = bottom - top;

  const dotColumns = useMemo(() => {
    const columns: number[] = [];
    for (let x = left; x <= right; x += GRID_DOT_SPACING) {
      columns.push(x);
    }
    return columns;
  }, []);

  return (
    <Group>
      {dotColumns.map((x) => (
        <AnimatedDotColumn
          key={`dot-col-${x}`}
          x={x}
          top={top}
          bottom={bottom}
          height={height}
          horizontalProgress={horizontalProgress}
          verticalProgress={verticalProgress}
          totalWidth={right}
        />
      ))}
    </Group>
  );
});

// Individual dot column with two-wave color animation
const AnimatedDotColumn = memo(function AnimatedDotColumn({
  x,
  top,
  bottom,
  height,
  horizontalProgress,
  verticalProgress,
  totalWidth,
}: {
  x: number;
  top: number;
  bottom: number;
  height: number;
  horizontalProgress: { value: number };
  verticalProgress: { value: number };
  totalWidth: number;
}) {
  // Calculate colors based on both waves
  const colors = useDerivedValue(() => {
    // Horizontal wave position (right to left)
    const hWaveCenter = horizontalProgress.value * (totalWidth + WAVE_SIZE * 2) - WAVE_SIZE;
    const hDist = Math.abs(x - hWaveCenter);
    const hIntensity = Math.max(0, 1 - hDist / WAVE_SIZE);

    // Vertical wave position (bottom to top)
    const vWaveCenter = verticalProgress.value * (height + WAVE_SIZE * 2) - WAVE_SIZE;

    // Calculate vertical intensity for top, middle, and bottom of column
    const vDistTop = Math.abs(0 - vWaveCenter);
    const vDistMid = Math.abs(height * 0.45 - vWaveCenter);
    const vDistBottom = Math.abs(height - vWaveCenter);

    const vIntensityTop = Math.max(0, 1 - vDistTop / WAVE_SIZE);
    const vIntensityMid = Math.max(0, 1 - vDistMid / WAVE_SIZE);
    const vIntensityBottom = Math.max(0, 1 - vDistBottom / WAVE_SIZE);

    // Combine both waves - use max to let either wave brighten the dots
    const intensityTop = Math.max(hIntensity, vIntensityTop);
    const intensityMid = Math.max(hIntensity, vIntensityMid);
    const intensityBottom = Math.max(hIntensity, vIntensityBottom);

    // Interpolate colors based on combined intensity
    const topColor = interpolateColor(intensityTop, [0, 1], ["#D4AC00", "#FFDD33"]);
    const midColor = interpolateColor(intensityMid, [0, 1], ["#C99F00", "#E8BE11"]);
    const bottomColor = interpolateColor(intensityBottom, [0, 1], ["#B89200", "#D1A300"]);

    return [topColor, midColor, bottomColor];
  });

  return (
    <SkiaLine p1={vec(x, top)} p2={vec(x, bottom)} strokeWidth={2} strokeCap="round">
      <LinearGradient
        start={vec(x, top)}
        end={vec(x, bottom)}
        colors={colors}
        positions={[0, 0.45, 1]}
      />
      <DashPathEffect intervals={[0.1, GRID_DOT_SPACING - 0.1]} />
    </SkiaLine>
  );
});
