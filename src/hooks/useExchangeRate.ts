import { useQuery } from "@tanstack/react-query";
import { getExchangeRate } from "../api/api";
import { queryKeys } from "../constants/queryKeys";

export const useExchangeRate = (options?: { enabled?: boolean }) => {
  const query = useQuery({
    queryKey: queryKeys.exchangeRate,
    queryFn: getExchangeRate,
    staleTime: 1000 * 15,
    ...options,
  });

  return {
    ...query,
    btcConversionRate: query.data?.data?.USD?.BTC,
  };
};
