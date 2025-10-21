export type ForecastModel = 'prophet' | 'autogluon';

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
}

export interface ForecastConfig {
  model: ForecastModel;
  date_column: string;
  segment_column: string;
  dependent_variable: string;
  segments: SegmentConfig[];
  prophet_params?: ProphetParameters;
  autogluon_params?: AutogluonParameters;
}
