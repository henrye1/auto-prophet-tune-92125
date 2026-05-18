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
// import { SaveModelDialog } from "@/components/forecast/SaveModelDialog";
import { ModelDownload } from "@/components/forecast/ModelDownload";

import { ChevronRight, Play, Save, LogOut, Library, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ForecastModel, ProphetParameters, SegmentConfig, PerformanceMetric, ForecastConfig } from "@/types/forecast";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";

const FORECAST_API_URL =
  (import.meta.env.VITE_FORECAST_API_URL as string | undefined) ??
  "http://127.0.0.1:8000";

async function fetchForecast(args: {
  model: ForecastModel;
  dateColumn: string;
  dependentVariable: string;
  trainingData: any[];
  testData: any[];
  segment: SegmentConfig;
  prophetParams: ProphetParameters;
  selectedMetrics: PerformanceMetric[];
}) {
  const response = await fetch(`${FORECAST_API_URL}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model,
      date_column: args.dateColumn,
      dependent_variable: args.dependentVariable,
      training_data: args.trainingData,
      test_data: args.testData,
      segment: {
        segment: args.segment.segment,
        segmentValue: args.segment.segmentValue,
        regressors: args.segment.regressors,
        forecast_periods: args.segment.forecast_periods,
        frequency: args.segment.frequency,
      },
      prophet_params: args.prophetParams,
      selected_metrics: args.selectedMetrics,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      detail = JSON.parse(text).detail ?? text;
    } catch {
      // not JSON, use raw text
    }
    throw new Error(detail || `Forecast API returned ${response.status}`);
  }

  return response.json();
}

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

  // Temporarily disabled until database types sync
  // useEffect(() => {
  //   const modelId = searchParams.get("modelId");
  //   if (modelId && isAuthenticated) {
  //     loadModel(modelId);
  //   }
  // }, [searchParams, isAuthenticated]);

  // const loadModel = async (modelId: string) => {
  //   toast.info("Model loading temporarily disabled");
  // };

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
      const rawSegmentData = csvData
        .filter(row => row[segmentColumn] === segment.segmentValue)
        .sort((a, b) => new Date(a[dateColumn]).getTime() - new Date(b[dateColumn]).getTime());
      
      // Get analysis state and apply transformations if available
      const analysisState = segmentAnalysisStates[segment.segmentValue];
      let transformedSegmentData = rawSegmentData;
      let transformationsSummary: string[] = [];
      let hasTransformations = false;
      
      if (analysisState && Object.keys(analysisState).length > 0) {
        const { applyAnalysisTransformations } = await import('@/utils/dataAnalysis');
        const result = applyAnalysisTransformations(
          JSON.parse(JSON.stringify(rawSegmentData)), // Deep clone
          dateColumn,
          dependentVariable,
          segment.regressors.map(r => r.name),
          analysisState
        );
        transformedSegmentData = result.transformedData;
        transformationsSummary = result.transformationsSummary;
        hasTransformations = transformationsSummary.length > 0;
      }
      
      // Prepare both raw and transformed datasets
      const rawTrainingData = rawSegmentData.slice(0, segment.training_records);
      const rawTestData = rawSegmentData.slice(segment.training_records, segment.training_records + segment.test_records);
      
      const transformedTrainingData = transformedSegmentData.slice(0, segment.training_records);
      const transformedTestData = transformedSegmentData.slice(segment.training_records, segment.training_records + segment.test_records);
      
      // Get recommended model from analysis if available
      const recommendedModel = analysisState?.dependent?.recommendedModel;
      const shouldRunBenchmark = recommendedModel && recommendedModel !== selectedModel;
      
      const prophetParams: ProphetParameters = segment.prophet_params || {
        growth: 'linear',
        changepoint_prior_scale: 0.05,
        seasonality_mode: 'additive',
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

      if (shouldRunBenchmark) {
        console.warn(
          `[Benchmark] Skipping benchmark model "${recommendedModel}" for segment ${segment.segment} — only 'prophet' is supported by the v1 backend.`
        );
      }

      setSegmentProgress(prev =>
        prev.map((p, idx) =>
          idx === i ? {
            ...p,
            status: 'running',
            progress: 30,
            message: `Fitting Prophet on ${transformedTrainingData.length} records${hasTransformations ? ' (transformed)' : ''}...`
          } : p
        )
      );

      let segmentResult: any;
      try {
        segmentResult = await fetchForecast({
          model: selectedModel,
          dateColumn,
          dependentVariable,
          trainingData: transformedTrainingData,
          testData: transformedTestData,
          segment,
          prophetParams,
          selectedMetrics,
        });
      } catch (err: any) {
        console.error(`Forecast failed for segment ${segment.segment}:`, err);
        toast.error(`Segment ${segment.segment}: ${err.message ?? 'Forecast failed'}`);
        setSegmentProgress(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'completed', progress: 100, message: `Failed: ${err.message ?? 'error'}` } : p
          )
        );
        continue;
      }

      segmentResult.model = selectedModel;
      segmentResult.transformations_applied = transformationsSummary;
      segmentResult.interval_width = prophetParams.interval_width;
      segmentResult.lower_bound = prophetParams.lower_bound;
      segmentResult.upper_bound = prophetParams.upper_bound;

      if (hasTransformations) {
        setSegmentProgress(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, progress: 70, message: 'Fitting Prophet on raw data for comparison...' } : p
          )
        );
        try {
          const rawResult = await fetchForecast({
            model: selectedModel,
            dateColumn,
            dependentVariable,
            trainingData: rawTrainingData,
            testData: rawTestData,
            segment,
            prophetParams,
            selectedMetrics,
          });
          segmentResult.raw_training_data = rawResult.training_data;
          segmentResult.raw_test_data = rawResult.test_data;
          segmentResult.raw_forecast_data = rawResult.forecast_data;
          segmentResult.raw_metrics = rawResult.metrics;
        } catch (err: any) {
          console.warn(`Raw-data comparison failed for segment ${segment.segment}:`, err);
        }
      }

      setSegmentProgress(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: 'completed', progress: 100, message: 'Complete' } : p
        )
      );

      allResults.push(segmentResult);

      console.log(`Completed forecast for segment: ${segment.segment}`, {
        model: selectedModel,
        segmentValue: segment.segmentValue,
        totalRecords: transformedSegmentData.length,
        trainingRecords: transformedTrainingData.length,
        testRecords: transformedTestData.length,
        forecastPeriods: segment.forecast_periods,
        frequency: segment.frequency,
        hasTransformations,
        transformationsSummary,
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
              {/* Temporarily disabled until database types sync */}
              {/* <Button variant="outline" onClick={() => navigate("/models")}>
                <Library className="mr-2 h-4 w-4" />
                My Models
              </Button>
              <Button variant="outline" onClick={handleSaveModel}>
                <Save className="mr-2 h-4 w-4" />
                {currentModelId ? "Update Model" : "Save Model"}
              </Button> */}
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
              csvData={csvData}
              availableColumns={availableColumns}
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
              data={csvData}
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

        {/* Temporarily disabled until database types sync */}
        {/* <SaveModelDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          config={getCurrentConfig()}
          existingModelId={currentModelId}
          existingModelName={currentModelName}
          csvData={csvData}
          forecastResults={forecastResults}
        /> */}
      </div>
    </div>
  );
};

export default Index;
