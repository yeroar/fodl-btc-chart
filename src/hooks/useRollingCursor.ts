import { useEffect } from "react";
import {
  Easing,
  type SharedValue,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type UseRollingCursorParams = {
  isActive: SharedValue<boolean>;
  matchedIndex: SharedValue<number>;
  xPosition: SharedValue<number>;
  dataLength: number;
  chartLeft: number;
  usableWidth: number;
};

type UseRollingCursorReturn = {
  /** Float index (e.g. 42.7) — springs on touch/release, instant during scrub */
  visualIndex: SharedValue<number>;
  /** Pixel X position derived from visualIndex */
  visualXPosition: SharedValue<number>;
  /** True while touching OR during snap-back spring */
  isVisuallyActive: SharedValue<boolean>;
  /** Spring-driven morph: 0=smooth, 1=detailed. Soft spring on touch, back on release */
  interactionMorphProgress: SharedValue<number>;
};

// Easing curves for "slow-fast-slow" feel
const EASE_IN_OUT = Easing.inOut(Easing.quad);

// Touch start: organic glide to finger
const TOUCH_START_TIMING = { duration: 400, easing: EASE_IN_OUT };
// Release: snap back to end
const RELEASE_TIMING = { duration: 400, easing: EASE_IN_OUT };
// Morph timing for smooth↔detailed transition (matches cursor timing)
const MORPH_IN_TIMING = { duration: 400, easing: EASE_IN_OUT };
const MORPH_OUT_TIMING = { duration: 400, easing: EASE_IN_OUT };

export function useRollingCursor({
  isActive,
  matchedIndex,
  xPosition,
  dataLength,
  chartLeft,
  usableWidth,
}: UseRollingCursorParams): UseRollingCursorReturn {
  const visualIndex = useSharedValue(Math.max(0, dataLength - 1));
  const isReturning = useSharedValue(false);
  const hasArrived = useSharedValue(true);
  const interactionMorphProgress = useSharedValue(0);

  // Detect touch start / release transitions
  useAnimatedReaction(
    () => isActive.value,
    (active, prevActive) => {
      if (active && !prevActive) {
        // Touch start: spring from rest (end) to touched position
        // Compute target index from pixel position (index-proportional, matching chart line)
        // NOT from matchedIndex (Victory uses timestamp-proportional mapping which diverges
        // on 1Y/ALL when data density is uneven, e.g. hourly recent + daily older)
        hasArrived.value = false;
        isReturning.value = false;

        const normalizedX = Math.max(
          0,
          Math.min(
            (xPosition.value - chartLeft) / Math.max(usableWidth, 1),
            1
          )
        );
        const targetIndex = normalizedX * (dataLength - 1);

        visualIndex.value = withTiming(
          targetIndex,
          TOUCH_START_TIMING,
          (finished) => {
            if (finished) {
              hasArrived.value = true;
            }
          }
        );

        // Start smooth→detailed morph
        interactionMorphProgress.value = withTiming(1, MORPH_IN_TIMING);
      } else if (!active && prevActive) {
        // Release: snap back + morph back simultaneously
        hasArrived.value = false;
        isReturning.value = true;

        visualIndex.value = withTiming(
          Math.max(0, dataLength - 1),
          RELEASE_TIMING,
        );

        // Morph back to smooth in parallel; isReturning clears when morph finishes
        // (morph duration >= snap-back, so it's the last to complete)
        interactionMorphProgress.value = withTiming(0, MORPH_OUT_TIMING, (finished) => {
          if (finished) {
            isReturning.value = false;
          }
        });
      }
    },
    [dataLength]
  );

  // When data length changes (timeframe switch), reset all animation state
  useEffect(() => {
    cancelAnimation(visualIndex);
    cancelAnimation(interactionMorphProgress);
    visualIndex.value = Math.max(0, dataLength - 1);
    interactionMorphProgress.value = 0;
    hasArrived.value = true;
    isReturning.value = false;
  }, [dataLength]);

  // During scrub: track finger position
  // Before arrival: retarget the glide animation to follow moving finger
  // After arrival: track sub-pixel 1:1
  // Uses pixel→index conversion (index-proportional, matching the chart line coordinate system)
  useAnimatedReaction(
    () => xPosition.value,
    () => {
      if (!isActive.value) return;

      // Convert pixel position to continuous float index
      const normalizedX = Math.max(
        0,
        Math.min(
          (xPosition.value - chartLeft) / Math.max(usableWidth, 1),
          1
        )
      );
      const targetIndex = normalizedX * (dataLength - 1);

      if (hasArrived.value) {
        // Post-arrival: instant 1:1 tracking
        cancelAnimation(visualIndex);
        visualIndex.value = targetIndex;
      } else {
        // Mid-glide: retarget with spring (preserves velocity, no stutter)
        visualIndex.value = withSpring(
          targetIndex,
          { damping: 30, stiffness: 200, mass: 0.5 },
          (finished) => {
            if (finished) {
              hasArrived.value = true;
            }
          }
        );
      }
    },
    [chartLeft, usableWidth, dataLength]
  );

  // Derive pixel X position from visualIndex (index-proportional, matches chart line)
  const visualXPosition = useDerivedValue(() => {
    const maxIdx = Math.max(dataLength - 1, 1);
    const normalizedX = Math.min(visualIndex.value / maxIdx, 1);
    return chartLeft + normalizedX * usableWidth;
  }, [dataLength, chartLeft, usableWidth]);

  // isVisuallyActive: active while touching OR during snap-back
  const isVisuallyActive = useDerivedValue(() => {
    return isActive.value || isReturning.value;
  }, []);

  return {
    visualIndex,
    visualXPosition,
    isVisuallyActive,
    interactionMorphProgress,
  };
}
