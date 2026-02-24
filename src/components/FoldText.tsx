import type { ReactNode } from "react";
import type { StyleProp, TextProps, TextStyle } from "react-native";
import { Text } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";
import type { FoldTextType } from "../theme/typography/typography";

export interface FoldTextProps extends TextProps {
  type: FoldTextType;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}

export const FoldText = ({ type = "body-md", style, children, color, ...rest }: FoldTextProps) => {
  const theme = UnistylesRuntime.getTheme();
  return (
    <Text
      style={[theme.typography[type], { color: color || theme.colors.face.primary }, style as TextStyle]}
      allowFontScaling={false}
      {...rest}
    >
      {children}
    </Text>
  );
};
