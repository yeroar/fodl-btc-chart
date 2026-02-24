// Theme must be imported first to configure Unistyles
import "./src/theme/install";

import { getBitcoinChartData } from "./src/api/api";
import { AnimatedPulsingEndpoint } from "./src/components/BitcoinChart/AnimatedPulsingEndpoint";
import { AnimatedChartLine } from "./src/components/BitcoinChart/AnimatedChartLine";
import { ChartBackgroundGrid } from "./src/components/BitcoinChart/ChartBackgroundGrid";
import { ChartSkeleton } from "./src/components/BitcoinChart/ChartSkeleton";
import type {
  ChartDataPoint,
  ChartTimeframe,
  CoordParams,
  NormalizedPoint,
} from "./src/components/BitcoinChart/types";
import { FoldButton } from "./src/components/FoldButton";
import { FoldConversionText } from "./src/components/FoldConversionText";
import { FoldPillSelector } from "./src/components/FoldPillSelector";
import { FoldTabBar } from "./src/components/FoldTabBar";
import { FoldTabView } from "./src/components/FoldTabView";
import { FoldText } from "./src/components/FoldText";
import { queryKeys } from "./src/constants/queryKeys";
import { useExchangeRate } from "./src/hooks/useExchangeRate";
import { ArrowNarrowUpIcon } from "./src/icons/ArrowNarrowUpIcon";
import { createSmoothCurve, getTargetPointsForTimeframe } from "./src/utils/chartSmoothing";
import { UNIT } from "./src/utils/conversions";

import { Circle, Group } from "@shopify/react-native-skia";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import * as Font from "expo-font";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UnistylesRuntime } from "react-native-unistyles";
import { CartesianChart, useChartPressState } from "victory-native";

// ─── Query Client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ─── Mock Data Generator ─────────────────────────────────────────────────────

