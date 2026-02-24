import BigNumber from "bignumber.js";

BigNumber.config({ DECIMAL_PLACES: 20, ROUNDING_MODE: BigNumber.ROUND_HALF_UP });

export enum UNIT {
  BTC = "BTC", MBTC = "mBTC", BITS = "bits", SATS = "sats", USD = "USD",
}

const UNIT_MAP: Record<Exclude<UNIT, UNIT.USD>, string> = {
  [UNIT.BTC]: "1", [UNIT.MBTC]: "0.001", [UNIT.BITS]: "0.000001", [UNIT.SATS]: "0.00000001",
};

export function foldConversionUtil(value: number | string, from: UNIT, to: UNIT, btcToUsdRate: number | string | undefined = 0): number {
  const val = new BigNumber(value === "" ? 0 : value);
  const rate = new BigNumber(btcToUsdRate === "" ? 0 : (btcToUsdRate ?? 0));
  if (from === to) return val.toNumber();
  let btcValue: BigNumber;
  if (from === UNIT.USD) {
    btcValue = rate.isZero() ? new BigNumber(0) : val.dividedBy(rate);
  } else {
    btcValue = val.times(UNIT_MAP[from]);
  }
  if (to === UNIT.USD) return btcValue.times(rate).toNumber();
  return btcValue.dividedBy(UNIT_MAP[to]).toNumber();
}
