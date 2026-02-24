import { useExchangeRate } from "../hooks/useExchangeRate";
import { foldConversionUtil, UNIT } from "../utils/conversions";
import { type FormattingUnit, formatValueToStringValue } from "../utils/stringFormats";
import { FoldText, type FoldTextProps } from "./FoldText";

interface FoldConversionTextProps extends Omit<FoldTextProps, "children"> {
  value: number;
  fromUnit: UNIT;
  toUnit: UNIT;
  btcToUsdRate?: number;
  hideNegativeSign?: boolean;
  hideUnit?: boolean;
  returnLongBtcVersion?: boolean;
}

const toFmt = (u: UNIT): FormattingUnit => {
  switch (u) {
    case UNIT.BTC: return "btc";
    case UNIT.USD: return "usd";
    case UNIT.MBTC: return "mBTC";
    case UNIT.BITS: return "bits";
    case UNIT.SATS: return "sats";
  }
};

export const FoldConversionText = ({ value, fromUnit, toUnit, btcToUsdRate, hideNegativeSign, hideUnit, returnLongBtcVersion, ...rest }: FoldConversionTextProps) => {
  const { btcConversionRate } = useExchangeRate({ enabled: btcToUsdRate === undefined });
  const formatted = formatValueToStringValue(
    foldConversionUtil(value, fromUnit, toUnit, btcToUsdRate ?? btcConversionRate),
    toFmt(toUnit),
    { hideUnit, returnLongBtcVersion }
  );
  const content = hideNegativeSign ? formatted.replace("-", "") : formatted;
  return <FoldText {...rest}>{content}</FoldText>;
};
