import {
  Easing,
  type SharedValue,
  cancelAnimation,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type UseRollingCursorParams = {
  enabled: SharedValue<boolean>;
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

// Touch start: slow organic glide to finger (longer duration, ease-in-out)
const TOUCH_START_TIMING = { duration: 600, easing: EASE_IN_OUT };
// Release: snap back to end
const RELEASE_TIMING = { duration: 600, easing: EASE_IN_OUT };
// Morph timing for smooth↔detailed transition (matches cursor timing)
const MORPH_IN_TIMING = { duration: 400, easing: EASE_IN_OUT };
const MORPH_OUT_TIMING = { duration: 400, easing: EASE_IN_OUT };

export function useRollingCursor({
  enabled,
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
      if (!enabled.value) return;

      if (active && !prevActive) {
        // Touch start: spring from rest (end) to touched position
        hasArrived.value = false;
        isReturning.value = false;

        visualIndex.value = withTiming(
          matchedIndex.value,
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

  // During scrub: once initial spring has arrived, track 1:1
  useAnimatedReaction(
    () => matchedIndex.value,
    (idx) => {
      if (!enabled.value) return;
      if (!isActive.value) return;

      if (hasArrived.value) {
        // Cancel any residual spring and track instantly
        cancelAnimation(visualIndex);
        visualIndex.value = idx;
      }
    },
    []
  );

  // Derive pixel X position from visualIndex
  const visualXPosition = useDerivedValue(() => {
    if (!enabled.value) return xPosition.value;

    const maxIdx = Math.max(dataLength - 1, 1);
    const normalizedX = visualIndex.value / maxIdx;
    return chartLeft + normalizedX * usableWidth;
  }, [dataLength, chartLeft, usableWidth]);

  // isVisuallyActive: active while touching OR during snap-back
  const isVisuallyActive = useDerivedValue(() => {
    if (!enabled.value) return isActive.value;
    return isActive.value || isReturning.value;
  }, []);

  return {
    visualIndex,
    visualXPosition,
    isVisuallyActive,
    interactionMorphProgress,
  };
}
