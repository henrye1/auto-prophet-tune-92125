import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { TrendingUp, Target, Activity, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResultsTable } from "./ResultsTable";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";
import type { PerformanceMetric } from "@/types/forecast";

interface ForecastResultsProps {
  results: ForecastResultsType;
  selectedMetrics: PerformanceMetric[];
}

const metricLabels: Record<PerformanceMetric, string> = {
  mae: "MAE",
  rmse: "RMSE",
  mape: "MAPE",
  mse: "MSE",
  r2: "R²",
  coverage: "Coverage",
  smape: "SMAPE",
  mase: "MASE",
};

export const ForecastResults = ({ results, selectedMetrics }: ForecastResultsProps) => {
  if (!results || results.segments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No forecast results available. Run a forecast to see results.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Forecast Results
          </CardTitle>
          <CardDescription>
            Model: {results.model} | Generated: {new Date(results.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue={results.segments[0]?.segment || "0"} className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto">
          {results.segments.map((segment, idx) => (
            <TabsTrigger key={idx} value={segment.segment} className="flex-1 min-w-[120px]">
              {segment.segment}
            </TabsTrigger>
          ))}
        </TabsList>

        {results.segments.map((segment, idx) => (
          <TabsContent key={idx} value={segment.segment} className="space-y-6">
            {/* Metrics Card - Primary Model */}
            {segment.metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Model Performance: {segment.model || results.model}
                  </CardTitle>
                  {segment.benchmark_model && (
                    <CardDescription>
                      Comparing with AI-recommended benchmark: {segment.benchmark_model}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedMetrics.map((metric) => {
                      const value = segment.metrics?.[metric];
                      const benchmarkValue = segment.benchmark_metrics?.[metric];
                      if (value === undefined) return null;
                      
                      const isPercentage = ['mape', 'coverage', 'smape', 'r2'].includes(metric);
                      const isBetter = benchmarkValue !== undefined && (
                        ['mae', 'rmse', 'mse', 'mape', 'smape', 'mase'].includes(metric) 
                          ? value < benchmarkValue 
                          : value > benchmarkValue
                      );
                      
                      return (
                        <div key={metric} className="space-y-1">
                          <p className="text-xs text-muted-foreground">{metricLabels[metric]}</p>
                          <div className="flex items-baseline gap-2">
                            <p className={`text-2xl font-bold ${isBetter ? 'text-green-600' : ''}`}>
                              {value.toFixed(metric === 'r2' ? 3 : isPercentage ? 1 : 2)}
                              {isPercentage && metric !== 'r2' ? '%' : ''}
                            </p>
                            {benchmarkValue !== undefined && (
                              <p className="text-sm text-muted-foreground">
                                vs {benchmarkValue.toFixed(metric === 'r2' ? 3 : isPercentage ? 1 : 2)}
                                {isPercentage && metric !== 'r2' ? '%' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {segment.ai_commentary && (
                    <Alert className="bg-primary/5 border-primary/20">
                      <Wand2 className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold text-sm mb-2">AI Analysis</p>
                        <p className="text-sm whitespace-pre-line">{segment.ai_commentary}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Combined Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Complete Time Series
                </CardTitle>
                <CardDescription>
                  Training data, test predictions, and future forecast with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30">
                    <div className="w-3 h-3 rounded-full bg-blue-600 mr-2" />
                    Actual Data
                  </Badge>
                  <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30">
                    <div className="w-3 h-3 rounded-full bg-orange-600 mr-2" />
                    Fitted (Test)
                  </Badge>
                  <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30">
                    <div className="w-3 h-3 rounded-full bg-purple-600 mr-2" />
                    Forecast
                  </Badge>
                  {(segment.benchmark_test_data || segment.benchmark_forecast_data) && (
                    <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/30">
                      <div className="w-3 h-3 rounded-full bg-indigo-600 mr-2" />
                      {segment.benchmark_model || 'Benchmark'}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30">
                    <div className="w-3 h-3 bg-emerald-600/40 mr-2" />
                    95% Confidence
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={(() => {
                    // Prepare data with explicit fields for each line type
                    const allData = [...segment.training_data, ...segment.test_data, ...segment.forecast_data];
                    return allData.map((point, idx) => {
                      const testStartIdx = segment.training_data.length;
                      const testEndIdx = testStartIdx + segment.test_data.length;
                      const forecastStartIdx = testEndIdx;
                      
                      // Determine which fields to populate based on data type
                      let fitted = null;
                      let forecast = null;
                      let benchmark_predicted = null;
                      
                      if (idx >= testStartIdx && idx < testEndIdx) {
                        // This is test data - show fitted line
                        fitted = point.predicted;
                        if (segment.benchmark_test_data) {
                          benchmark_predicted = segment.benchmark_test_data[idx - testStartIdx]?.predicted;
                        }
                      } else if (idx >= forecastStartIdx) {
                        // This is forecast data - show forecast line
                        forecast = point.predicted;
                        if (segment.benchmark_forecast_data) {
                          benchmark_predicted = segment.benchmark_forecast_data[idx - forecastStartIdx]?.predicted;
                        }
                      }
                      
                      return { 
                        ...point, 
                        fitted,
                        forecast,
                        benchmark_predicted 
                      };
                    });
                  })()}>
                    <defs>
                      <linearGradient id={`confidenceGradient-${segment.segment}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, '']}
                    />
                    <Legend />
                    
                    {/* Confidence interval area */}
                    <Area
                      type="monotone"
                      dataKey="upper_bound"
                      stroke="rgb(16, 185, 129)"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      fill={`url(#confidenceGradient-${segment.segment})`}
                      name="Upper Bound (95%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower_bound"
                      stroke="rgb(16, 185, 129)"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      fill={`url(#confidenceGradient-${segment.segment})`}
                      name="Lower Bound (95%)"
                    />
                    
                    {/* Actual values (training + test) */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="rgb(37, 99, 235)"
                      strokeWidth={2.5}
                      dot={false}
                      name="Actual Data"
                      connectNulls={true}
                    />
                    
                    {/* Test predictions (fitted) */}
                    <Line
                      type="monotone"
                      dataKey="fitted"
                      stroke="rgb(249, 115, 22)"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ fill: 'rgb(249, 115, 22)', r: 3 }}
                      name="Fitted (Test)"
                      connectNulls={true}
                    />
                    
                    {/* Forecast */}
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="rgb(147, 51, 234)"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                      dot={{ fill: 'rgb(147, 51, 234)', r: 3 }}
                      name="Forecast"
                      connectNulls={true}
                    />
                    
                    {/* Benchmark Model predictions (if available) */}
                    {(segment.benchmark_test_data || segment.benchmark_forecast_data) && (
                      <Line
                        type="monotone"
                        dataKey="benchmark_predicted"
                        stroke="rgb(99, 102, 241)"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={false}
                        name={`${segment.benchmark_model || 'Benchmark'}`}
                        connectNulls={true}
                      />
                    )}
                    
                    {/* Reference lines */}
                    {segment.test_data.length > 0 && (
                      <ReferenceLine 
                        x={segment.test_data[0]?.date} 
                        stroke="rgb(156, 163, 175)" 
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        label={{ 
                          value: 'Test Start', 
                          position: 'top',
                          fill: 'rgb(75, 85, 99)',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      />
                    )}
                    {segment.forecast_data.length > 0 && (
                      <ReferenceLine 
                        x={segment.forecast_data[0]?.date} 
                        stroke="rgb(156, 163, 175)" 
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        label={{ 
                          value: 'Forecast Start', 
                          position: 'top',
                          fill: 'rgb(75, 85, 99)',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Test Performance Detail */}
            {segment.test_data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Set Performance</CardTitle>
                  <CardDescription>
                    Model predictions vs actual values on holdout test data
                    {segment.benchmark_model && ` (includes ${segment.benchmark_model} benchmark)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={segment.benchmark_test_data ? 
                      segment.test_data.map((d, i) => ({
                        ...d,
                        benchmark_predicted: segment.benchmark_test_data?.[i]?.predicted
                      })) : 
                      segment.test_data
                    }>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs"
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, '']}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="rgb(37, 99, 235)"
                        strokeWidth={2.5}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="rgb(249, 115, 22)"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        name={`${segment.model || results.model}`}
                      />
                      {segment.benchmark_test_data && (
                        <Line
                          type="monotone"
                          dataKey="benchmark_predicted"
                          stroke="rgb(99, 102, 241)"
                          strokeWidth={2.5}
                          strokeDasharray="3 3"
                          name={`${segment.benchmark_model} (Benchmark)`}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Results Table */}
            <ResultsTable
              segment={segment.segment}
              trainingData={segment.training_data}
              testData={segment.test_data}
              forecastData={segment.forecast_data}
              primaryModel={segment.model || results.model}
              benchmarkModel={segment.benchmark_model}
              benchmarkTrainingData={segment.benchmark_training_data}
              benchmarkTestData={segment.benchmark_test_data}
              benchmarkForecastData={segment.benchmark_forecast_data}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