function generateMockBTCData(
  timeframe: "1D" | "1W" | "1M" | "1Y" | "ALL"
): ChartDataPoint[] {
  const now = Date.now();
  const points: ChartDataPoint[] = [];

  let intervalMs: number;
  let count: number;
  let basePrice: number;
  let volatility: number;

  switch (timeframe) {
    case "1D":
      intervalMs = 5 * 60 * 1000;
      count = 288;
      basePrice = 97200;
      volatility = 400;
      break;
    case "1W":
      intervalMs = 30 * 60 * 1000;
      count = 336;
      basePrice = 94500;
      volatility = 1500;
      break;
    case "1M":
      intervalMs = 4 * 60 * 60 * 1000;
      count = 180;
      basePrice = 88000;
      volatility = 4000;
      break;
    case "1Y":
      intervalMs = 24 * 60 * 60 * 1000;
      count = 365;
      basePrice = 42000;
      volatility = 20000;
      break;
    case "ALL":
      intervalMs = 7 * 24 * 60 * 60 * 1000;
      count = 312;
      basePrice = 6000;
      volatility = 40000;
      break;
  }

  let seed = timeframe.charCodeAt(0) * 1000 + timeframe.length * 7919;
  const random = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let price = basePrice;
  const startTime = now - intervalMs * count;

  for (let i = 0; i < count; i++) {
    const drift = volatility * 0.0003;
    const shock = (random() - 0.48) * volatility * 0.04;
    price = Math.max(price * 0.7, price + drift + shock);
    points.push({
      timestamp: startTime + intervalMs * i,
      rate: Math.round(price * 100) / 100,
    });
  }

  const lastFew = Math.min(20, points.length);
  const targetEnd = timeframe === "ALL" ? 97400 : basePrice + volatility * 0.15;
  for (let i = points.length - lastFew; i < points.length; i++) {
    const t = (i - (points.length - lastFew)) / lastFew;
    const prev = points[i]?.rate ?? targetEnd;
    if (points[i]) {
      points[i].rate = prev + (targetEnd - prev) * t * 0.3;
    }
  }

  return points;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TARGET_POINT_COUNT = 288;

const ANIMATION_DURATION = {
  range: 600,
  interaction: 150,
};

const CHART_Y_AXIS = [{ lineWidth: 0, labelOffset: 0 }];

const timeframes = [
  { label: "Today", value: "1D" },
  { label: "Past week", value: "1W" },
  { label: "Past month", value: "1M" },
  { label: "Past year", value: "1Y" },
  { label: "All time", value: "ALL" },
] as const satisfies ChartTimeframe[];

function getTimeframeLabel(timeframe: ChartTimeframe): string {
  return timeframe.label;
}

function resampleToFixedCount(
  data: ChartDataPoint[],
  targetCount: number
): ChartDataPoint[] {
  if (data.length === 0) return [];
  if (data.length < 2 || targetCount < 2) return data;
  if (data.length === targetCount) return data;

  const resampled: ChartDataPoint[] = [];
  for (let i = 0; i < targetCount; i++) {
    const sourcePos = (i / (targetCount - 1)) * (data.length - 1);
    const indexLow = Math.floor(sourcePos);
    const indexHigh = Math.min(indexLow + 1, data.length - 1);
    const weight = sourcePos - indexLow;

    const pLow = data[indexLow];
    const pHigh = data[indexHigh];

    if (pLow && pHigh) {
      resampled.push({
        timestamp: pLow.timestamp + (pHigh.timestamp - pLow.timestamp) * weight,
        rate: pLow.rate + (pHigh.rate - pLow.rate) * weight,
      });
    }
  }
  return resampled;
}

function formatActiveChartDate(
  timestamp: number,
  timeframe: ChartTimeframe
): string {
  const date = dayjs(timestamp);
  const now = dayjs();
  const yesterday = now.subtract(1, "day");
  const isDateOnly = timeframe.value === "1Y" || timeframe.value === "ALL";
  const showTime =
    timeframe.value === "1D" ||
    timeframe.value === "1W" ||
    timeframe.value === "1M";
  const isOneDay = timeframe.value === "1D";

  if (isOneDay) {
    if (date.isSame(now, "day")) {
      return `Today, ${date.format("hh:mm A")}`;
    }
    if (date.isSame(yesterday, "day")) {
      return `Yesterday, ${date.format("hh:mm A")}`;
    }
  }

  if (date.year() < now.year()) {
    return date.format("MMM D YYYY");
  }

  if (isDateOnly) {
    return date.format("MMM D");
  }

  if (showTime) {
    return date.format("MMM D, hh:mm A");
  }

  return date.format("MMM D");
}

// ─── Mock Data (fallback when API is unavailable) ────────────────────────────

const MOCK_DATA: Record<string, ChartDataPoint[]> = {
  "1D": generateMockBTCData("1D"),
  "1W": generateMockBTCData("1W"),
  "1M": generateMockBTCData("1M"),
  "1Y": generateMockBTCData("1Y"),
  ALL: generateMockBTCData("ALL"),
};

// Toggle: set to true to use real API, false for mock data only
const USE_LIVE_DATA = true;

// ─── Main Screen ─────────────────────────────────────────────────────────────

function BitcoinChartScreen(): React.JSX.Element {
  const theme = UnistylesRuntime.getTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { btcConversionRate } = useExchangeRate();

  const { state, isActive } = useChartPressState({
    x: 0,
    y: { rate: 0 },
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>(
    timeframes[0]
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pulsingEndpointCoordParams, setPulsingEndpointCoordParams] =
    useState<CoordParams | null>(null);
  const pendingCoordParamsRef = useRef<CoordParams | null>(null);
  const previousMatchedIndexRef = useRef<number | null>(null);
  const lastHapticTimeRef = useRef<number>(0);
  const HAPTIC_DEBOUNCE_MS = 80;

  const rangeTransition = useSharedValue(1);

  const qc = useQueryClient();

  // Prefetch all timeframe data on mount for instant transitions
  useEffect(() => {
    if (!USE_LIVE_DATA) return;
    let isCancelled = false;

    const prefetchAllTimeframes = async () => {
      const timeframeValues = ["1w", "1m", "1y", "all"] as const;

      await Promise.all(
        timeframeValues.map((timeRange) =>
          qc.prefetchQuery({
            queryKey: queryKeys.bitcoinChartKeys(timeRange.toUpperCase()),
            queryFn: async () => {
              if (isCancelled) return [];
              return await getBitcoinChartData(timeRange);
            },
            staleTime: 60 * 60 * 1000,
          })
        )
      );
    };

    prefetchAllTimeframes();

    return () => {
      isCancelled = true;
    };
  }, [qc]);

  // Fetch chart data for selected timeframe
  const { data: liveChartData = [] } = useQuery({
    queryKey: queryKeys.bitcoinChartKeys(selectedTimeframe.value),
    queryFn: async () => {
      return await getBitcoinChartData(selectedTimeframe.value.toLowerCase());
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    enabled: USE_LIVE_DATA,
  });

  // Use live data when available, fall back to mock
  const chartData =
    USE_LIVE_DATA && liveChartData.length > 0
      ? liveChartData
      : MOCK_DATA[selectedTimeframe.value] ?? [];

  // Animated opacity for smooth chart fade-in
  const chartOpacity = useSharedValue(0);

  useEffect(() => {
    if (chartData.length > 0) {
      chartOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [chartData.length, chartOpacity]);

  const chartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
  }));

  // Detailed data resampled to fixed 288 points
  const detailedData = useMemo(() => {
    return resampleToFixedCount(chartData, TARGET_POINT_COUNT);
  }, [chartData]);

  // Smoothed data for visual display
  const smoothedData = useMemo(() => {
    if (!chartData.length) return [];
    const controlPoints = getTargetPointsForTimeframe(
      chartData.length,
      selectedTimeframe.value
    );
    return createSmoothCurve(chartData, controlPoints, TARGET_POINT_COUNT);
  }, [chartData, selectedTimeframe.value]);

  // SharedValues for morphing
  const fromSmoothPoints = useSharedValue<NormalizedPoint[]>([]);
  const fromDetailedPoints = useSharedValue<NormalizedPoint[]>([]);
  const toSmoothPoints = useSharedValue<NormalizedPoint[]>([]);
  const toDetailedPoints = useSharedValue<NormalizedPoint[]>([]);

  const previousDataIdRef = useRef<string>("");

  // Calculate shared min/max
  const { minPrice, range } = useMemo(() => {
    if (detailedData.length === 0) return { minPrice: 0, range: 1 };
    let min = detailedData[0]?.rate ?? 0;
    let max = min;
    for (const d of detailedData) {
      if (d.rate < min) min = d.rate;
      if (d.rate > max) max = d.rate;
    }
    return { minPrice: min, range: max - min || 1 };
  }, [detailedData]);

  const normalizeData = (data: ChartDataPoint[]): NormalizedPoint[] => {
    if (data.length === 0) return [];
    return data.map((point, i) => ({
      x: i / Math.max(data.length - 1, 1),
      y: (point.rate - minPrice) / range,
    }));
  };

  const normalizedSmooth = useMemo(
    () => normalizeData(smoothedData),
    [smoothedData, minPrice, range]
  );
  const normalizedDetailed = useMemo(
    () => normalizeData(detailedData),
    [detailedData, minPrice, range]
  );

  const currentDataId = useMemo(() => {
    if (smoothedData.length === 0) return "";
    const firstTs = smoothedData[0]?.timestamp ?? 0;
    const lastTs = smoothedData[smoothedData.length - 1]?.timestamp ?? 0;
    return `${firstTs}-${lastTs}-${smoothedData.length}`;
  }, [smoothedData]);

  // Handle data changes and trigger animation
  useEffect(() => {
    if (currentDataId === "" || currentDataId === previousDataIdRef.current) {
      return;
    }

    const hasPrevious = toSmoothPoints.value.length > 0;

    if (hasPrevious) {
      fromSmoothPoints.value = toSmoothPoints.value;
      fromDetailedPoints.value = toDetailedPoints.value;
      toSmoothPoints.value = normalizedSmooth;
      toDetailedPoints.value = normalizedDetailed;

      rangeTransition.value = 0;
      rangeTransition.value = withTiming(1, {
        duration: ANIMATION_DURATION.range,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      fromSmoothPoints.value = normalizedSmooth;
      fromDetailedPoints.value = normalizedDetailed;
      toSmoothPoints.value = normalizedSmooth;
      toDetailedPoints.value = normalizedDetailed;
    }

    previousDataIdRef.current = currentDataId;
  }, [
    currentDataId,
    normalizedSmooth,
    normalizedDetailed,
    rangeTransition,
    fromSmoothPoints,
    fromDetailedPoints,
    toSmoothPoints,
    toDetailedPoints,
  ]);

  const latestDataPoint: ChartDataPoint = {
    rate: btcConversionRate ?? chartData[chartData.length - 1]?.rate ?? 0,
    timestamp: Date.now(),
  };
  const earliestDataPoint = chartData[0];
  const latestPrice = latestDataPoint?.rate ?? 0;
  const earliestPrice = earliestDataPoint?.rate ?? 0;

  const selectedDataPoint =
    isActive && selectedIndex !== null && chartData[selectedIndex]
      ? chartData[selectedIndex]
      : latestDataPoint;

  const currentPrice = selectedDataPoint?.rate ?? latestPrice;

  const currentTimestamp =
    selectedDataPoint?.timestamp ?? latestDataPoint?.timestamp ?? Date.now();

  const percentChange =
    earliestPrice === 0 || chartData.length === 0
      ? 0
      : ((currentPrice - earliestPrice) / earliestPrice) * 100;

  const differenceInPrice = currentPrice - earliestPrice;

  const dateLabel = getTimeframeLabel(selectedTimeframe);
  const activeDateLabel = isActive
    ? formatActiveChartDate(currentTimestamp, selectedTimeframe)
    : null;

  const domainPadding = useMemo(
    () => ({
      bottom: 15,
      left: 0,
      right: selectedTimeframe.value === "1D" ? 25 : 2,
      top: 15,
    }),
    [selectedTimeframe.value]
  );

  // Haptics on scrub
  const onSharedValueChange = useCallback(
    (matchedIndex: number, _xPosition: number) => {
      if (previousMatchedIndexRef.current !== matchedIndex) {
        previousMatchedIndexRef.current = matchedIndex;

        if (Platform.OS === "android") {
          const androidVersion =
            typeof Platform.Version === "number" ? Platform.Version : 0;
          if (androidVersion >= 34) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
          } else {
            const now = Date.now();
            if (now - lastHapticTimeRef.current >= HAPTIC_DEBOUNCE_MS) {
              lastHapticTimeRef.current = now;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }
          }
        } else {
          Haptics.selectionAsync();
        }
      }
      setSelectedIndex(matchedIndex);
    },
    []
  );

  useEffect(() => {
    if (!isActive) {
      previousMatchedIndexRef.current = null;
    }
  }, [isActive]);

  useDerivedValue(() => {
    if (!isActive) return;
    runOnJS(onSharedValueChange)(
      state.matchedIndex.value,
      state.x.position.value
    );
  }, [state.matchedIndex, state.x.position, isActive, onSharedValueChange]);

  // Sync coordParams for pulsing endpoint
  useEffect(() => {
    if (chartData.length === 0) return;

    const rafId = requestAnimationFrame(() => {
      if (pendingCoordParamsRef.current) {
        setPulsingEndpointCoordParams((prev) => {
          const pending = pendingCoordParamsRef.current;
          if (!pending) return prev;
          if (
            !prev ||
            prev.chartLeft !== pending.chartLeft ||
            prev.chartBottom !== pending.chartBottom ||
            prev.usableWidth !== pending.usableWidth ||
            prev.usableHeight !== pending.usableHeight
          ) {
            return pending;
          }
          return prev;
        });
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [chartData.length]);

  return (
    <FoldTabView
      scrollEnabled={false}
      backgroundColor={theme.colors.object.primary.bold.default}
      contentContainerStyle={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          width: "100%",
          paddingVertical: theme.spacing["3xl"],
        }}
      >
        {/* Header: Title + Price + Change */}
        <View
          style={{
            paddingHorizontal: theme.spacing.xl,
            width: "100%",
            gap: theme.spacing.xxs,
            marginBottom: theme.spacing["3xl"],
          }}
        >
          {/* Top row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <FoldText type="header-md">Bitcoin</FoldText>
            <FoldText type="body-md" color={theme.colors.face.tertiary}>
              {dateLabel}
            </FoldText>
          </View>

          {/* Bottom row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "stretch",
            }}
          >
            <FoldConversionText
              value={1}
              fromUnit={UNIT.BTC}
              toUnit={UNIT.USD}
              btcToUsdRate={currentPrice}
              type="header-md"
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing["3xs"],
              }}
            >
              <View
                style={{
                  transform: [{ scaleY: differenceInPrice < 0 ? -1 : 1 }],
                }}
              >
                <ArrowNarrowUpIcon
                  width={20}
                  height={20}
                  fill={
                    differenceInPrice < 0
                      ? theme.colors.object.negative.bold.default
                      : theme.colors.object.positive.bold.default
                  }
                />
              </View>
              <FoldText type="header-md">
                {percentChange.toFixed(2)}%
              </FoldText>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View
          style={{
            width: "100%",
            flex: 1,
            marginBottom: theme.spacing.xl,
            backgroundColor: theme.colors.object.primary.bold.default,
            overflow: "visible",
          }}
        >
          {/* Date label overlay when scrubbing */}
          {activeDateLabel && (
            <AnimatedDateLabel
              xPosition={state.x.position}
              screenWidth={screenWidth}
              label={activeDateLabel}
              textColor={theme.colors.face.primary}
            />
          )}
          {chartData.length > 0 ? (
            <Animated.View style={[{ flex: 1 }, chartAnimatedStyle]}>
              <CartesianChart
                data={chartData}
                xKey="timestamp"
                yKeys={["rate"]}
                yAxis={CHART_Y_AXIS}
                chartPressState={state}
                domainPadding={domainPadding}
              >
                {({ points: pointsData, chartBounds }) => {
                  const toolTipIsShowing =
                    isActive && selectedIndex !== null;
                  const idx = selectedIndex ?? -1;

                  const victoryDetailedPoints = pointsData.rate;

                  const chartHeight =
                    chartBounds.bottom - chartBounds.top;
                  const chartWidth =
                    chartBounds.right - chartBounds.left;

                  const dotMargin = 14;
                  const usableHeight = chartHeight - dotMargin * 2;

                  const rightPadding =
                    selectedTimeframe.value === "1D" ? 25 : 2;
                  const usableWidth = chartWidth - rightPadding;

                  const coordParams: CoordParams = {
                    chartLeft: chartBounds.left,
                    chartBottom: chartBounds.bottom,
                    dotMargin,
                    usableWidth,
                    usableHeight,
                  };

                  pendingCoordParamsRef.current = coordParams;

                  const lastNormalized =
                    toSmoothPoints.value[
                      toSmoothPoints.value.length - 1
                    ];
                  const lineEndX = lastNormalized
                    ? chartBounds.left +
                      lastNormalized.x * usableWidth
                    : undefined;

                  const clipX =
                    toolTipIsShowing &&
                    idx >= 0 &&
                    idx < victoryDetailedPoints.length
                      ? (victoryDetailedPoints[idx]?.x ??
                        chartBounds.right)
                      : chartBounds.right;

                  const currentDetailedPoints = toDetailedPoints.value;
                  const mappedIdx =
                    currentDetailedPoints.length > 0 &&
                    chartData.length > 0
                      ? Math.round(
                          (idx / Math.max(chartData.length - 1, 1)) *
                            (currentDetailedPoints.length - 1)
                        )
                      : 0;
                  const clampedIdx = Math.min(
                    Math.max(0, mappedIdx),
                    currentDetailedPoints.length - 1
                  );
                  const normPoint = currentDetailedPoints[clampedIdx];
                  const clipY =
                    toolTipIsShowing && normPoint
                      ? coordParams.chartBottom -
                        coordParams.dotMargin -
                        normPoint.y * coordParams.usableHeight
                      : undefined;

                  return (
                    <>
                      <ChartBackgroundGrid
                        chartBounds={chartBounds}
                        clipX={
                          toolTipIsShowing ? clipX : undefined
                        }
                        clipY={
                          toolTipIsShowing ? clipY : undefined
                        }
                        isActive={state.isActive}
                        fromSmoothPoints={fromSmoothPoints}
                        fromDetailedPoints={fromDetailedPoints}
                        toSmoothPoints={toSmoothPoints}
                        toDetailedPoints={toDetailedPoints}
                        coordParams={coordParams}
                        rangeTransition={rangeTransition}
                        lineEndX={lineEndX}
                        is1DTimeframe={
                          selectedTimeframe.value === "1D"
                        }
                        crosshairXPosition={state.x.position}
                        crosshairMatchedIndex={state.matchedIndex}
                        chartDataLength={chartData.length}
                      />

                      {/* Primary line (black) - left of crosshair */}
                      <AnimatedChartLine
                        fromSmoothPoints={fromSmoothPoints}
                        fromDetailedPoints={fromDetailedPoints}
                        toSmoothPoints={toSmoothPoints}
                        toDetailedPoints={toDetailedPoints}
                        coordParams={coordParams}
                        isActive={state.isActive}
                        rangeTransition={rangeTransition}
                        color="rgba(23, 21, 14, 1)"
                        containerHeight={chartHeight}
                        animatedClipX={
                          toolTipIsShowing
                            ? state.x.position
                            : undefined
                        }
                        clipSide="left"
                        chartBounds={chartBounds}
                      />

                      {/* Dimmed line (yellow) - right of crosshair */}
                      <AnimatedChartLine
                        fromSmoothPoints={fromSmoothPoints}
                        fromDetailedPoints={fromDetailedPoints}
                        toSmoothPoints={toSmoothPoints}
                        toDetailedPoints={toDetailedPoints}
                        coordParams={coordParams}
                        isActive={state.isActive}
                        rangeTransition={rangeTransition}
                        color="rgba(209, 163, 0, 1)"
                        containerHeight={chartHeight}
                        animatedClipX={state.x.position}
                        clipSide="right"
                        chartBounds={chartBounds}
                        showLine={toolTipIsShowing}
                      />

                      {/* Tooltip dot */}
                      <ToolTip
                        x={state.x.position}
                        matchedIndex={state.matchedIndex}
                        toDetailedPoints={toDetailedPoints}
                        coordParams={coordParams}
                        chartDataLength={chartData.length}
                        isActive={state.isActive}
                      />
                    </>
                  );
                }}
              </CartesianChart>
            </Animated.View>
          ) : (
            <ChartSkeleton />
          )}

          {/* Pulsing endpoint for 1D */}
          {selectedTimeframe.value === "1D" &&
            !isActive &&
            chartData.length > 0 &&
            pulsingEndpointCoordParams && (
              <AnimatedPulsingEndpoint
                fromSmoothPoints={fromSmoothPoints}
                fromDetailedPoints={fromDetailedPoints}
                toSmoothPoints={toSmoothPoints}
                toDetailedPoints={toDetailedPoints}
                coordParams={pulsingEndpointCoordParams}
                rangeTransition={rangeTransition}
                isActive={isActive}
              />
            )}
        </View>

        {/* Timeframe pills + Action buttons */}
        <View
          style={{
            gap: theme.spacing.xxl,
            width: "100%",
            paddingHorizontal: theme.spacing.xl,
          }}
        >
          <View
            style={{
              paddingVertical: theme.spacing.xs,
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.xxs,
            }}
          >
            {timeframes.map((timeframe) => {
              const isSelected =
                timeframe.value === selectedTimeframe.value;

              return (
                <FoldPillSelector
                  key={timeframe.value}
                  text={timeframe.value}
                  type={isSelected ? "outline-active" : "outline"}
                  onPress={() => setSelectedTimeframe(timeframe)}
                  style={{
                    flex: 1,
                  }}
                />
              );
            })}
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.lg,
            }}
          >
            <FoldButton
              text="Buy"
              type="inverse"
              style={{ flex: 1 }}
              onPress={() => {
                // placeholder
              }}
            />
            <FoldButton
              text="Sell"
              type="inverse"
              style={{ flex: 1 }}
              onPress={() => {
                // placeholder
              }}
            />
          </View>
        </View>
      </View>
    </FoldTabView>
  );
}

// ─── ToolTip ─────────────────────────────────────────────────────────────────

const ToolTip = memo(function ToolTip({
  x,
  matchedIndex,
  toDetailedPoints,
  coordParams,
  chartDataLength,
  isActive,
}: {
  x: SharedValue<number>;
  matchedIndex: SharedValue<number>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  chartDataLength: number;
  isActive: SharedValue<boolean>;
}) {
  const opacity = useDerivedValue(() => {
    return withTiming(isActive.value ? 1 : 0, {
      duration: 50,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const y = useDerivedValue(() => {
    const victoryIdx = matchedIndex.value;
    const detailed = toDetailedPoints.value;

    if (detailed.length === 0 || chartDataLength === 0) return 0;
    if (victoryIdx < 0) return 0;

    const mappedIdx = Math.round(
      (victoryIdx / Math.max(chartDataLength - 1, 1)) *
        (detailed.length - 1)
    );
    const clampedIdx = Math.min(
      Math.max(0, mappedIdx),
      detailed.length - 1
    );

    const norm = detailed[clampedIdx];
    if (!norm) return 0;

    return (
      coordParams.chartBottom -
      coordParams.dotMargin -
      norm.y * coordParams.usableHeight
    );
  }, [coordParams, chartDataLength]);

  return (
    <Group opacity={opacity}>
      <Circle cx={x} cy={y} r={6} color="rgba(23, 21, 14, 1)" style="fill" />
      <Circle
        cx={x}
        cy={y}
        r={6}
        color="rgba(255, 221, 51, 1)"
        style="stroke"
        strokeWidth={2}
      />
    </Group>
  );
});

// ─── Animated Date Label ─────────────────────────────────────────────────────

const LABEL_WIDTH = 140;

const AnimatedDateLabel = memo(function AnimatedDateLabel({
  xPosition,
  screenWidth,
  label,
  textColor,
}: {
  xPosition: SharedValue<number>;
  screenWidth: number;
  label: string;
  textColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const centeredLeft = xPosition.value - LABEL_WIDTH / 2;
    const clampedLeft = Math.max(
      0,
      Math.min(centeredLeft, screenWidth - LABEL_WIDTH)
    );

    return {
      position: "absolute" as const,
      top: -20,
      left: clampedLeft,
      width: LABEL_WIDTH,
      alignItems: "center" as const,
      zIndex: 10,
    };
  }, [screenWidth]);

  return (
    <Animated.View pointerEvents="none" style={animatedStyle}>
      <FoldText type="body-sm" color={textColor}>
        {label}
      </FoldText>
    </Animated.View>
  );
});

// ─── Root App with Providers ─────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        "Geist-Regular": require("./assets/fonts/Geist-Regular.otf"),
        "Geist-Medium": require("./assets/fonts/Geist-Medium.otf"),
        "Geist-SemiBold": require("./assets/fonts/Geist-SemiBold.otf"),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1 }}>
            <BitcoinChartScreen />
            <FoldTabBar />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
