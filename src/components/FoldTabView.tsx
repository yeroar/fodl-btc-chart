import { type ReactNode } from "react";
import { Animated, type StyleProp, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UnistylesRuntime } from "react-native-unistyles";
import { BellIcon } from "../icons/BellIcon";
import { ClockIcon } from "../icons/ClockIcon";
import { MenuIcon } from "../icons/MenuIcon";
import FoldHeader from "./FoldHeader";
import { FoldPressable } from "./FoldPressable";

type FoldTabViewProps = {
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: StyleProp<ViewStyle>;
  title?: string;
  leftComponent?: ReactNode;
  rightComponent?: ReactNode;
  scrollEnabled?: boolean;
  backgroundColor?: string;
  onBellPress?: () => void;
  bellActive?: boolean;
};

const HEADER_HEIGHT = 48;

export const FoldTabView = ({
  children,
  style,
  contentContainerStyle,
  title,
  leftComponent,
  rightComponent,
  scrollEnabled,
  backgroundColor,
  onBellPress,
  bellActive,
}: FoldTabViewProps) => {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const bg = backgroundColor || theme.colors.layer.background;

  const defaultLeftHeaderComponent = () => {
    return (
      <FoldPressable onPress={() => { /* settings placeholder */ }}>
        <MenuIcon />
      </FoldPressable>
    );
  };

  const defaultRightHeaderComponent = () => {
    return (
      <View
        style={{
          gap: theme.spacing.lg,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <FoldPressable onPress={() => { /* transactions placeholder */ }} hitSlop={10}>
          <ClockIcon />
        </FoldPressable>
        <FoldPressable onPress={onBellPress ?? (() => {})} hitSlop={10}>
          <BellIcon fill={bellActive ? theme.colors.object.positive.bold.default : undefined} />
        </FoldPressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: bg,
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
          zIndex: 10,
        }}
      >
        <FoldHeader
          title={title || undefined}
          leftComponent={leftComponent || defaultLeftHeaderComponent()}
          rightComponent={rightComponent || defaultRightHeaderComponent()}
          headerHeight={HEADER_HEIGHT}
        />
      </View>

      {/* Content */}
      {scrollEnabled !== false ? (
        <Animated.ScrollView
          style={{ flex: 1, ...style }}
          contentContainerStyle={contentContainerStyle as object}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1, ...(style || {}) }}>
          {children}
        </View>
      )}
    </View>
  );
};
