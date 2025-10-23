export type ForecastModel = 'prophet' | 'autogluon' | 'arima' | 'ar' | 'arma';

export interface ProphetParameters {
  growth: 'linear' | 'logistic';
  changepoint_prior_scale: number;
  seasonality_mode: 'additive' | 'multiplicative';
  seasonality_prior_scale: number;
  yearly_seasonality: boolean | number;
  weekly_seasonality: boolean | number;
  daily_seasonality: boolean | number;
  changepoint_range: number;
  cv_initial: number;
  cv_period: number;
  cv_horizon: number;
  custom_seasonalities?: CustomSeasonality[];
  interval_width: number; // Confidence interval width (e.g., 0.80 for 80%)
  lower_bound?: number; // Custom lower percentile (e.g., 0.05 for 5%)
  upper_bound?: number; // Custom upper percentile (e.g., 0.95 for 95%)
}

export interface CustomSeasonality {
  name: string;
  period: number;
  fourier_order: number;
  prior_scale?: number;
  mode?: 'additive' | 'multiplicative';
}

export interface AutogluonParameters {
  prediction_length: number;
  eval_metric: string;
  num_val_windows: number;
  interval_width: number;
  lower_bound?: number;
  upper_bound?: number;
}

export interface TraditionalTSParameters {
  order_p?: number; // AR order
  order_d?: number; // Differencing order
  order_q?: number; // MA order
  seasonal?: boolean;
  seasonal_order_P?: number;
  seasonal_order_D?: number;
  seasonal_order_Q?: number;
  seasonal_period?: number;
  confidence_level: number;
}

export interface Regressor {
  name: string;
  prior_scale?: number;
  standardize?: boolean | string;
  mode?: 'additive' | 'multiplicative';
  lead_lag?: number;
}

export interface SegmentConfig {
  segment: string;
  segmentValue: string; // The value in the segment column that identifies this segment
  regressors: Regressor[];
  forecast_periods: number;
  frequency: string;
  total_records: number;
  training_records: number;
  test_records: number; // Number of recent records to exclude for testing
  prophet_params?: ProphetParameters; // Segment-specific Prophet parameters
  autogluon_params?: AutogluonParameters; // Segment-specific AutoGluon parameters
  traditional_params?: TraditionalTSParameters; // Segment-specific traditional parameters
}

export interface ForecastConfig {
  model: ForecastModel;
  date_column: string;
  segment_column: string;
  dependent_variable: string;
  segments: SegmentConfig[];
  prophet_params?: ProphetParameters;
  autogluon_params?: AutogluonParameters;
  traditional_params?: TraditionalTSParameters;
  performance_metrics: PerformanceMetric[];
}

export type PerformanceMetric = 'mae' | 'rmse' | 'mape' | 'mse' | 'r2' | 'coverage' | 'smape' | 'mase';
