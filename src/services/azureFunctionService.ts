import type { ForecastConfig } from "@/types/forecast";
import type { ForecastResults } from "@/types/forecastResults";

/**
 * Configuration for the Azure Function service
 */
interface AzureFunctionConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * Azure Function API request payload
 */
interface ForecastRequest {
  config: ForecastConfig;
  data: Record<string, unknown>[];
}

/**
 * Azure Function API response
 */
interface ForecastResponse {
  success: boolean;
  results?: ForecastResults;
  error?: string;
  message?: string;
}

/**
 * Service class for interacting with the Python Azure Function
 * that handles Prophet and AutoGluon time series forecasting
 */
class AzureFunctionService {
  private config: AzureFunctionConfig;

  constructor(config?: Partial<AzureFunctionConfig>) {
    // Default to local development URL, can be overridden via environment variable
    this.config = {
      baseUrl: import.meta.env.VITE_AZURE_FUNCTION_URL || "http://localhost:7071/api",
      timeout: 300000, // 5 minutes default timeout for long-running forecasts
      ...config,
    };
  }

  /**
   * Run a forecast using the Azure Function
   */
  async runForecast(
    config: ForecastConfig,
    data: Record<string, unknown>[]
  ): Promise<ForecastResults> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const payload: ForecastRequest = {
        config,
        data,
      };

      const response = await fetch(`${this.config.baseUrl}/forecast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result: ForecastResponse = await response.json();

      if (!result.success || !result.results) {
        throw new Error(result.error || result.message || "Forecast failed");
      }

      return result.results;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            `Forecast request timed out after ${this.config.timeout / 1000} seconds`
          );
        }
        throw error;
      }
      throw new Error("Unknown error occurred during forecast");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check endpoint to verify Azure Function is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: "GET",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Update the base URL (useful for switching between local/production)
   */
  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }

  /**
   * Get current configuration
   */
  getConfig(): AzureFunctionConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const azureFunctionService = new AzureFunctionService();

// Also export the class for custom instances
export { AzureFunctionService };
export type { AzureFunctionConfig, ForecastRequest, ForecastResponse };
