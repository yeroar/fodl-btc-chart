export type FormattingUnit = "btc" | "mBTC" | "bits" | "sats" | "usd" | "percent";

export function formatValueToStringValue(
  value: number | string,
  format: FormattingUnit,
  options?: { hideUnit?: boolean; returnLongBtcVersion?: boolean }
): string {
  const v = typeof value === "string" ? Number(value) : value;
  const { hideUnit = false, returnLongBtcVersion = false } = options || {};

  switch (format) {
    case "usd": {
      return new Intl.NumberFormat("en-US", {
        ...(hideUnit ? {} : { style: "currency", currency: "USD" }),
        minimumFractionDigits: v % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2,
      }).format(v);
    }
    case "btc":
      return `${hideUnit ? "" : "\u20BF"}${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: returnLongBtcVersion ? 8 : 2,
        maximumFractionDigits: 8,
      }).format(v)}`;
    case "sats":
      return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(v))}${hideUnit ? "" : Math.abs(v) === 1 ? " sat" : " sats"}`;
    default:
      return String(v);
  }
}
