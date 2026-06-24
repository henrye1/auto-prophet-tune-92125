import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

import { ChevronRight, Play, Save, LogOut, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ForecastModel, SegmentConfig, PerformanceMetric, ForecastConfig } from "@/types/forecast";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";
import { submitForecast, pollForecastJob, type ForecastJobPayload } from "@/lib/forecastClient";


const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedModel, setSelectedModel] = useState<ForecastModel>("prophet");
  const [benchmarkEnabled, setBenchmarkEnabled] = useState(false);
  const [benchmarkModel, setBenchmarkModel] = useState<ForecastModel>("autogluon");
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

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      toast.error("Please sign in again");
      return;
    }

    setIsRunning(true);
    setForecastResults(null);
    setSegmentProgress(
      segments.map((s) => ({ segment: s.segment, status: "pending" as const, progress: 0 })),
    );
    setActiveTab("progress");

    try {
      const payload: ForecastJobPayload = {
        model: selectedModel,
        date_column: dateColumn,
        segment_column: segmentColumn,
        dependent_variable: dependentVariable,
        metrics: selectedMetrics,
        benchmark_model:
          benchmarkEnabled && benchmarkModel !== selectedModel ? benchmarkModel : undefined,
        data: csvData,
        segments: segments.map((s) => ({
          segmentValue: s.segmentValue,
          segment: s.segment,
          forecast_periods: s.forecast_periods,
          frequency: s.frequency,
          training_records: s.training_records,
          test_records: s.test_records,
          prophet_params: (s.prophet_params as unknown as Record<string, unknown>) ?? null,
        })),
      };

      // mark all running so the progress UI shows activity
      setSegmentProgress((prev) =>
        prev.map((p) => ({ ...p, status: "running", progress: 0, message: "Submitting job..." })),
      );

      const jobId = await submitForecast(payload, accessToken);

      const results = await pollForecastJob(jobId, (progress) => {
        setSegmentProgress((prev) => prev.map((p) => ({ ...p, progress })));
      });

      setSegmentProgress((prev) =>
        prev.map((p) => ({ ...p, status: "completed", progress: 100 })),
      );
      setForecastResults(results as any);
      toast.success(`Forecast complete for ${results.segments.length} segment(s)`);
      setActiveTab("results");
    } catch (err) {
      console.error("Forecast error:", err);
      toast.error(err instanceof Error ? err.message : "Forecast failed");
      setSegmentProgress((prev) => prev.map((p) => ({ ...p, status: "error" as const })));
    } finally {
      setIsRunning(false);
    }
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
              <Button variant="outline" onClick={handleSaveModel}>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benchmark Comparison</CardTitle>
                <CardDescription>
                  Optionally fit a second model to compare side by side. Note: an AutoGluon
                  benchmark roughly doubles run time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="benchmark-toggle"
                    checked={benchmarkEnabled}
                    onCheckedChange={setBenchmarkEnabled}
                  />
                  <Label htmlFor="benchmark-toggle">Compare against a benchmark model</Label>
                </div>
                {benchmarkEnabled && (
                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="benchmark-model">Benchmark model</Label>
                    <Select value={benchmarkModel} onValueChange={(v) => setBenchmarkModel(v as ForecastModel)}>
                      <SelectTrigger id="benchmark-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="prophet">Facebook Prophet</SelectItem>
                        <SelectItem value="autogluon">AWS AutoGluon</SelectItem>
                      </SelectContent>
                    </Select>
                    {benchmarkModel === selectedModel && (
                      <p className="text-xs text-destructive">
                        Pick a model different from the primary ({selectedModel}).
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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

        <SaveModelDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          config={getCurrentConfig()}
          existingModelId={currentModelId}
          existingModelName={currentModelName}
          csvData={csvData}
          forecastResults={forecastResults}
          onSaved={(modelId, modelName) => {
            setCurrentModelId(modelId);
            setCurrentModelName(modelName);
          }}
        />
      </div>
    </div>
  );
};

export default Index;
