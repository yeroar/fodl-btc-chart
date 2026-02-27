import LottieView from "lottie-react-native";
import { memo, useEffect, useRef } from "react";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MORPH_DETAIL_CAP } from "../../constants/animation";
import type { CoordParams, NormalizedPoint } from "./types";

// Lottie animation is 12x12
const LOTTIE_SIZE = 24;

type AnimatedPulsingEndpointProps = {
  fromSmoothPoints: SharedValue<NormalizedPoint[]>;
  fromDetailedPoints: SharedValue<NormalizedPoint[]>;
  toSmoothPoints: SharedValue<NormalizedPoint[]>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  rangeTransition: SharedValue<number>;
  isActive: boolean;
};

// Animated pulsing endpoint for 1D view when not scrubbing
// Uses Lottie animation positioned absolutely over the chart
// Uses SharedValues to animate position along with the chart line during timeframe transitions
export const AnimatedPulsingEndpoint = memo(function AnimatedPulsingEndpoint({
  fromSmoothPoints,
  fromDetailedPoints,
  toSmoothPoints,
  toDetailedPoints,
  coordParams,
  rangeTransition,
  isActive,
}: AnimatedPulsingEndpointProps) {
  const lottieRef = useRef<LottieView>(null);

  // Interaction progress: 0 = smooth view, 1 = detailed view
  // This ensures the endpoint matches the line position during scrubbing transitions
  const interactionProgress = useSharedValue(0);

  // Start the Lottie animation on mount
  useEffect(() => {
    lottieRef.current?.play();
  }, []);

  // Smooth eased transition for interaction (scrubbing) - matches AnimatedChartLine
  useAnimatedReaction(
    () => isActive,
    (active) => {
      interactionProgress.value = withTiming(active ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    },
    [isActive]
  );

  // Animated X position - uses dual-axis interpolation to match the line exactly
  const animatedX = useDerivedValue(() => {
    const tInteraction = Math.min(interactionProgress.value, MORPH_DETAIL_CAP);
    const tRange = rangeTransition.value;

    const fromSmooth = fromSmoothPoints.value;
    const fromDetailed = fromDetailedPoints.value;
    const toSmooth = toSmoothPoints.value;
    const toDetailed = toDetailedPoints.value;

    if (toSmooth.length === 0) return 0;

    const fromSmoothLast = fromSmooth[fromSmooth.length - 1];
    const fromDetailedLast = fromDetailed[fromDetailed.length - 1];
    const toSmoothLast = toSmooth[toSmooth.length - 1];
    const toDetailedLast = toDetailed[toDetailed.length - 1];

    if (!toSmoothLast || !toDetailedLast) return 0;

    // Use same dual-axis interpolation as AnimatedChartLine
    // Step 1: Calculate target in TO dataset (Smooth vs Detailed based on interaction)
    const toTargetNormX = toSmoothLast.x + (toDetailedLast.x - toSmoothLast.x) * tInteraction;

    // Step 2: Calculate target in FROM dataset (use fallbacks if not available)
    const fromSmoothX = fromSmoothLast?.x ?? toSmoothLast.x;
    const fromDetailedX = fromDetailedLast?.x ?? toDetailedLast.x;
    const fromTargetNormX = fromSmoothX + (fromDetailedX - fromSmoothX) * tInteraction;

    // Step 3: Morph between FROM and TO based on range transition
    const finalNormX = fromTargetNormX + (toTargetNormX - fromTargetNormX) * tRange;

    return coordParams.chartLeft + finalNormX * coordParams.usableWidth;
  }, [coordParams]);

  // Animated Y position - uses dual-axis interpolation to match the line exactly
  const animatedY = useDerivedValue(() => {
    const tInteraction = Math.min(interactionProgress.value, MORPH_DETAIL_CAP);
    const tRange = rangeTransition.value;

    const fromSmooth = fromSmoothPoints.value;
    const fromDetailed = fromDetailedPoints.value;
    const toSmooth = toSmoothPoints.value;
    const toDetailed = toDetailedPoints.value;

    if (toSmooth.length === 0) return 0;

    const fromSmoothLast = fromSmooth[fromSmooth.length - 1];
    const fromDetailedLast = fromDetailed[fromDetailed.length - 1];
    const toSmoothLast = toSmooth[toSmooth.length - 1];
    const toDetailedLast = toDetailed[toDetailed.length - 1];

    if (!toSmoothLast || !toDetailedLast) return 0;

    // Use same dual-axis interpolation as AnimatedChartLine
    // Step 1: Calculate target in TO dataset (Smooth vs Detailed based on interaction)
    const toTargetNormY = toSmoothLast.y + (toDetailedLast.y - toSmoothLast.y) * tInteraction;

    // Step 2: Calculate target in FROM dataset (use fallbacks if not available)
    const fromSmoothY = fromSmoothLast?.y ?? toSmoothLast.y;
    const fromDetailedY = fromDetailedLast?.y ?? toDetailedLast.y;
    const fromTargetNormY = fromSmoothY + (fromDetailedY - fromSmoothY) * tInteraction;

    // Step 3: Morph between FROM and TO based on range transition
    const finalNormY = fromTargetNormY + (toTargetNormY - fromTargetNormY) * tRange;

    return coordParams.chartBottom - coordParams.dotMargin - finalNormY * coordParams.usableHeight;
  }, [coordParams]);

  // Animated style for positioning the Lottie view
  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute" as const,
      // Center the Lottie animation on the endpoint position
      left: animatedX.value - LOTTIE_SIZE / 2,
      top: animatedY.value - LOTTIE_SIZE / 2,
      width: LOTTIE_SIZE,
      height: LOTTIE_SIZE,
    };
  });

  return (
    <Animated.View style={animatedStyle} pointerEvents="none">
      <LottieView
        ref={lottieRef}
        source={require("../../../assets/animations/pulser.json")}
        style={{ width: LOTTIE_SIZE, height: LOTTIE_SIZE }}
        autoPlay
        loop
      />
    </Animated.View>
  );
});
