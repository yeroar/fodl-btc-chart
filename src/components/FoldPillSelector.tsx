import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { UnistylesRuntime } from "react-native-unistyles";
import { FOLD_BUTTON_DURATION, FOLD_BUTTON_SCALE } from "./FoldButton";
import { FoldText } from "./FoldText";

type Props = {
  type?: "active" | "pressed" | "default" | "outline" | "outline-active";
  size?: "sm" | "md";
  onPress?: () => void;
  style?: ViewStyle;
  text?: string;
  textStyle?: TextStyle;
};

export const FoldPillSelector = ({ type = "default", onPress, size = "md", style, text = "Label", textStyle }: Props) => {
  const theme = UnistylesRuntime.getTheme();
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);
  const cur = isPressed ? "pressed" : type;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg = cur === "outline-active" ? theme.colors.object.primary.bold.pressed
    : cur === "outline" ? theme.utils.color.adjustOpacity(theme.colors.object.primary.bold.pressed, 0.32)
    : cur === "active" ? theme.colors.object.tertiary.selected
    : cur === "pressed" ? theme.colors.object.tertiary.pressed
    : theme.colors.object.tertiary.default;

  const border = cur === "outline" || cur === "outline-active" ? "transparent" : theme.colors.border.tertiary;
  const textColor = cur === "default" || cur === "pressed" ? theme.colors.face.disabled : theme.colors.face.primary;

  return (
    <Animated.View style={[{ alignSelf: "flex-start", borderRadius: theme.radius.md, justifyContent: "center", alignItems: "center" }, animatedStyle, style]}>
      <Pressable
        onPressIn={() => { setIsPressed(true); scale.value = withTiming(FOLD_BUTTON_SCALE.PRESSED, { duration: FOLD_BUTTON_DURATION }); }}
        onPressOut={() => { setIsPressed(false); scale.value = withTiming(FOLD_BUTTON_SCALE.RELEASED, { duration: FOLD_BUTTON_DURATION }); }}
        onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
        style={{ justifyContent: "center", alignItems: "center", borderRadius: 100, borderWidth: 1, width: "100%", paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, backgroundColor: bg, borderColor: border }}
      >
        <FoldText type={size === "sm" ? "body-sm-bold" : "body-md-bold"} style={[{ color: textColor }, textStyle]}>{text}</FoldText>
      </Pressable>
    </Animated.View>
  );
};
