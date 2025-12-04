#!/bin/bash

# Prophet-Tune Project Generator - Part 4
# Remaining Forecast Components

set -e

echo "Creating remaining forecast components..."

cat > src/components/forecast/ProphetHyperparameters.tsx << 'ENDOFFILE'
import React from "react";
import { Settings, TrendingUp, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProphetParameters } from "@/types/forecast";

interface ProphetHyperparametersProps {
  parameters: ProphetParameters;
  onParametersChange: (params: ProphetParameters) => void;
}

const ProphetHyperparameters: React.FC<ProphetHyperparametersProps> = ({
  parameters,
  onParametersChange,
}) => {
  const updateParam = <K extends keyof ProphetParameters>(
    key: K,
    value: ProphetParameters[K]
  ) => {
    onParametersChange({ ...parameters, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Prophet Hyperparameters
        </CardTitle>
        <CardDescription>
          Fine-tune the Prophet model parameters for optimal forecasting performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="growth" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="growth">
              <TrendingUp className="h-4 w-4 mr-1" />
              Growth
            </TabsTrigger>
            <TabsTrigger value="changepoints">
              <Sparkles className="h-4 w-4 mr-1" />
              Changepoints
            </TabsTrigger>
            <TabsTrigger value="seasonality">
              <Calendar className="h-4 w-4 mr-1" />
              Seasonality
            </TabsTrigger>
            <TabsTrigger value="uncertainty">
              Uncertainty
            </TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Growth Type</Label>
              <Select
                value={parameters.growthType}
                onValueChange={(value) => updateParam("growthType", value as "linear" | "logistic" | "flat")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear - Constant growth rate</SelectItem>
                  <SelectItem value="logistic">Logistic - Bounded growth with saturation</SelectItem>
                  <SelectItem value="flat">Flat - No trend growth</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how the trend component grows over time
              </p>
            </div>

            {parameters.growthType === "logistic" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacity (Cap)</Label>
                  <Input
                    type="number"
                    value={parameters.cap || ""}
                    onChange={(e) => updateParam("cap", parseFloat(e.target.value) || undefined)}
                    placeholder="Maximum value"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Input
                    type="number"
                    value={parameters.floor || ""}
                    onChange={(e) => updateParam("floor", parseFloat(e.target.value) || undefined)}
                    placeholder="Minimum value"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="changepoints" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Changepoint Prior Scale</Label>
                  <span className="text-sm text-muted-foreground">
                    {parameters.changepointPriorScale.toFixed(3)}
                  </span>
                </div>
                <Slider
                  value={[parameters.changepointPriorScale]}
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  onValueChange={([value]) => updateParam("changepointPriorScale", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Flexibility of trend changes. Higher = more flexible, lower = smoother
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Changepoint Range</Label>
                  <span className="text-sm text-muted-foreground">
                    {(parameters.changepointRange * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[parameters.changepointRange]}
                  min={0.5}
                  max={0.95}
                  step={0.01}
                  onValueChange={([value]) => updateParam("changepointRange", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Proportion of history where changepoints are placed
                </p>
              </div>

              <div className="space-y-2">
                <Label>Number of Changepoints</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={parameters.nChangepoints}
                  onChange={(e) => updateParam("nChangepoints", parseInt(e.target.value) || 25)}
                />
                <p className="text-xs text-muted-foreground">
                  Potential changepoints to include (actual number may be fewer)
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seasonality" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Yearly Seasonality</Label>
                  <p className="text-xs text-muted-foreground">Annual patterns in your data</p>
                </div>
                <Switch
                  checked={parameters.yearlySeasonality === true || parameters.yearlySeasonality === "auto"}
                  onCheckedChange={(checked) =>
                    updateParam("yearlySeasonality", checked ? "auto" : false)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Seasonality</Label>
                  <p className="text-xs text-muted-foreground">Day-of-week patterns</p>
                </div>
                <Switch
                  checked={parameters.weeklySeasonality === true || parameters.weeklySeasonality === "auto"}
                  onCheckedChange={(checked) =>
                    updateParam("weeklySeasonality", checked ? "auto" : false)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Seasonality</Label>
                  <p className="text-xs text-muted-foreground">Hour-of-day patterns</p>
                </div>
                <Switch
                  checked={parameters.dailySeasonality === true || parameters.dailySeasonality === "auto"}
                  onCheckedChange={(checked) =>
                    updateParam("dailySeasonality", checked ? "auto" : false)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Seasonality Mode</Label>
                <Select
                  value={parameters.seasonalityMode}
                  onValueChange={(value) =>
                    updateParam("seasonalityMode", value as "additive" | "multiplicative")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="additive">Additive - Constant seasonal effect</SelectItem>
                    <SelectItem value="multiplicative">
                      Multiplicative - Proportional to trend
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Seasonality Prior Scale</Label>
                  <span className="text-sm text-muted-foreground">
                    {parameters.seasonalityPriorScale.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[parameters.seasonalityPriorScale]}
                  min={0.01}
                  max={20}
                  step={0.1}
                  onValueChange={([value]) => updateParam("seasonalityPriorScale", value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="uncertainty" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Confidence Interval Width</Label>
                  <span className="text-sm text-muted-foreground">
                    {(parameters.intervalWidth * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[parameters.intervalWidth]}
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  onValueChange={([value]) => updateParam("intervalWidth", value)}
                />
                <p className="text-xs text-muted-foreground">
                  Width of the uncertainty interval in forecasts
                </p>
              </div>

              <div className="space-y-2">
                <Label>Uncertainty Samples</Label>
                <Input
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={parameters.uncertaintySamples}
                  onChange={(e) =>
                    updateParam("uncertaintySamples", parseInt(e.target.value) || 1000)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Number of samples for uncertainty estimation (higher = more accurate but slower)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProphetHyperparameters;
ENDOFFILE

cat > src/components/forecast/MetricsSelector.tsx << 'ENDOFFILE'
import React from "react";
import { BarChart3, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PerformanceMetric } from "@/types/forecast";
import { metricNames } from "@/types/forecast";

interface MetricsSelectorProps {
  selectedMetrics: PerformanceMetric[];
  onMetricsChange: (metrics: PerformanceMetric[]) => void;
}

interface MetricInfo {
  metric: PerformanceMetric;
  description: string;
  formula: string;
  bestFor: string;
}

const metricsInfo: MetricInfo[] = [
  {
    metric: "mae",
    description: "Average absolute difference between predicted and actual values",
    formula: "MAE = (1/n) * |yi - pi|",
    bestFor: "Easy to interpret, same units as data",
  },
  {
    metric: "rmse",
    description: "Square root of the average squared differences",
    formula: "RMSE = ((1/n) * (yi - pi))^0.5",
    bestFor: "Penalizes large errors more heavily",
  },
  {
    metric: "mape",
    description: "Average percentage difference from actual values",
    formula: "MAPE = (100/n) * |yi - pi|/|yi|",
    bestFor: "Scale-independent comparison",
  },
  {
    metric: "smape",
    description: "Symmetric version of MAPE",
    formula: "SMAPE = (100/n) * |yi - pi|/((|yi| + |pi|)/2)",
    bestFor: "Handles zero values better than MAPE",
  },
  {
    metric: "mse",
    description: "Average of squared differences",
    formula: "MSE = (1/n) * (yi - pi)",
    bestFor: "Mathematical convenience, used in optimization",
  },
  {
    metric: "r_squared",
    description: "Proportion of variance explained by the model",
    formula: "R = 1 - SS_res/SS_tot",
    bestFor: "Understanding model fit quality",
  },
  {
    metric: "adjusted_r_squared",
    description: "R-squared adjusted for number of predictors",
    formula: "Adj R = 1 - (1-R)(n-1)/(n-p-1)",
    bestFor: "Comparing models with different features",
  },
  {
    metric: "coverage",
    description: "Percentage of actual values within prediction intervals",
    formula: "Coverage = count(yi in [lo, hi]) / n",
    bestFor: "Evaluating uncertainty estimates",
  },
  {
    metric: "mase",
    description: "Scaled error relative to naive forecast",
    formula: "MASE = MAE / MAE_naive",
    bestFor: "Cross-series comparison",
  },
];

const MetricsSelector: React.FC<MetricsSelectorProps> = ({
  selectedMetrics,
  onMetricsChange,
}) => {
  const toggleMetric = (metric: PerformanceMetric) => {
    if (selectedMetrics.includes(metric)) {
      onMetricsChange(selectedMetrics.filter((m) => m !== metric));
    } else {
      onMetricsChange([...selectedMetrics, metric]);
    }
  };

  const selectAll = () => {
    onMetricsChange(metricsInfo.map((m) => m.metric));
  };

  const selectNone = () => {
    onMetricsChange([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
        <CardDescription>
          Select the metrics to calculate for evaluating forecast accuracy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <button
            onClick={selectAll}
            className="text-sm text-primary hover:underline"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="text-sm text-muted-foreground hover:underline"
          >
            Clear All
          </button>
        </div>

        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricsInfo.map(({ metric, description, formula, bestFor }) => (
              <div
                key={metric}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer
                  ${selectedMetrics.includes(metric) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => toggleMetric(metric)}
              >
                <Checkbox
                  id={metric}
                  checked={selectedMetrics.includes(metric)}
                  onCheckedChange={() => toggleMetric(metric)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <Label htmlFor={metric} className="cursor-pointer font-medium">
                      {metricNames[metric]}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{description}</p>
                          <p className="text-xs font-mono">{formula}</p>
                          <p className="text-xs text-muted-foreground">Best for: {bestFor}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm">
            <span className="font-medium">{selectedMetrics.length}</span> metrics selected
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsSelector;
ENDOFFILE

cat > src/components/forecast/ForecastProgress.tsx << 'ENDOFFILE'
import React from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SegmentProgress {
  segmentName: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
}

interface ForecastProgressProps {
  segments: SegmentProgress[];
  overallProgress: number;
  currentStep?: string;
}

const ForecastProgress: React.FC<ForecastProgressProps> = ({
  segments,
  overallProgress,
  currentStep,
}) => {
  const completedCount = segments.filter((s) => s.status === "completed").length;
  const errorCount = segments.filter((s) => s.status === "error").length;

  const getStatusIcon = (status: SegmentProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: SegmentProgress["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "processing":
        return <Badge variant="default">Processing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Running Forecast
        </CardTitle>
        <CardDescription>
          {currentStep || `Processing ${segments.length} segment(s)...`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{completedCount} completed</span>
            {errorCount > 0 && (
              <span className="text-destructive">{errorCount} failed</span>
            )}
            <span>{segments.length - completedCount - errorCount} remaining</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Segment Status</h4>
          <div className="rounded-lg border divide-y">
            {segments.map((segment) => (
              <div
                key={segment.segmentName}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(segment.status)}
                  <div>
                    <p className="font-medium text-sm">{segment.segmentName}</p>
                    {segment.message && (
                      <p className="text-xs text-muted-foreground">{segment.message}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(segment.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForecastProgress;
ENDOFFILE

cat > src/components/forecast/ForecastResults.tsx << 'ENDOFFILE'
import React, { useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { Download, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";
import { metricNames } from "@/types/forecast";

interface ForecastResultsProps {
  results: ForecastResultsType;
  onExport?: (format: "csv" | "json") => void;
}

const ForecastResults: React.FC<ForecastResultsProps> = ({ results, onExport }) => {
  const [selectedSegment, setSelectedSegment] = useState<string>(
    results.segmentResults[0]?.segmentName || ""
  );

  const currentSegmentResult = results.segmentResults.find(
    (r) => r.segmentName === selectedSegment
  );

  const formatNumber = (num: number | null, decimals = 2): string => {
    if (num === null || num === undefined) return "N/A";
    return num.toFixed(decimals);
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  if (!currentSegmentResult) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No forecast results available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = currentSegmentResult.forecastData.map((point) => ({
    date: formatDate(point.date),
    actual: point.actual,
    predicted: point.predicted,
    lower: point.lowerBound,
    upper: point.upperBound,
    isForecast: point.isForecast,
    isTest: point.isTestSet,
  }));

  const testStartIndex = chartData.findIndex((d) => d.isTest);
  const forecastStartIndex = chartData.findIndex((d) => d.isForecast);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Forecast Results
            </CardTitle>
            <CardDescription>
              Generated on {new Date(results.timestamp).toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {results.segmentResults.length > 1 && (
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  {results.segmentResults.map((result) => (
                    <SelectItem key={result.segmentName} value={result.segmentName}>
                      {result.segmentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={() => onExport("csv")}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    name="Upper Bound"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="hsl(var(--background))"
                    fillOpacity={1}
                    name="Lower Bound"
                  />

                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                  />

                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Predicted"
                  />

                  {testStartIndex > 0 && (
                    <ReferenceLine
                      x={chartData[testStartIndex]?.date}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      label={{ value: "Test Start", position: "top", fontSize: 10 }}
                    />
                  )}
                  {forecastStartIndex > 0 && (
                    <ReferenceLine
                      x={chartData[forecastStartIndex]?.date}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="3 3"
                      label={{ value: "Forecast Start", position: "top", fontSize: 10 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex gap-4 mt-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-foreground"></div>
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-primary" style={{ borderStyle: "dashed" }}></div>
                <span>Predicted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary/10 rounded"></div>
                <span>Confidence Interval</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Training Set</TableHead>
                    <TableHead className="text-right">Test Set</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSegmentResult.metrics.map((m) => (
                    <TableRow key={m.metric}>
                      <TableCell className="font-medium">
                        {metricNames[m.metric]}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {m.metric.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(m.trainValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(m.testValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {currentSegmentResult.aiCommentary && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">AI Analysis</h4>
                <p className="text-sm text-muted-foreground">{currentSegmentResult.aiCommentary}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <div className="max-h-[400px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Predicted</TableHead>
                    <TableHead className="text-right">Lower</TableHead>
                    <TableHead className="text-right">Upper</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSegmentResult.forecastData.map((point, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{formatDate(point.date)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(point.actual)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(point.predicted)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(point.lowerBound)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatNumber(point.upperBound)}
                      </TableCell>
                      <TableCell className="text-center">
                        {point.isForecast ? (
                          <Badge>Forecast</Badge>
                        ) : point.isTestSet ? (
                          <Badge variant="secondary">Test</Badge>
                        ) : (
                          <Badge variant="outline">Train</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ForecastResults;
ENDOFFILE

echo ""
echo "============================================"
echo "All files created successfully!"
echo "============================================"
echo ""
echo "To set up the project:"
echo "1. cd to project directory"
echo "2. npm install"
echo "3. npm run dev"
echo ""
echo "The app will run at http://localhost:5173"
