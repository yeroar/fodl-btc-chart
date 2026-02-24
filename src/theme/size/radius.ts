import { Dimensions } from "react-native";

export const radius = {
  none: 0, xs: 4, sm: 6, md: 8, lg: 12, xl: 16, default: 8,
  rounded: Dimensions.get("window").height / 2,
} as const;
