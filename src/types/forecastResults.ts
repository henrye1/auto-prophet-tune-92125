export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  is_test?: boolean;
  is_forecast?: boolean;
}

export interface SegmentForecastResult {
  segment: string;
  segmentValue: string;
  training_data: ForecastPoint[];
  test_data: ForecastPoint[];
  forecast_data: ForecastPoint[];
  metrics?: {
    mae?: number;
    rmse?: number;
    mape?: number;
    mse?: number;
    r2?: number;
    adj_r2?: number;
    coverage?: number;
    smape?: number;
    mase?: number;
  };
  ai_commentary?: string;
  model?: string;
  transformations_applied?: string[];
  // Raw data results (without transformations)
  raw_training_data?: ForecastPoint[];
  raw_test_data?: ForecastPoint[];
  raw_forecast_data?: ForecastPoint[];
  raw_metrics?: {
    mae?: number;
    rmse?: number;
    mape?: number;
    mse?: number;
    r2?: number;
    adj_r2?: number;
    coverage?: number;
    smape?: number;
    mase?: number;
  };
  // Benchmark model
  benchmark_model?: string;
  benchmark_training_data?: ForecastPoint[];
  benchmark_test_data?: ForecastPoint[];
  benchmark_forecast_data?: ForecastPoint[];
  benchmark_metrics?: {
    mae?: number;
    rmse?: number;
    mape?: number;
    mse?: number;
    r2?: number;
    adj_r2?: number;
    coverage?: number;
    smape?: number;
    mase?: number;
  };
}

export interface ForecastResults {
  segments: SegmentForecastResult[];
  model: string;
  timestamp: string;
}
