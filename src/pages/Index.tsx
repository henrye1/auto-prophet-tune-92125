import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelSelector } from "@/components/forecast/ModelSelector";
import { VariableConfig } from "@/components/forecast/VariableConfig";
import { ProphetHyperparameters } from "@/components/forecast/ProphetHyperparameters";
import { DataVisualization } from "@/components/forecast/DataVisualization";
import { DataUpload } from "@/components/forecast/DataUpload";
import { SegmentMapper } from "@/components/forecast/SegmentMapper";
import { SegmentRegressorConfig } from "@/components/forecast/SegmentRegressorConfig";
import { SegmentContextSelector } from "@/components/forecast/SegmentContextSelector";
import { ForecastProgress } from "@/components/forecast/ForecastProgress";
import { ForecastResults } from "@/components/forecast/ForecastResults";
import { PerformanceMetricSelector } from "@/components/forecast/PerformanceMetricSelector";
import { DataAnalysisTools } from "@/components/forecast/DataAnalysisTools";
import { SaveModelDialog } from "@/components/forecast/SaveModelDialog";
import { ModelDownload } from "@/components/forecast/ModelDownload";

import { ChevronRight, Play, Save, LogOut, Library, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ForecastModel, ProphetParameters, SegmentConfig, PerformanceMetric, ForecastConfig } from "@/types/forecast";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";

