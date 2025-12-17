import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { azureFunctionService } from "@/services/azureFunctionService";
import type { ForecastConfig } from "@/types/forecast";
import type { ForecastResults } from "@/types/forecastResults";

interface ForecastParams {
  config: ForecastConfig;
  data: Record<string, unknown>[];
}

/**
 * React Query hook for running forecasts via Azure Function
 *
 * @example
 * const { mutate, isLoading, error, data } = useForecast();
 *
 * mutate(
 *   { config, data },
 *   {
 *     onSuccess: (results) => console.log(results),
 *     onError: (error) => console.error(error)
 *   }
 * );
 */
export function useForecast(): UseMutationResult<
  ForecastResults,
  Error,
  ForecastParams
> {
  return useMutation({
    mutationFn: async ({ config, data }: ForecastParams) => {
      return await azureFunctionService.runForecast(config, data);
    },
  });
}
