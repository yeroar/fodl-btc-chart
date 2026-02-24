import Svg, { Path, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {}

export const MenuIcon = (props: IProps) => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" {...props}>
      <Path d="M21 14.5a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2zm0-7a1 1 0 1 1 0 2H3a1 1 0 0 1 0-2z" />
    </Svg>
  );
};
