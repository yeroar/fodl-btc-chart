import { StyleSheet } from "react-native-unistyles";
import { type Themes, themes } from "./index";
import { type Breakpoints, breakpoints } from "./size/breakpoints";

declare module "react-native-unistyles" {
  export interface UnistylesThemes extends Themes {}
  export interface UnistylesBreakpoints extends Breakpoints {}
}

StyleSheet.configure({
  settings: { adaptiveThemes: true },
  breakpoints,
  themes,
});
