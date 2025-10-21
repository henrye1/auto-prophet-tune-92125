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
import { ChevronRight, Play } from "lucide-react";
import { toast } from "sonner";
import type { ForecastModel, ProphetParameters, SegmentConfig } from "@/types/forecast";

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
    const progress = segments.map(s => ({
      segment: s.segment,
      status: 'pending' as const,
      progress: 0,
    }));
    setSegmentProgress(progress);
    setActiveTab("progress");

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

    setIsRunning(false);
    toast.success(`Successfully completed forecasts for ${segments.length} segments`);
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
          <TabsList className="grid w-full grid-cols-7 bg-card">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="model" disabled={csvData.length === 0}>Model</TabsTrigger>
            <TabsTrigger value="variables" disabled={csvData.length === 0}>Variables</TabsTrigger>
            <TabsTrigger value="segments" disabled={!dateColumn}>Segments</TabsTrigger>
            <TabsTrigger value="regressors" disabled={segments.length === 0}>Regressors</TabsTrigger>
            <TabsTrigger value="parameters" disabled={segments.length === 0}>Parameters</TabsTrigger>
            <TabsTrigger value="visualize" disabled={segments.length === 0}>Visualize</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
