import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, type TextStyle, View, type ViewStyle } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { UnistylesRuntime } from "react-native-unistyles";
import { FoldText } from "./FoldText";

export const FOLD_BUTTON_DURATION = 75;
export const FOLD_BUTTON_SCALE = { PRESSED: 0.97, RELEASED: 1 };

export interface FoldButtonProps {
  text?: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  type?: "primary" | "secondary" | "tertiary" | "destructive" | "inverse";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}

export const FoldButton = ({ text, onPress, style, disabled = false, type = "primary", size = "md", textStyle = {}, loading }: FoldButtonProps) => {
  const theme = UnistylesRuntime.getTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    let bg = type === "primary" ? theme.colors.object.primary.bold.default
      : type === "inverse" ? theme.colors.object.inverse.default
      : type === "destructive" ? theme.colors.object.negative.bold.default
      : type === "secondary" ? theme.colors.object.secondary.default : "transparent";
    if (disabled) bg = theme.colors.object.disabled.disabled;

    const pressed = type === "primary" ? theme.colors.object.primary.bold.pressed
      : type === "inverse" ? theme.colors.object.inverse.pressed
      : type === "destructive" ? theme.colors.object.negative.bold.pressed
      : type === "secondary" ? theme.colors.object.secondary.pressed : theme.colors.object.tertiary.pressed;

    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(scale.value, [0.97, 1], [pressed, bg]),
    };
  });

  const pad = { xs: { h: 8, v: 10 }, sm: { h: 12, v: 10 }, md: { h: 16, v: 14 }, lg: { h: 20, v: 18 } }[size];
  const textColor = disabled ? theme.colors.face.disabled : (type === "destructive" || type === "inverse") ? theme.colors.face.inversePrimary : theme.colors.face.primary;

  return (
    <Animated.View style={[{ alignSelf: "flex-start", borderRadius: theme.radius.md, justifyContent: "center", alignItems: "center" }, animatedStyle, style]}>
      <Pressable
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 75 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 75 }); }}
        disabled={disabled || loading}
        onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
        style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingHorizontal: pad.h, paddingVertical: pad.v }}
      >
        {loading ? <ActivityIndicator size={20} color={textColor} /> : (
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 }}>
            {text && <FoldText type={size === "xs" ? "button-sm" : "button-lg"} style={[{ lineHeight: size === "xs" ? 16 : 20, color: textColor }, textStyle]}>{text}</FoldText>}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};
