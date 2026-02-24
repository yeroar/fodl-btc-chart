import { colors } from "./color/colors";
import { radius } from "./size/radius";
import { size } from "./size/size";
import { spacing } from "./size/spacing";
import { fonts } from "./typography/fonts";
import { fontSizes } from "./typography/size";
import { typographyStyles } from "./typography/typography";
import { adjustOpacity, toHex, toRGBA } from "./util/color";

const baseTheme = {
  colors,
  spacing,
  radius,
  fonts,
  typography: typographyStyles,
  size,
  fontSizes,
  utils: {
    color: { adjustOpacity, toHex, toRGBA },
  },
};

export const themes = {
  light: { ...baseTheme },
  dark: { ...baseTheme },
};

export type Themes = typeof themes;
