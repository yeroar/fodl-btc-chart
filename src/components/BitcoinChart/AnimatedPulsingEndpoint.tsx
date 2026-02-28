import LottieView from "lottie-react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { CoordParams, NormalizedPoint } from "./types";

// Lottie animation is 12x12
const LOTTIE_SIZE = 24;

type AnimatedPulsingEndpointProps = {
  fromSmoothPoints: SharedValue<NormalizedPoint[]>;
  toSmoothPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  rangeTransition: SharedValue<number>;
  endpointMergeProgress: SharedValue<number>;
};

// Animated pulsing endpoint for 1D view
// Driven by endpointMergeProgress: 0=hidden, 1=fully visible with pulse
// LottieView doesn't respect parent Reanimated opacity on iOS,
// so we mount/unmount via React state + scale for smooth transition
export const AnimatedPulsingEndpoint = memo(function AnimatedPulsingEndpoint({
  fromSmoothPoints,
  toSmoothPoints,
  coordParams,
  rangeTransition,
  endpointMergeProgress,
}: AnimatedPulsingEndpointProps) {
  const lottieRef = useRef<LottieView>(null);
  const [showLottie, setShowLottie] = useState(true);
  const bloomProgress = useSharedValue(1); // local bloom: 0=hidden, 1=full

  // Mount/unmount LottieView + smooth bloom animation on reappear
  const onShow = useCallback(() => {
    bloomProgress.value = 0;
    setTimeout(() => {
      setShowLottie(true);
      bloomProgress.value = withTiming(1, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
      setTimeout(() => lottieRef.current?.play(0), 0);
    }, 50);
  }, [bloomProgress]);
  const onHide = useCallback(() => {
    setShowLottie(false);
    bloomProgress.value = 0;
  }, [bloomProgress]);

  useAnimatedReaction(
    () => endpointMergeProgress.value,
    (curr, prev) => {
      if (curr > 0.85 && (prev ?? 0) <= 0.85) {
        runOnJS(onShow)();
      } else if (curr <= 0.05 && (prev ?? 1) > 0.05) {
        runOnJS(onHide)();
      }
    }
  );

  // X position — endpoint always at last smooth point, morph between FROM/TO via rangeTransition
  const animatedX = useDerivedValue(() => {
    const tRange = rangeTransition.value;
    const fromSmooth = fromSmoothPoints.value;
    const toSmooth = toSmoothPoints.value;

    if (toSmooth.length === 0) return 0;

    const fromLast = fromSmooth[fromSmooth.length - 1];
    const toLast = toSmooth[toSmooth.length - 1];
    if (!toLast) return 0;

    const fromX = fromLast?.x ?? toLast.x;
    const finalNormX = fromX + (toLast.x - fromX) * tRange;

    return coordParams.chartLeft + finalNormX * coordParams.usableWidth;
  }, [coordParams]);

  // Y position — same approach, smooth points only
  const animatedY = useDerivedValue(() => {
    const tRange = rangeTransition.value;
    const fromSmooth = fromSmoothPoints.value;
    const toSmooth = toSmoothPoints.value;

    if (toSmooth.length === 0) return 0;

    const fromLast = fromSmooth[fromSmooth.length - 1];
    const toLast = toSmooth[toSmooth.length - 1];
    if (!toLast) return 0;

    const fromY = fromLast?.y ?? toLast.y;
    const finalNormY = fromY + (toLast.y - fromY) * tRange;

    return coordParams.chartBottom - coordParams.dotMargin - finalNormY * coordParams.usableHeight;
  }, [coordParams]);

  const animatedStyle = useAnimatedStyle(() => {
    const bloom = bloomProgress.value;
    return {
      position: "absolute" as const,
      left: animatedX.value - LOTTIE_SIZE / 2,
      top: animatedY.value - LOTTIE_SIZE / 2,
      width: LOTTIE_SIZE,
      height: LOTTIE_SIZE,
      transform: [{ scale: 0.5 + bloom * 0.5 }],
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      {showLottie && (
        <LottieView
          ref={lottieRef}
          source={require("../../../assets/animations/pulser.json")}
          style={{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }}
          autoPlay
          loop
        />
      )}
    </Animated.View>
  );
});
