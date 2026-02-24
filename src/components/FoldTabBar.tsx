import * as Haptics from "expo-haptics";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UnistylesRuntime } from "react-native-unistyles";
import { NavBankDuoIcon } from "../icons/NavBankDuoIcon";
import { NavExchangeSolidIcon } from "../icons/NavExchangeSolidIcon";
import { NavTagDuoIcon } from "../icons/NavTagDuoIcon";

export const FoldTabBar = () => {
  const theme = UnistylesRuntime.getTheme();
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: "bank", icon: <NavBankDuoIcon />, active: false },
    { key: "exchange", icon: <NavExchangeSolidIcon fill={theme.colors.face.primary} />, active: true },
    { key: "shop", icon: <NavTagDuoIcon />, active: false },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.object.primary.bold.default,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.primary,
        paddingBottom: insets.bottom,
      }}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            height: 48,
          }}
        >
          {tab.icon}
        </TouchableOpacity>
      ))}
    </View>
  );
};
