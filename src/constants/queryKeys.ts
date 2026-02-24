export const queryKeys = {
  bitcoinChartKeys: (timeframe: string) => ["bitcoin-market-chart", timeframe] as const,
  exchangeRate: ["exchangeRate"] as const,
};
