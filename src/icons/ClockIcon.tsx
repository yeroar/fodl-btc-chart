import Svg, { Path, type SvgProps } from "react-native-svg";

interface IProps extends SvgProps {}

export const ClockIcon = (props: IProps) => {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" {...props}>
      <Path d="M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M11 6a1 1 0 1 1 2 0v5.382l3.447 1.723.09.051a1 1 0 0 1-.89 1.78l-.094-.041-4-2A1 1 0 0 1 11 12zm12 6c0 6.075-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1s11 4.925 11 11" />
    </Svg>
  );
};
