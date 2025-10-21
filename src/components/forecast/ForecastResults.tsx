import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { TrendingUp, Target, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";

interface ForecastResultsProps {
  results: ForecastResultsType;
}

export const ForecastResults = ({ results }: ForecastResultsProps) => {
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
            {/* Metrics Card */}
            {segment.metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Model Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {segment.metrics.mae && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">MAE</p>
                        <p className="text-2xl font-bold">{segment.metrics.mae.toFixed(2)}</p>
                      </div>
                    )}
                    {segment.metrics.rmse && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">RMSE</p>
                        <p className="text-2xl font-bold">{segment.metrics.rmse.toFixed(2)}</p>
                      </div>
                    )}
                    {segment.metrics.mape && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">MAPE</p>
                        <p className="text-2xl font-bold">{segment.metrics.mape.toFixed(1)}%</p>
                      </div>
                    )}
                    {segment.metrics.coverage && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Coverage</p>
                        <p className="text-2xl font-bold">{segment.metrics.coverage.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
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
                  <Badge variant="outline" className="bg-chart-1/10">
                    <div className="w-3 h-3 rounded-full bg-chart-1 mr-2" />
                    Training
                  </Badge>
                  <Badge variant="outline" className="bg-chart-2/10">
                    <div className="w-3 h-3 rounded-full bg-chart-2 mr-2" />
                    Actual (Test)
                  </Badge>
                  <Badge variant="outline" className="bg-chart-3/10">
                    <div className="w-3 h-3 rounded-full bg-chart-3 mr-2" />
                    Predicted
                  </Badge>
                  <Badge variant="outline" className="bg-chart-4/10">
                    <div className="w-3 h-3 rounded-full bg-chart-4 mr-2" />
                    Forecast
                  </Badge>
                  <Badge variant="outline" className="bg-muted">
                    <div className="w-3 h-3 bg-muted-foreground/30 mr-2" />
                    Confidence Interval
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={[...segment.training_data, ...segment.test_data, ...segment.forecast_data]}>
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
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
                      stroke="none"
                      fill="url(#confidenceGradient)"
                      name="Upper Bound"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower_bound"
                      stroke="none"
                      fill="url(#confidenceGradient)"
                      name="Lower Bound"
                    />
                    
                    {/* Training actual values */}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                      name="Training Data"
                      connectNulls={false}
                    />
                    
                    {/* Test predictions */}
                    <Line
                      type="monotone"
                      dataKey={(point: any) => point.is_test ? point.predicted : null}
                      stroke="hsl(var(--chart-3))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--chart-3))', r: 3 }}
                      name="Test Predictions"
                      connectNulls={false}
                    />
                    
                    {/* Forecast */}
                    <Line
                      type="monotone"
                      dataKey={(point: any) => point.is_forecast ? point.predicted : null}
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ fill: 'hsl(var(--chart-4))', r: 3 }}
                      name="Forecast"
                      connectNulls={false}
                    />
                    
                    {/* Reference lines */}
                    {segment.test_data.length > 0 && (
                      <ReferenceLine 
                        x={segment.test_data[0]?.date} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="3 3"
                        label={{ value: 'Test Start', position: 'top' }}
                      />
                    )}
                    {segment.forecast_data.length > 0 && (
                      <ReferenceLine 
                        x={segment.forecast_data[0]?.date} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="3 3"
                        label={{ value: 'Forecast Start', position: 'top' }}
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
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={segment.test_data}>
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
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-3))', r: 4 }}
                        name="Predicted"
                      />
                      <Line
                        type="monotone"
                        dataKey="lower_bound"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                        name="Lower Bound"
                      />
                      <Line
                        type="monotone"
                        dataKey="upper_bound"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                        name="Upper Bound"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
