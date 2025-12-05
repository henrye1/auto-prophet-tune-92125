// Data analysis and transformation types

// Stationarity test results
export interface StationarityTestResult {
  testStatistic: number;
  pValue: number;
  criticalValues: Record<string, number>;
  isStationary: boolean;
  recommendation: string;
}

// Autocorrelation results
export interface AutocorrelationResult {
  lag: number;
  acf: number;
  pacf: number;
  significanceBound: number;
}

// Transformation recommendation
export interface TransformationRecommendation {
  type: "log" | "difference" | "seasonal_difference" | "sqrt" | "box_cox" | "standardize" | "none";
  reason: string;
  priority: number;
  parameters?: {
    order?: number;
    seasonalPeriod?: number;
    lambda?: number;
  };
}

// Data characteristics
export interface DataCharacteristics {
  hasTrend: boolean;
  hasSeasonality: boolean;
  seasonalPeriod?: number;
  hasVarianceInstability: boolean;
  hasOutliers: boolean;
  outlierCount: number;
  missingValueCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  recordCount: number;
}

// Complete analysis result for a segment
export interface SegmentAnalysisResult {
  segmentName: string;
  characteristics: DataCharacteristics;
  stationarityTest: StationarityTestResult;
  autocorrelation: AutocorrelationResult[];
  recommendations: TransformationRecommendation[];
  transformedStationarityTest?: StationarityTestResult;
}

// Analysis state for UI
export interface AnalysisState {
  isLoading: boolean;
  isComplete: boolean;
  error?: string;
  result?: SegmentAnalysisResult;
  selectedTransformations: TransformationRecommendation[];
}
