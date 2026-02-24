export type ChartDataPoint = { timestamp: number; rate: number };

export type ExchangeRateResponse = {
  USD?: { BTC?: number };
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.foldapp.com";

async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}/v1${path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return (await response.json()) as T;
}

export async function getBitcoinChartData(timeRange: string): Promise<ChartDataPoint[]> {
  return apiGet<ChartDataPoint[]>(`/chart/bitcoin?time_range=${timeRange}`);
}

export async function getExchangeRate(): Promise<{ data: ExchangeRateResponse }> {
  return apiGet<{ data: ExchangeRateResponse }>("/exchange-rates");
}
