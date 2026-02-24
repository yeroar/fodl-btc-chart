import type { SharedValue } from "react-native-reanimated";

export type ChartDataPoint = { timestamp: number; rate: number };

export type ChartTimeframe = {
  label: string;
  value: "1D" | "1W" | "1M" | "1Y" | "ALL";
};

// Normalized point type (0-1 range) for animation interpolation
export type NormalizedPoint = { x: number; y: number };

// Coordinate conversion parameters for animated components
export type CoordParams = {
  chartLeft: number;
  chartBottom: number;
  dotMargin: number;
  usableWidth: number;
  usableHeight: number;
};

// Props for animated chart components that use SharedValues
export type AnimatedChartProps = {
  fromSmoothPoints: SharedValue<NormalizedPoint[]>;
  fromDetailedPoints: SharedValue<NormalizedPoint[]>;
  toSmoothPoints: SharedValue<NormalizedPoint[]>;
  toDetailedPoints: SharedValue<NormalizedPoint[]>;
  coordParams: CoordParams;
  isActive: boolean;
  rangeTransition: SharedValue<number>;
};
