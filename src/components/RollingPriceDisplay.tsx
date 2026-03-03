import { memo, useCallback, useEffect, useRef } from "react";
import { TextInput, View } from "react-native";
import {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import { UnistylesRuntime } from "react-native-unistyles";

import type { ChartDataPoint } from "../components/BitcoinChart/types";
import { ArrowNarrowUpIcon } from "../icons/ArrowNarrowUpIcon";
import { typographyStyles } from "../theme/typography/typography";
import { formatValueToStringValue } from "../utils/stringFormats";

type RollingPriceDisplayProps = {
  visualIndex: SharedValue<number>;
  isVisuallyActive: SharedValue<boolean>;
  chartData: ChartDataPoint[];
  earliestPrice: number;
  latestPrice: number;
  showArrow?: boolean;
};

export const RollingPriceDisplay = memo(function RollingPriceDisplay({
  visualIndex,
  isVisuallyActive,
  chartData,
  earliestPrice,
  latestPrice,
  showArrow = false,
}: RollingPriceDisplayProps) {
  const theme = UnistylesRuntime.getTheme();
  const priceRef = useRef<TextInput>(null);
  const percentRef = useRef<TextInput>(null);
  const arrowUpRef = useRef<View>(null);
  const arrowDownRef = useRef<View>(null);

  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;
  const earliestPriceRef = useRef(earliestPrice);
  earliestPriceRef.current = earliestPrice;
  const latestPriceRef = useRef(latestPrice);
  latestPriceRef.current = latestPrice;
  const showArrowRef = useRef(showArrow);
  showArrowRef.current = showArrow;

  const positiveColor = "rgba(0, 126, 76, 1)";
  const negativeColor = theme.colors.object.negative.bold.default;

  const updateNativeText = useCallback((floatIdx: number) => {
    const data = chartDataRef.current;
    if (data.length === 0) return;

    const maxIdx = data.length - 1;
    const clampedIdx = Math.max(0, Math.min(floatIdx, maxIdx));
    const floor = Math.floor(clampedIdx);
    const ceil = Math.min(floor + 1, maxIdx);
    const weight = clampedIdx - floor;

    const floorRate = data[floor]?.rate ?? 0;
    const ceilRate = data[ceil]?.rate ?? 0;
    const lerpedPrice = floorRate * (1 - weight) + ceilRate * weight;

    const ep = earliestPriceRef.current;
    const pctChange = ep === 0 ? 0 : ((lerpedPrice - ep) / ep) * 100;
    const isPositive = pctChange >= 0;

    const priceText = formatValueToStringValue(lerpedPrice, "usd");

    if (showArrowRef.current) {
      const pctText = `${Math.abs(pctChange).toFixed(2)}%`;
      percentRef.current?.setNativeProps({ text: pctText });
      arrowUpRef.current?.setNativeProps({ style: { display: isPositive ? "flex" : "none" } });
      arrowDownRef.current?.setNativeProps({ style: { display: isPositive ? "none" : "flex" } });
    } else {
      const pctText = `${isPositive ? "+ " : "- "}${Math.abs(pctChange).toFixed(2)}%`;
      percentRef.current?.setNativeProps({ text: pctText });
      const pctColor = isPositive ? positiveColor : negativeColor;
      percentRef.current?.setNativeProps({ style: { color: pctColor } });
    }

    priceRef.current?.setNativeProps({ text: priceText });
  }, []);

  const resetToLatest = useCallback(() => {
    const lp = latestPriceRef.current;
    const ep = earliestPriceRef.current;
    const priceText = formatValueToStringValue(lp, "usd");
    const pct = ep === 0 ? 0 : ((lp - ep) / ep) * 100;
    const isPositive = pct >= 0;

    priceRef.current?.setNativeProps({ text: priceText });

    if (showArrowRef.current) {
      const pctText = `${Math.abs(pct).toFixed(2)}%`;
      percentRef.current?.setNativeProps({ text: pctText });
      percentRef.current?.setNativeProps({ style: { color: theme.colors.face.primary } });
      arrowUpRef.current?.setNativeProps({ style: { display: isPositive ? "flex" : "none" } });
      arrowDownRef.current?.setNativeProps({ style: { display: isPositive ? "none" : "flex" } });
    } else {
      const pctText = `${isPositive ? "+ " : "- "}${Math.abs(pct).toFixed(2)}%`;
      percentRef.current?.setNativeProps({ text: pctText });
      const pctColor = isPositive ? positiveColor : negativeColor;
      percentRef.current?.setNativeProps({ style: { color: pctColor } });
    }
  }, []);

  useEffect(() => {
    resetToLatest();
  }, [latestPrice, earliestPrice, showArrow]);

  useAnimatedReaction(
    () => ({ idx: visualIndex.value, active: isVisuallyActive.value }),
    (curr, prev) => {
      if (curr.active) {
        runOnJS(updateNativeText)(curr.idx);
      } else if (prev !== null && prev.active) {
        runOnJS(resetToLatest)();
      }
    },
    []
  );

  const headerMd = typographyStyles["header-md"];
  const textStyle = {
    fontFamily: headerMd.fontFamily,
    fontSize: headerMd.fontSize,
    lineHeight: headerMd.lineHeight,
    fontVariant: ["tabular-nums" as const],
    color: theme.colors.face.primary,
    padding: 0,
    margin: 0,
    borderWidth: 0,
  };

  const initialPrice = formatValueToStringValue(latestPrice, "usd");
  const initialPctValue = earliestPrice === 0 ? 0 : ((latestPrice - earliestPrice) / earliestPrice) * 100;
  const isPositive = initialPctValue >= 0;

  const initialPct = showArrow
    ? `${Math.abs(initialPctValue).toFixed(2)}%`
    : `${isPositive ? "+ " : "- "}${Math.abs(initialPctValue).toFixed(2)}%`;

  const initialPctColor = showArrow
    ? theme.colors.face.primary
    : isPositive ? positiveColor : negativeColor;

  const arrowColor = isPositive
    ? theme.colors.object.positive.bold.default
    : theme.colors.object.negative.bold.default;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <TextInput
        ref={priceRef}
        editable={false}
        scrollEnabled={false}
        pointerEvents="none"
        defaultValue={initialPrice}
        style={textStyle}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing["3xs"],
        }}
      >
        {showArrow && (
          <>
            <View
              ref={arrowUpRef}
              style={{
                display: isPositive ? "flex" : "none",
                height: headerMd.lineHeight,
                justifyContent: "center",
              }}
            >
              <ArrowNarrowUpIcon
                width={20}
                height={20}
                fill={theme.colors.object.positive.bold.default}
              />
            </View>
            <View
              ref={arrowDownRef}
              style={{
                display: isPositive ? "none" : "flex",
                height: headerMd.lineHeight,
                justifyContent: "center",
                transform: [{ scaleY: -1 }],
              }}
            >
              <ArrowNarrowUpIcon
                width={20}
                height={20}
                fill={theme.colors.object.negative.bold.default}
              />
            </View>
          </>
        )}
        <TextInput
          ref={percentRef}
          editable={false}
          scrollEnabled={false}
          pointerEvents="none"
          defaultValue={initialPct}
          style={[textStyle, { color: initialPctColor }]}
        />
      </View>
    </View>
  );
});
