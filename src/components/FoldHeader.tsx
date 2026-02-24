import { type ReactNode, useEffect, useState } from "react";
import { Animated, Dimensions, View } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";
import { FoldPressable } from "./FoldPressable";
import { FoldText } from "./FoldText";

type FoldHeaderProps = {
  title?: string;
  titleComponent?: ReactNode;
  subTitle?: string;
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftComponent?: ReactNode;
  rightComponent?: ReactNode;
  backgroundColor?: string;
  rightIconColor?: string;
  titleColor?: string;
  currentStep?: number;
  totalSteps?: number;
  headerHeight?: number;
  scrollY?: Animated.Value;
  fadeInHeader?: boolean;
  fadeInStart?: number;
};

const FoldHeader = ({
  title,
  titleComponent,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  leftComponent,
  rightComponent,
  backgroundColor,
  titleColor,
  currentStep,
  totalSteps,
  headerHeight,
  scrollY,
  fadeInHeader = false,
  fadeInStart = 0,
}: FoldHeaderProps) => {
  const theme = UnistylesRuntime.getTheme();
  const HEADER_HEIGHT = headerHeight || 48;

  const containerPaddingVertical = 4;
  const containerPaddingHorizontal = 20;
  const gap = 4;

  const [rightSideWidth, setRightSideWidth] = useState(0);
  const [leftSideWidth, setLeftSideWidth] = useState(0);

  const iconStyles = {
    padding: 8,
  };

  const showProgressBar = currentStep !== undefined && totalSteps !== undefined;

  const headerTextColor = titleColor || theme.colors.face.primary;

  const headerMaxWidth =
    Dimensions.get("window").width -
    leftSideWidth -
    rightSideWidth -
    containerPaddingHorizontal -
    containerPaddingHorizontal -
    gap -
    45;

  const FADE_START = fadeInStart > 50 ? fadeInStart : 50;
  const centerOpacity =
    fadeInHeader && scrollY
      ? scrollY.interpolate({
          inputRange: [FADE_START, HEADER_HEIGHT + FADE_START],
          outputRange: [0, 1],
          extrapolate: "clamp",
        })
      : 1;
  const centerTranslateY =
    fadeInHeader && scrollY
      ? scrollY.interpolate({
          inputRange: [FADE_START, HEADER_HEIGHT + FADE_START],
          outputRange: [20, 0],
          extrapolate: "clamp",
        })
      : 0;

  const [currentProgressIndex, setCurrentProgressIndex] = useState<number>((currentStep || 0) - 1);

  useEffect(() => {
    setCurrentProgressIndex((currentStep || 0) - 1);
  }, [currentStep]);

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: backgroundColor || "transparent",
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Center part */}
      <Animated.View
        style={[
          {
            alignItems: "center",
            gap: gap,
            marginVertical: containerPaddingVertical,
            width: headerMaxWidth,
          },
          showProgressBar
            ? { width: headerMaxWidth }
            : { maxWidth: headerMaxWidth },
          { opacity: centerOpacity, transform: [{ translateY: centerTranslateY }] },
        ]}
      >
        {showProgressBar ? (
          <View style={{ flexDirection: "row", gap: 4 }}>
            {Array.from({ length: totalSteps }, (_, index) => (
              <View
                key={index}
                style={{
                  width: (headerMaxWidth - 24) / totalSteps - 4,
                  height: 4,
                  backgroundColor:
                    index <= currentProgressIndex
                      ? theme.colors.object.secondary.selected
                      : theme.colors.object.secondary.default,
                  borderRadius: 100,
                }}
              />
            ))}
          </View>
        ) : (
          titleComponent || (
            <FoldText
              type="header-xxs"
              numberOfLines={2}
              style={{
                textAlign: "center",
                color: titleColor || headerTextColor,
              }}
            >
              {title}
            </FoldText>
          )
        )}
      </Animated.View>

      {/* Left side */}
      <View
        onLayout={(event) => {
          setLeftSideWidth(event.nativeEvent.layout.width);
        }}
        style={{
          alignItems: "flex-start",
          position: "absolute",
          left: 0,
          marginLeft: containerPaddingHorizontal,
          marginVertical: containerPaddingVertical,
          backgroundColor: backgroundColor || "transparent",
        }}
      >
        {leftComponent ||
          (leftIcon && onLeftPress && (
            <FoldPressable style={iconStyles} onPress={onLeftPress}>
              <View style={{ width: 24, height: 24, backgroundColor: "red" }} />
            </FoldPressable>
          ))}
      </View>

      {/* Right side */}
      <View
        onLayout={(event) => {
          setRightSideWidth(event.nativeEvent.layout.width);
        }}
        style={{
          alignItems: "flex-end",
          position: "absolute",
          right: 0,
          marginRight: containerPaddingHorizontal,
          marginVertical: containerPaddingVertical,
          backgroundColor: backgroundColor || "transparent",
        }}
      >
        {rightComponent ||
          (rightIcon && onRightPress && (
            <FoldPressable style={iconStyles} onPress={onRightPress}>
              <View style={{ width: 24, height: 24, backgroundColor: "red" }} />
            </FoldPressable>
          ))}
      </View>
    </View>
  );
};

export default FoldHeader;
export { FoldHeader };
