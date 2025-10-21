export interface StationarityTestResult {
  test_statistic: number;
  p_value: number;
  critical_values: Record<string, number>;
  is_stationary: boolean;
  recommendation: string;
}

export interface ACFResult {
  lags: number[];
  correlations: number[];
  confidence_interval: number;
}

export interface PACFResult {
  lags: number[];
  correlations: number[];
  confidence_interval: number;
}

export interface DataTransformation {
  type: 'log' | 'difference' | 'seasonal_difference' | 'box_cox' | 'none';
  variable?: string;
  parameters?: {
    seasonal_period?: number;
    lambda?: number;
  };
  applied: boolean;
}

export interface TransformationChain {
  transformations: DataTransformation[];
  stationarityBeforeTests: StationarityTestResult[];
  stationarityAfterTest?: StationarityTestResult;
}

export interface TransformationInfo {
  name: string;
  description: string;
  useCase: string;
  example: string;
}

export interface DataAnalysisResults {
  stationarity_test?: StationarityTestResult;
  acf?: ACFResult;
  pacf?: PACFResult;
  transformations: DataTransformation[];
  ai_insights?: string;
}
