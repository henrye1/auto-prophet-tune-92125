import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSelector } from "@/components/forecast/ModelSelector";
import { VariableConfig } from "@/components/forecast/VariableConfig";
import { ProphetHyperparameters } from "@/components/forecast/ProphetHyperparameters";
import { DataVisualization } from "@/components/forecast/DataVisualization";
import { DataUpload } from "@/components/forecast/DataUpload";
import { SegmentMapper } from "@/components/forecast/SegmentMapper";
import { SegmentRegressorConfig } from "@/components/forecast/SegmentRegressorConfig";
import { ForecastProgress } from "@/components/forecast/ForecastProgress";
import { ForecastResults } from "@/components/forecast/ForecastResults";
import { PerformanceMetricSelector } from "@/components/forecast/PerformanceMetricSelector";
import { DataAnalysisTools } from "@/components/forecast/DataAnalysisTools";
import { ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";
import type { ForecastModel, ProphetParameters, SegmentConfig, PerformanceMetric } from "@/types/forecast";
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
  
  if (selectedMetrics.includes('mae')) {
    metrics.mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
  }
  if (selectedMetrics.includes('mse')) {
    metrics.mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
  }
  if (selectedMetrics.includes('rmse')) {
    metrics.rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);
  }
  if (selectedMetrics.includes('mape')) {
    metrics.mape = errors.reduce((sum, e, i) => sum + Math.abs(e / actualValues[i]) * 100, 0) / errors.length;
  }
  if (selectedMetrics.includes('smape')) {
    metrics.smape = errors.reduce((sum, e, i) => {
      const denominator = (Math.abs(actualValues[i]) + Math.abs(predictedValues[i])) / 2;
      return sum + Math.abs(e) / denominator * 100;
    }, 0) / errors.length;
  }
  if (selectedMetrics.includes('r2')) {
    const mean = actualValues.reduce((s, v) => s + v, 0) / actualValues.length;
    const ssRes = errors.reduce((s, e) => s + e * e, 0);
    const ssTot = actualValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0);
    metrics.r2 = 1 - (ssRes / ssTot);
  }
  if (selectedMetrics.includes('coverage')) {
    metrics.coverage = test.filter(t => t.actual! >= t.lower_bound && t.actual! <= t.upper_bound).length / test.length * 100;
  }
  if (selectedMetrics.includes('mase')) {
    const naiveErrors = actualValues.slice(1).map((v, i) => Math.abs(v - actualValues[i]));
    const meanNaiveError = naiveErrors.reduce((s, e) => s + e, 0) / naiveErrors.length;
    metrics.mase = (errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length) / meanNaiveError;
  }

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
  
  const [prophetParams, setProphetParams] = useState<ProphetParameters>({
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
      
      // Update status to running
      setSegmentProgress(prev => 
        prev.map((p, idx) => 
          idx === i ? { 
            ...p, 
            status: 'running', 
            progress: 0, 
            message: `Using ${trainingData.length} records for training, ${testData.length} for testing` 
          } : p
        )
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate model training stages
      const stages = [
        { progress: 25, message: `Training on ${trainingData.length} records...` },
        { progress: 50, message: `Validating on ${testData.length} test records...` },
        { progress: 75, message: 'Cross-validation...' },
        { progress: 90, message: `Forecasting ${segment.forecast_periods} periods...` },
        { progress: 100, message: 'Complete' },
      ];

      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, 800));
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
      const mockResults = generateMockForecast(
        trainingData,
        testData,
        segment,
        dateColumn,
        dependentVariable,
        prophetParams,
        selectedMetrics
      );
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
        parameters: selectedModel === 'prophet' ? prophetParams : null,
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
            Time Series Forecasting Platform
          </h1>
          <p className="text-muted-foreground">
            Configure and run Prophet and AutoGluon forecasting models with advanced parameter tuning
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 bg-card text-xs">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="model" disabled={csvData.length === 0}>Model</TabsTrigger>
            <TabsTrigger value="variables" disabled={csvData.length === 0}>Variables</TabsTrigger>
            <TabsTrigger value="analysis" disabled={csvData.length === 0}>Analysis</TabsTrigger>
            <TabsTrigger value="segments" disabled={!dateColumn}>Segments</TabsTrigger>
            <TabsTrigger value="regressors" disabled={segments.length === 0}>Regressors</TabsTrigger>
            <TabsTrigger value="metrics" disabled={segments.length === 0}>Metrics</TabsTrigger>
            <TabsTrigger value="parameters" disabled={segments.length === 0}>Parameters</TabsTrigger>
            <TabsTrigger value="results" disabled={!forecastResults}>Results</TabsTrigger>
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
                Next: Variables
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
                onClick={() => setActiveTab("analysis")} 
                disabled={!dateColumn || !segmentColumn || !dependentVariable}
              >
                Next: Analyze Data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <DataAnalysisTools
              data={csvData}
              dateColumn={dateColumn}
              valueColumn={dependentVariable}
              regressors={availableRegressors}
              onTransformationApply={(transformation) => {
                console.log("Transformation applied:", transformation);
                const transformCount = transformation.transformations?.length || 1;
                toast.success(`${transformCount} transformation(s) applied. Data will be transformed during model training.`);
              }}
            />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("segments")}>
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
            {selectedModel === 'prophet' && (
              <ProphetHyperparameters
                parameters={prophetParams}
                onParametersChange={setProphetParams}
              />
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
              data={csvData
                .filter(row => segments.length === 0 || segments.some(s => row[segmentColumn] === s.segmentValue))
                .slice(0, 100)
                .map((row) => ({
                  date: row[dateColumn],
                  segment: row[segmentColumn],
                  [dependentVariable]: row[dependentVariable],
                  ...row,
                }))}
              dependentVariable={dependentVariable || 'value'}
              regressors={availableRegressors.slice(0, 5)}
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <ForecastProgress segmentProgress={segmentProgress} />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {forecastResults && <ForecastResults results={forecastResults} selectedMetrics={selectedMetrics} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