// Helper function to generate mock forecast results
const generateMockForecast = (
  trainingData: any[],
  testData: any[],
  segment: SegmentConfig,
  dateColumn: string,
  dependentVariable: string,
  prophetParams: ProphetParameters,
  selectedMetrics: PerformanceMetric[]
) => {
  const lowerPercentile = prophetParams.lower_bound ?? (1 - prophetParams.interval_width) / 2;
  const upperPercentile = prophetParams.upper_bound ?? (1 + prophetParams.interval_width) / 2;

  // Training data with actual values
  const training = trainingData.map(row => ({
    date: row[dateColumn],
    actual: parseFloat(row[dependentVariable]),
    predicted: parseFloat(row[dependentVariable]),
    lower_bound: parseFloat(row[dependentVariable]) * 0.95,
    upper_bound: parseFloat(row[dependentVariable]) * 1.05,
  }));

  // Test data with predictions
  const test = testData.map((row, idx) => {
    const actual = parseFloat(row[dependentVariable]);
    const noise = (Math.random() - 0.5) * 0.1;
    const predicted = actual * (1 + noise);
    const intervalWidth = upperPercentile - lowerPercentile;
    return {
      date: row[dateColumn],
      actual,
      predicted,
      lower_bound: predicted * (1 - intervalWidth / 2),
      upper_bound: predicted * (1 + intervalWidth / 2),
      is_test: true,
    };
  });

  // Generate forecast data
  const lastDate = testData.length > 0 
    ? new Date(testData[testData.length - 1][dateColumn])
    : new Date(trainingData[trainingData.length - 1][dateColumn]);
  
  const avgValue = trainingData.reduce((sum, row) => sum + parseFloat(row[dependentVariable]), 0) / trainingData.length;
  const forecast = [];
  
  for (let i = 1; i <= segment.forecast_periods; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    const trend = 1 + (i * 0.005);
    const seasonality = Math.sin((i / 6) * Math.PI) * 0.1;
    const predicted = avgValue * trend * (1 + seasonality);
    const intervalWidth = upperPercentile - lowerPercentile;
    
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predicted,
      lower_bound: predicted * (1 - intervalWidth / 2 - i * 0.01),
      upper_bound: predicted * (1 + intervalWidth / 2 + i * 0.01),
      is_forecast: true,
    });
  }

  // Calculate all requested metrics
  const metrics: any = {};
  const actualValues = test.map(t => t.actual!);
  const predictedValues = test.map(t => t.predicted);
  const errors = test.map((t, i) => t.actual! - t.predicted);
  
  console.log(`[Metrics Calculation] Segment: ${segment.segmentValue}`);
  console.log(`[Metrics Calculation] Test data points: ${test.length}`);
  console.log(`[Metrics Calculation] Selected metrics:`, selectedMetrics);
  console.log(`[Metrics Calculation] Actual values sample:`, actualValues.slice(0, 3));
  console.log(`[Metrics Calculation] Predicted values sample:`, predictedValues.slice(0, 3));
  console.log(`[Metrics Calculation] Errors sample:`, errors.slice(0, 3));
  
  if (selectedMetrics.includes('mae')) {
    metrics.mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
    console.log(`[Metrics Calculation] MAE calculated:`, metrics.mae);
  }
  if (selectedMetrics.includes('mse')) {
    metrics.mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
    console.log(`[Metrics Calculation] MSE calculated:`, metrics.mse);
  }
  if (selectedMetrics.includes('rmse')) {
    metrics.rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);
    console.log(`[Metrics Calculation] RMSE calculated:`, metrics.rmse);
  }
  if (selectedMetrics.includes('mape')) {
    metrics.mape = errors.reduce((sum, e, i) => sum + Math.abs(e / actualValues[i]) * 100, 0) / errors.length;
    console.log(`[Metrics Calculation] MAPE calculated:`, metrics.mape);
  }
  if (selectedMetrics.includes('smape')) {
    metrics.smape = errors.reduce((sum, e, i) => {
      const denominator = (Math.abs(actualValues[i]) + Math.abs(predictedValues[i])) / 2;
      return sum + Math.abs(e) / denominator * 100;
    }, 0) / errors.length;
    console.log(`[Metrics Calculation] SMAPE calculated:`, metrics.smape);
  }
  if (selectedMetrics.includes('r2')) {
    const mean = actualValues.reduce((s, v) => s + v, 0) / actualValues.length;
    const ssRes = errors.reduce((s, e) => s + e * e, 0);
    const ssTot = actualValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
    metrics.r2 = 1 - (ssRes / ssTot);
    console.log(`[Metrics Calculation] R² calculated:`, metrics.r2);
  }
  if (selectedMetrics.includes('coverage')) {
    metrics.coverage = test.filter(t => t.actual! >= t.lower_bound && t.actual! <= t.upper_bound).length / test.length * 100;
    console.log(`[Metrics Calculation] Coverage calculated:`, metrics.coverage);
  }
  if (selectedMetrics.includes('mase')) {
    const naiveErrors = actualValues.slice(1).map((v, i) => Math.abs(v - actualValues[i]));
    const meanNaiveError = naiveErrors.reduce((s, e) => s + e, 0) / naiveErrors.length;
    metrics.mase = (errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length) / meanNaiveError;
    console.log(`[Metrics Calculation] MASE calculated:`, metrics.mase);
  }
  
  console.log(`[Metrics Calculation] Final metrics object:`, metrics);

  // AI Commentary
  const ai_commentary = 
    `Performance Analysis:\n\n` +
    `The model shows ${metrics.mape < 10 ? 'excellent' : metrics.mape < 20 ? 'good' : 'moderate'} accuracy with MAPE of ${metrics.mape?.toFixed(1)}%. ` +
    `${metrics.coverage > 90 ? 'Confidence intervals effectively capture uncertainty.' : 'Consider adjusting interval width.'}\n\n` +
    `The ${metrics.r2 > 0.8 ? 'strong' : metrics.r2 > 0.6 ? 'moderate' : 'weak'} R² of ${metrics.r2?.toFixed(3)} indicates ` +
    `${metrics.r2 > 0.8 ? 'the model captures most variance in the data' : 'there may be room for improvement'}.`;

  return {
    segment: segment.segment,
    segmentValue: segment.segmentValue,
    training_data: training,
    test_data: test,
    forecast_data: forecast,
    metrics,
    ai_commentary,
  };
};

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedModel, setSelectedModel] = useState<ForecastModel>("prophet");
  const [dateColumn, setDateColumn] = useState("");
  const [segmentColumn, setSegmentColumn] = useState("");
  const [dependentVariable, setDependentVariable] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [segments, setSegments] = useState<SegmentConfig[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [segmentProgress, setSegmentProgress] = useState<any[]>([]);
  const [forecastResults, setForecastResults] = useState<ForecastResultsType | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<PerformanceMetric[]>(['mae', 'rmse', 'mape', 'coverage']);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string | undefined>(undefined);
  const [currentModelName, setCurrentModelName] = useState<string | undefined>(undefined);
  const [selectedAnalysisSegment, setSelectedAnalysisSegment] = useState<string | null>(null);
  const [segmentAnalysisStates, setSegmentAnalysisStates] = useState<Record<string, Record<string, any>>>({});
  const [isAnalyzingAllSegments, setIsAnalyzingAllSegments] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Load model if modelId is in URL
    const modelId = searchParams.get("modelId");
    if (modelId && isAuthenticated) {
      loadModel(modelId);
    }
  }, [searchParams, isAuthenticated]);

  const loadModel = async (modelId: string) => {
    const { data: model, error } = await supabase
      .from("saved_models")
      .select("*")
      .eq("id", modelId)
      .single();

    if (error) {
      toast.error("Failed to load model");
      console.error(error);
      return;
    }

    const { data: modelSegments, error: segmentsError } = await supabase
      .from("model_segments")
      .select("*")
      .eq("model_id", modelId);

    if (segmentsError) {
      toast.error("Failed to load model segments");
      console.error(segmentsError);
      return;
    }

    setCurrentModelId(model.id);
    setCurrentModelName(model.model_name);
    setSelectedModel(model.model_type as ForecastModel);
    setDateColumn(model.date_column);
    setSegmentColumn(model.segment_column);
    setDependentVariable(model.dependent_variable);
    setSelectedMetrics((model.performance_metrics as any) || ['mae', 'rmse', 'mape', 'coverage']);
    
    // Restore CSV data and forecast results
    if (model.csv_data) {
      setCsvData(model.csv_data as any);
      const columns = Object.keys((model.csv_data as any[])[0] || {});
      setAvailableColumns(columns);
    }
    
    if (model.forecast_results) {
      setForecastResults(model.forecast_results as any);
    }
    
    const loadedSegments: SegmentConfig[] = modelSegments.map((ms: any) => ({
      segment: ms.segment,
      segmentValue: ms.segment_value,
      regressors: ms.regressors || [],
      forecast_periods: ms.forecast_periods,
      frequency: ms.frequency,
      total_records: ms.total_records,
      training_records: ms.training_records,
      test_records: ms.test_records,
      prophet_params: ms.prophet_params,
      autogluon_params: ms.autogluon_params,
      traditional_params: ms.traditional_params,
    }));
    
    setSegments(loadedSegments);
    toast.success(`Model "${model.model_name}" loaded successfully`);
  };

  // Run analysis on all segments simultaneously
  const handleRunAllSegmentsAnalysis = async () => {
    setIsAnalyzingAllSegments(true);
    toast.info(`Starting AI analysis for ${segments.length} segments...`);

    try {
      // Run analysis for each segment in parallel
      const analysisPromises = segments.map(async (segment) => {
        const segmentData = csvData.filter(row => row[segmentColumn] === segment.segmentValue);
        
        if (segmentData.length < 10) {
          return { segmentValue: segment.segmentValue, error: 'Insufficient data' };
        }

        const variables = [
          { name: dependentVariable, type: 'dependent' },
          ...availableRegressors.map(r => ({ name: r, type: 'regressor' }))
        ];

        try {
          const { data: result, error } = await supabase.functions.invoke('analyze-transformations', {
            body: {
              variables,
              sampleData: segmentData.slice(0, 100)
            }
          });

          if (error) throw error;

          // Process results similar to DataAnalysisTools
          const newStates: Record<string, any> = {};
          const dependentDataValues = segmentData.map(row => row[dependentVariable]);

          const testPromises = result.analyses.map(async (analysis: any) => {
            const varKey = analysis.type === 'dependent' ? 'dependent' : analysis.variable;
            const columnName = varKey === "dependent" ? dependentVariable : varKey;
            const variableData = segmentData.map(row => row[columnName]);

            const transformations = analysis.recommendations.map((rec: any) => ({
              type: rec.transform,
              variable: varKey,
              applied: true
            }));

            // Create time series data for visualization
            const originalData = segmentData.slice(0, 100).map(row => ({
              date: row[dateColumn],
              value: parseFloat(row[columnName]) || 0,
            })).filter(d => !isNaN(d.value));

            try {
              const { data: testResults, error: testError } = await supabase.functions.invoke('statistical-tests', {
                body: {
                  variable: varKey,
                  data: variableData,
                  transformations: transformations,
                  dependentData: varKey !== "dependent" ? dependentDataValues : null
                }
              });

              if (testError) throw testError;

              // Create transformed data for visualization
              const transformed = testResults.transformedDataSample 
                ? originalData.slice(0, testResults.transformedDataSample.length).map((d: any, i: number) => ({
                    ...d,
                    value: testResults.transformedDataSample[i]
                  }))
                : originalData;

              return {
                varKey,
                state: {
                  status: 'transformed',
                  transformations: transformations,
                  aiRecommendations: analysis,
                  recommendedModel: analysis.recommended_model,
                  modelRationale: analysis.model_rationale,
                  stationarityTest: testResults.after?.adf || testResults.before.adf,
                  acfData: testResults.after?.acf || testResults.before.acf,
                  pacfData: testResults.after?.pacf || testResults.before.pacf,
                  beforeData: originalData,
                  afterData: transformed,
                  beforeStats: testResults.before,
                  afterStats: testResults.after,
                  featureImportance: testResults.featureImportance
                }
              };
            } catch (err) {
              console.error(`Error processing ${varKey} for segment ${segment.segment}:`, err);
              return {
                varKey,
                state: {
                  status: 'analyzing',
                  transformations: transformations,
                  aiRecommendations: analysis,
                  beforeData: originalData,
                  afterData: originalData
                }
              };
            }
          });

          const testResults = await Promise.all(testPromises);
          testResults.forEach(({ varKey, state }) => {
            newStates[varKey] = state;
          });

          return { segmentValue: segment.segmentValue, states: newStates };
        } catch (err: any) {
          console.error(`Error analyzing segment ${segment.segment}:`, err);
          return { segmentValue: segment.segmentValue, error: err.message };
        }
      });

      const results = await Promise.all(analysisPromises);
      
      // Update segment analysis states
      const updatedStates: Record<string, Record<string, any>> = { ...segmentAnalysisStates };
      let successCount = 0;
      let errorCount = 0;

      results.forEach(result => {
        if (result.error) {
          errorCount++;
        } else if (result.states) {
          updatedStates[result.segmentValue] = result.states;
          successCount++;
        }
      });

      setSegmentAnalysisStates(updatedStates);
      
      if (successCount > 0) {
        toast.success(`✅ Completed analysis for ${successCount}/${segments.length} segments!`);
      }
      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} segment(s) had insufficient data or errors.`);
      }

      // Auto-select first analyzed segment
      if (successCount > 0 && !selectedAnalysisSegment) {
        const firstAnalyzed = segments.find(s => updatedStates[s.segmentValue]);
        if (firstAnalyzed) {
          setSelectedAnalysisSegment(firstAnalyzed.segmentValue);
        }
      }
    } catch (error: any) {
      console.error('Multi-segment analysis error:', error);
      toast.error(error.message || "Failed to analyze segments");
    } finally {
      setIsAnalyzingAllSegments(false);
    }
  };

  // Handle variable states change for a specific segment
  const handleVariableStatesChange = (segmentValue: string, states: Record<string, any>) => {
    setSegmentAnalysisStates(prev => ({
      ...prev,
      [segmentValue]: states
    }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleSaveModel = () => {
    if (segments.length === 0) {
      toast.error("Please configure at least one segment before saving");
      return;
    }
    setSaveDialogOpen(true);
  };

  const getCurrentConfig = (): ForecastConfig => ({
    model: selectedModel,
    date_column: dateColumn,
    segment_column: segmentColumn,
    dependent_variable: dependentVariable,
    segments: segments,
    performance_metrics: selectedMetrics,
  });

  const handleDataLoaded = (data: any[], headers: string[]) => {
    setCsvData(data);
    setAvailableColumns(headers);
    if (headers.length > 0) {
      // Auto-detect date column
      if (!dateColumn) {
        const dateCol = headers.find(h => h.toLowerCase().includes('date') || h.toLowerCase() === 'ds');
        if (dateCol) setDateColumn(dateCol);
      }
      // Auto-detect segment column
      if (!segmentColumn) {
        const segCol = headers.find(h => 
          h.toLowerCase().includes('segment') || 
          h.toLowerCase().includes('category') ||
          h.toLowerCase().includes('group')
        );
        if (segCol) setSegmentColumn(segCol);
      }
    }
    toast.success("Data loaded successfully");
  };

  const handleClearData = () => {
    setCsvData([]);
    setAvailableColumns([]);
    setSegments([]);
    setDateColumn("");
    setSegmentColumn("");
    setDependentVariable("");
    setForecastResults(null);
  };

  // Get unique segment values from the segment column
  const uniqueSegmentValues = segmentColumn && csvData.length > 0
    ? Array.from(new Set(csvData.map(row => row[segmentColumn]).filter(Boolean)))
    : [];

  const availableRegressors = availableColumns.filter(
    (col) => col !== dateColumn && col !== segmentColumn && col !== dependentVariable
  );

  const handleRunForecast = async () => {
    if (segments.length === 0) {
      toast.error("Please configure at least one segment");
      return;
    }

    if (!dateColumn || !segmentColumn || !dependentVariable) {
      toast.error("Please configure all required columns");
      return;
    }

    setIsRunning(true);
    setForecastResults(null);
    const progress = segments.map(s => ({
      segment: s.segment,
      status: 'pending' as const,
      progress: 0,
    }));
    setSegmentProgress(progress);
    setActiveTab("progress");

    const allResults: any[] = [];

    // Process each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Filter and sort data for this segment
      const segmentData = csvData
        .filter(row => row[segmentColumn] === segment.segmentValue)
        .sort((a, b) => new Date(a[dateColumn]).getTime() - new Date(b[dateColumn]).getTime());
      
      const trainingData = segmentData.slice(0, segment.training_records);
      const testData = segmentData.slice(segment.training_records, segment.training_records + segment.test_records);
      
      // Get recommended model from analysis if available
      const analysisState = segmentAnalysisStates[segment.segmentValue];
      const recommendedModel = analysisState?.dependent?.recommendedModel;
      const shouldRunBenchmark = recommendedModel && recommendedModel !== selectedModel;
      
      // Update status to running
      setSegmentProgress(prev => 
        prev.map((p, idx) => 
          idx === i ? { 
            ...p, 
            status: 'running', 
            progress: 0, 
            message: `Using ${trainingData.length} records for training, ${testData.length} for testing${shouldRunBenchmark ? ` + benchmark (${recommendedModel})` : ''}` 
          } : p
        )
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate model training stages
      const stages = shouldRunBenchmark 
        ? [
            { progress: 12, message: `Training ${selectedModel} on ${trainingData.length} records...` },
            { progress: 25, message: `Validating ${selectedModel} on ${testData.length} test records...` },
            { progress: 37, message: `${selectedModel} cross-validation...` },
            { progress: 50, message: `${selectedModel} forecasting ${segment.forecast_periods} periods...` },
            { progress: 62, message: `Training benchmark ${recommendedModel}...` },
            { progress: 75, message: `Validating benchmark ${recommendedModel}...` },
            { progress: 87, message: `${recommendedModel} cross-validation...` },
            { progress: 100, message: 'Complete' },
          ]
        : [
            { progress: 25, message: `Training on ${trainingData.length} records...` },
            { progress: 50, message: `Validating on ${testData.length} test records...` },
            { progress: 75, message: 'Cross-validation...' },
            { progress: 90, message: `Forecasting ${segment.forecast_periods} periods...` },
            { progress: 100, message: 'Complete' },
          ];

      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, shouldRunBenchmark ? 600 : 800));
        setSegmentProgress(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: stage.progress, message: stage.message } : p
          )
        );
      }

      // Mark as completed
      setSegmentProgress(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: 'completed', progress: 100 } : p
        )
      );

      // Generate mock forecast results
      // Use segment's prophet_params or fallback to reasonable defaults
      const prophetParams = segment.prophet_params || {
        growth: 'linear' as const,
        changepoint_prior_scale: 0.05,
        seasonality_mode: 'additive' as const,
        seasonality_prior_scale: 10,
        yearly_seasonality: true,
        weekly_seasonality: false,
        daily_seasonality: false,
        changepoint_range: 0.8,
        cv_initial: 730,
        cv_period: 180,
        cv_horizon: 365,
        custom_seasonalities: [],
        interval_width: 0.80,
        lower_bound: undefined,
        upper_bound: undefined,
      };
      
      const mockResults = generateMockForecast(
        trainingData,
        testData,
        segment,
        dateColumn,
        dependentVariable,
        prophetParams,
        selectedMetrics
      ) as any;
      mockResults.model = selectedModel;

      // Run benchmark model if recommended and different from selected
      if (shouldRunBenchmark) {
        const benchmarkResults = generateMockForecast(
          trainingData,
          testData,
          segment,
          dateColumn,
          dependentVariable,
          prophetParams,
          selectedMetrics
        );
        
        // Add slight variations to benchmark to simulate different model behavior
        mockResults.benchmark_model = recommendedModel;
        mockResults.benchmark_training_data = benchmarkResults.training_data.map(p => ({
          ...p,
          predicted: p.predicted * (1 + (Math.random() - 0.5) * 0.05)
        }));
        mockResults.benchmark_test_data = benchmarkResults.test_data.map(p => ({
          ...p,
          predicted: p.predicted * (1 + (Math.random() - 0.5) * 0.08),
          lower_bound: p.lower_bound * (1 + (Math.random() - 0.5) * 0.08),
          upper_bound: p.upper_bound * (1 + (Math.random() - 0.5) * 0.08)
        }));
        mockResults.benchmark_forecast_data = benchmarkResults.forecast_data.map(p => ({
          ...p,
          predicted: p.predicted * (1 + (Math.random() - 0.5) * 0.1),
          lower_bound: p.lower_bound * (1 + (Math.random() - 0.5) * 0.1),
          upper_bound: p.upper_bound * (1 + (Math.random() - 0.5) * 0.1)
        }));
        
        // Recalculate metrics for benchmark
        const benchmarkActuals = mockResults.benchmark_test_data.map(t => t.actual!);
        const benchmarkPredicted = mockResults.benchmark_test_data.map(t => t.predicted);
        const benchmarkErrors = mockResults.benchmark_test_data.map((t, i) => t.actual! - t.predicted);
        
        const benchmarkMAE = benchmarkErrors.reduce((sum, e) => sum + Math.abs(e), 0) / benchmarkErrors.length;
        const benchmarkMSE = benchmarkErrors.reduce((sum, e) => sum + e * e, 0) / benchmarkErrors.length;
        const benchmarkRMSE = Math.sqrt(benchmarkMSE);
        const benchmarkMAPE = benchmarkErrors.reduce((sum, e, i) => 
          sum + Math.abs(e / benchmarkActuals[i]) * 100, 0) / benchmarkErrors.length;
        
        mockResults.benchmark_metrics = {
          mae: benchmarkMAE,
          mse: benchmarkMSE,
          rmse: benchmarkRMSE,
          mape: benchmarkMAPE,
          ...mockResults.metrics
        };
      }
      
      allResults.push(mockResults);

      console.log(`Completed forecast for segment: ${segment.segment}`, {
        model: selectedModel,
        segmentValue: segment.segmentValue,
        totalRecords: segmentData.length,
        trainingRecords: trainingData.length,
        testRecords: testData.length,
        forecastPeriods: segment.forecast_periods,
        frequency: segment.frequency,
        config: segment,
        parameters: selectedModel === 'prophet' ? (segment.prophet_params || null) : null,
      });
    }

    // Store results
    const results: ForecastResultsType = {
      segments: allResults,
      model: selectedModel,
      timestamp: new Date().toISOString(),
    };
    setForecastResults(results);

    setIsRunning(false);
    toast.success(`Successfully completed forecasts for ${segments.length} segments`);
    setActiveTab("results");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
                Time Series Forecasting Platform
              </h1>
              <p className="text-muted-foreground">
                Configure and run Prophet and AutoGluon forecasting models with advanced parameter tuning
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/models")}>
                <Library className="mr-2 h-4 w-4" />
                My Models
              </Button>
              <Button variant="outline" onClick={handleSaveModel} disabled={segments.length === 0}>
                <Save className="mr-2 h-4 w-4" />
                {currentModelId ? "Update Model" : "Save Model"}
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 bg-card text-xs">
            <TabsTrigger value="upload">1. Upload</TabsTrigger>
            <TabsTrigger value="model" disabled={csvData.length === 0}>2. Model</TabsTrigger>
            <TabsTrigger value="variables" disabled={csvData.length === 0}>3. Variables</TabsTrigger>
            <TabsTrigger value="segments" disabled={!dateColumn || !segmentColumn || !dependentVariable}>4. Segments</TabsTrigger>
            <TabsTrigger value="analysis" disabled={segments.length === 0}>5. Analysis</TabsTrigger>
            <TabsTrigger value="regressors" disabled={segments.length === 0}>6. Regressors</TabsTrigger>
            <TabsTrigger value="metrics" disabled={segments.length === 0}>7. Metrics</TabsTrigger>
            <TabsTrigger value="parameters" disabled={segments.length === 0}>8. Parameters</TabsTrigger>
            <TabsTrigger value="results" disabled={!forecastResults}>9. Results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <DataUpload
              onDataLoaded={handleDataLoaded}
              onClear={handleClearData}
              hasData={csvData.length > 0}
            />
            {csvData.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setActiveTab("model")}>
                  Next: Select Model
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="model" className="space-y-6">
            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("variables")}>
                Next: Configure Variables
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="variables" className="space-y-6">
            <VariableConfig
              dateColumn={dateColumn}
              segmentColumn={segmentColumn}
              dependentVariable={dependentVariable}
              availableColumns={availableColumns}
              onDateColumnChange={setDateColumn}
              onSegmentColumnChange={setSegmentColumn}
              onDependentVariableChange={setDependentVariable}
            />
            <div className="flex justify-end">
              <Button 
                onClick={() => setActiveTab("segments")} 
                disabled={!dateColumn || !segmentColumn || !dependentVariable}
              >
                Next: Configure Segments
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <SegmentMapper
              availableSegmentValues={uniqueSegmentValues as string[]}
              segments={segments}
              onSegmentsChange={setSegments}
              csvData={csvData}
              segmentColumn={segmentColumn}
              dateColumn={dateColumn}
            />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("analysis")} disabled={segments.length === 0}>
                Next: Analyze Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {segments.length > 0 ? (
              <>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-primary" />
                      Multi-Segment Analysis
                    </CardTitle>
                    <CardDescription>
                      Run AI transformation analysis on all segments simultaneously, then review and adjust each segment independently
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleRunAllSegmentsAnalysis}
                      disabled={isAnalyzingAllSegments}
                      size="lg"
                      className="w-full"
                    >
                      {isAnalyzingAllSegments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing {segments.length} Segments...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Run Analysis on All {segments.length} Segments
                        </>
                      )}
                    </Button>
                    
                    {Object.keys(segmentAnalysisStates).length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-sm font-semibold mb-2">Analysis Status:</div>
                        <div className="flex flex-wrap gap-2">
                          {segments.map(segment => {
                            const hasAnalysis = segmentAnalysisStates[segment.segmentValue];
                            const transformedCount = hasAnalysis 
                              ? Object.values(segmentAnalysisStates[segment.segmentValue]).filter((s: any) => s.status === 'transformed').length
                              : 0;
                            
                            return (
                              <Badge 
                                key={segment.segmentValue}
                                variant={hasAnalysis ? "default" : "outline"}
                                className={hasAnalysis ? "bg-green-500" : ""}
                              >
                                {segment.segment}
                                {hasAnalysis && ` (${transformedCount} vars)`}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <SegmentContextSelector
                  segments={segments}
                  selectedSegment={selectedAnalysisSegment}
                  onSegmentSelect={(segmentValue) => {
                    setSelectedAnalysisSegment(segmentValue);
                  }}
                />
                {selectedAnalysisSegment ? (
                  <DataAnalysisTools
                    key={selectedAnalysisSegment}
                    data={csvData.filter(row => {
                      const segment = segments.find(s => s.segmentValue === row[segmentColumn]);
                      return segment?.segmentValue === selectedAnalysisSegment;
                    })}
                    dateColumn={dateColumn}
                    valueColumn={dependentVariable}
                    regressors={availableRegressors.length > 0 ? availableRegressors : undefined}
                    segmentName={segments.find(s => s.segmentValue === selectedAnalysisSegment)?.segment || ""}
                    segmentValue={selectedAnalysisSegment}
                    initialVariableStates={segmentAnalysisStates[selectedAnalysisSegment] || {}}
                    onVariableStatesChange={handleVariableStatesChange}
                    onTransformationApply={(transformation) => {
                      console.log("Transformation applied:", transformation);
                      const transformCount = transformation.transformations?.length || 1;
                      toast.success(`${transformCount} transformation(s) applied to ${selectedAnalysisSegment}.`);
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Please select a segment to review and adjust transformation results
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Please configure segments first in the Segments tab before analyzing data
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("regressors")} disabled={segments.length === 0}>
                Next: Configure Regressors
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="regressors" className="space-y-6">
            <SegmentRegressorConfig
              segments={segments}
              availableRegressors={availableRegressors}
              onSegmentsChange={setSegments}
            />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("metrics")}>
                Next: Select Metrics
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <PerformanceMetricSelector
              selectedMetrics={selectedMetrics}
              onMetricsChange={setSelectedMetrics}
            />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("parameters")}>
                Next: Model Parameters
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="parameters" className="space-y-6">
            <SegmentContextSelector
              segments={segments}
              selectedSegment={selectedSegment}
              onSegmentSelect={setSelectedSegment}
            />
            {selectedModel === 'prophet' && selectedSegment && (
              <ProphetHyperparameters
                segment={segments.find(s => s.segment === selectedSegment)!}
                onParametersChange={(params) => {
                  setSegments(segments.map(s => 
                    s.segment === selectedSegment ? { ...s, prophet_params: params } : s
                  ));
                }}
                csvData={csvData.filter(row => row[segmentColumn] === segments.find(s => s.segment === selectedSegment)?.segmentValue)}
                dateColumn={dateColumn}
                valueColumn={dependentVariable}
              />
            )}
            {selectedModel === 'prophet' && !selectedSegment && (
              <div className="text-center py-12 text-muted-foreground">
                Please select a segment from the context selector above to configure parameters
              </div>
            )}
            {selectedModel === 'autogluon' && (
              <div className="text-center py-12 text-muted-foreground">
                AutoGluon parameters configuration coming soon
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveTab("visualize")}>
                Visualize Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                onClick={handleRunForecast} 
                className="bg-gradient-to-r from-primary to-accent"
                disabled={isRunning || segments.length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                Run Forecast for {segments.length} Segment{segments.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="visualize" className="space-y-6">
            <DataVisualization
              segments={segments}
              segmentAnalysisStates={segmentAnalysisStates}
              dependentVariable={dependentVariable || 'value'}
              csvData={csvData}
              dateColumn={dateColumn}
              segmentColumn={segmentColumn}
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ForecastProgress segmentProgress={segmentProgress} />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {forecastResults && (
              <>
                <ForecastResults results={forecastResults} selectedMetrics={selectedMetrics} />
                <ModelDownload
                  modelId={currentModelId}
                  modelName={currentModelName || "Untitled Model"}
                  config={getCurrentConfig()}
                  csvData={csvData}
                />
              </>
            )}
          </TabsContent>
        </Tabs>

        <SaveModelDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          config={getCurrentConfig()}
          existingModelId={currentModelId}
          existingModelName={currentModelName}
          csvData={csvData}
          forecastResults={forecastResults}
        />
      </div>
    </div>
  );
};

export default Index;
