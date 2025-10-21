import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSelector } from "@/components/forecast/ModelSelector";
import { VariableConfig } from "@/components/forecast/VariableConfig";
import { ProphetHyperparameters } from "@/components/forecast/ProphetHyperparameters";
import { RegressorConfig } from "@/components/forecast/RegressorConfig";
import { DataVisualization } from "@/components/forecast/DataVisualization";
import { ChevronRight, Play } from "lucide-react";
import type { ForecastModel, ProphetParameters, Regressor } from "@/types/forecast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("model");
  const [selectedModel, setSelectedModel] = useState<ForecastModel>("prophet");
  const [dateColumn, setDateColumn] = useState("ds");
  const [dependentVariable, setDependentVariable] = useState("");
  const [selectedRegressors, setSelectedRegressors] = useState<Regressor[]>([]);
  
  const [prophetParams, setProphetParams] = useState<ProphetParameters>({
    growth: 'linear',
    changepoint_prior_scale: 0.05,
    seasonality_mode: 'additive',
    seasonality_prior_scale: 10,
    yearly_seasonality: true,
    changepoint_range: 0.8,
    cv_initial: 730,
    cv_period: 180,
    cv_horizon: 365,
  });

  // Mock data - in real app, this would come from uploaded files
  const availableColumns = ["ds", "Y1", "Y", "CP1", "IPC1", "IG1", "YD1", "YD", "EMPL", "VS", "VSR", "CPI", "PPI", "HPI", "REX"];
  const mockData = Array.from({ length: 50 }, (_, i) => ({
    date: `2020-${String(Math.floor(i / 4) + 1).padStart(2, '0')}`,
    Y1: Math.random() * 100 + 50,
    CPI: Math.random() * 5 + 2,
    PPI: Math.random() * 4 + 1,
    REX: Math.random() * 10 + 5,
  }));

  const handleRunForecast = () => {
    console.log("Running forecast with configuration:", {
      model: selectedModel,
      dateColumn,
      dependentVariable,
      regressors: selectedRegressors,
      parameters: selectedModel === 'prophet' ? prophetParams : null,
    });
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
          <TabsList className="grid w-full grid-cols-5 bg-card">
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="regressors">Regressors</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="visualize">Visualize</TabsTrigger>
          </TabsList>

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
              dependentVariable={dependentVariable}
              availableColumns={availableColumns}
              onDateColumnChange={setDateColumn}
              onDependentVariableChange={setDependentVariable}
            />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("regressors")}>
                Next: Regressors
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="regressors" className="space-y-6">
            <RegressorConfig
              availableRegressors={availableColumns.filter(c => c !== dateColumn && c !== dependentVariable)}
              selectedRegressors={selectedRegressors}
              onRegressorsChange={setSelectedRegressors}
            />
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("parameters")}>
                Next: Parameters
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
              <Button onClick={handleRunForecast} className="bg-gradient-to-r from-primary to-accent">
                <Play className="mr-2 h-4 w-4" />
                Run Forecast
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="visualize" className="space-y-6">
            <DataVisualization
              data={mockData}
              dependentVariable={dependentVariable || 'Y1'}
              regressors={selectedRegressors.map(r => r.name)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
