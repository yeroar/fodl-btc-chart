import { memo, useCallback, useRef } from "react";
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
};

export const RollingPriceDisplay = memo(function RollingPriceDisplay({
  visualIndex,
  isVisuallyActive,
  chartData,
  earliestPrice,
  latestPrice,
}: RollingPriceDisplayProps) {
  const theme = UnistylesRuntime.getTheme();
  const priceRef = useRef<TextInput>(null);
  const percentRef = useRef<TextInput>(null);
  const arrowRef = useRef<View>(null);

  // Ref to latest chartData for access in runOnJS callback
  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;
  const earliestPriceRef = useRef(earliestPrice);
  earliestPriceRef.current = earliestPrice;

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

    const priceText = formatValueToStringValue(lerpedPrice, "usd");
    const pctText = `${pctChange.toFixed(2)}%`;

    priceRef.current?.setNativeProps({ text: priceText });
    percentRef.current?.setNativeProps({ text: pctText });

    // Update arrow direction
    const diff = lerpedPrice - ep;
    arrowRef.current?.setNativeProps({
      style: { transform: [{ scaleY: diff < 0 ? -1 : 1 }] },
    });
  }, []);

  // Fire on every animation frame of visualIndex
  useAnimatedReaction(
    () => ({ idx: visualIndex.value, active: isVisuallyActive.value }),
    (curr) => {
      if (curr.active) {
        runOnJS(updateNativeText)(curr.idx);
      }
    },
    []
  );

  const headerMd = typographyStyles["header-md"];
  const textStyle = {
    fontFamily: headerMd.fontFamily,
    fontSize: headerMd.fontSize,
    lineHeight: headerMd.lineHeight,
    color: theme.colors.face.primary,
    padding: 0,
    margin: 0,
    borderWidth: 0,
  };

  const initialPrice = formatValueToStringValue(latestPrice, "usd");
  const initialPct = earliestPrice === 0
    ? "0.00%"
    : `${(((latestPrice - earliestPrice) / earliestPrice) * 100).toFixed(2)}%`;
  const initialDiff = latestPrice - earliestPrice;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "stretch",
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
        <View
          ref={arrowRef}
          style={{
            transform: [{ scaleY: initialDiff < 0 ? -1 : 1 }],
          }}
        >
          <ArrowNarrowUpIcon
            width={20}
            height={20}
            fill={
              initialDiff < 0
                ? theme.colors.object.negative.bold.default
                : theme.colors.object.positive.bold.default
            }
          />
        </View>
        <TextInput
          ref={percentRef}
          editable={false}
          scrollEnabled={false}
          pointerEvents="none"
          defaultValue={initialPct}
          style={textStyle}
        />
      </View>
    </View>
  );
});
