export type ForecastModel = 'prophet' | 'autogluon';

export interface ProphetParameters {
  growth: 'linear' | 'logistic';
  changepoint_prior_scale: number;
  seasonality_mode: 'additive' | 'multiplicative';
  seasonality_prior_scale: number;
  yearly_seasonality: boolean | 'auto';
  changepoint_range: number;
  cv_initial: number;
  cv_period: number;
  cv_horizon: number;
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
  regressors: Regressor[];
  forecast_periods: number;
  frequency: string;
  exclude_recent: number;
  start_row: number;
  end_row: number;
}

export interface ForecastConfig {
  model: ForecastModel;
  date_column: string;
  dependent_variable: string;
  segments: SegmentConfig[];
  prophet_params?: ProphetParameters;
  autogluon_params?: AutogluonParameters;
}
