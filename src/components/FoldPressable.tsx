import * as Haptics from "expo-haptics";
import { type ReactNode, useState } from "react";
import { Platform, Pressable, type PressableProps, View, type ViewStyle } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

export interface FoldPressableProps extends PressableProps {
  children?: ReactNode | string;
  style?: ViewStyle;
  enabledPressedBackground?: boolean;
  disableOpacityOnPress?: boolean;
}

// Minimum touch target sizes based on platform guidelines
const MIN_TOUCH_SIZE = Platform.OS === "ios" ? 44 : 48;

export function FoldPressable({
  style,
  children,
  enabledPressedBackground,
  disableOpacityOnPress,
  hitSlop: propHitSlop,
  ...props
}: FoldPressableProps) {
  const theme = UnistylesRuntime.getTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [calculatedHitSlop, setCalculatedHitSlop] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);

  const handleLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    if (propHitSlop) return;

    const { width, height } = event.nativeEvent.layout;

    const needsHorizontalHitSlop = width < MIN_TOUCH_SIZE;
    const needsVerticalHitSlop = height < MIN_TOUCH_SIZE;

    if (needsHorizontalHitSlop || needsVerticalHitSlop) {
      const horizontalPadding = needsHorizontalHitSlop
        ? Math.max(0, (MIN_TOUCH_SIZE - width) / 2)
        : 0;
      const verticalPadding = needsVerticalHitSlop ? Math.max(0, (MIN_TOUCH_SIZE - height) / 2) : 0;

      setCalculatedHitSlop({
        top: verticalPadding,
        bottom: verticalPadding,
        left: horizontalPadding,
        right: horizontalPadding,
      });
    } else {
      setCalculatedHitSlop(null);
    }
  };

  const finalHitSlop = propHitSlop || calculatedHitSlop;

  return (
    <Pressable
      onLayout={handleLayout}
      hitSlop={finalHitSlop}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={({ pressed }) => [
        {
          opacity: pressed && !enabledPressedBackground && !disableOpacityOnPress ? 0.5 : 1.0,
          ...(style || {}),
        },
      ]}
      {...props}
      onPress={(e) => {
        if (props.onPress) {
          props.onPress(e);
        }
        Haptics.selectionAsync();
      }}
      onLongPress={(e) => {
        if (props.onLongPress) {
          props.onLongPress(e);
        }
        Haptics.selectionAsync();
      }}
    >
      {isPressed && enabledPressedBackground && (
        <View
          style={{
            position: "absolute",
            left: -12,
            right: -12,
            top: 4,
            bottom: 4,
            backgroundColor: theme.colors.object.tertiary.pressed,
            borderRadius: theme.radius.lg,
          }}
        />
      )}

      {children}
    </Pressable>
  );
}
