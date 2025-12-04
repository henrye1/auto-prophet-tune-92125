import React, { useState, useMemo } from "react";
import {
  Line,
  LineChart,
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
import { Download, TrendingUp, AlertCircle, BarChart3 } from "lucide-react";
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
import type { TransformationRecommendation } from "@/types/dataAnalysis";
import { metricNames } from "@/types/forecast";

interface ForecastResultsProps {
  results: ForecastResultsType;
  onExport?: (format: "csv" | "json") => void;
  // Props for transformation comparison
  originalData?: Record<string, unknown>[];
  dateColumn?: string;
  dependentVariable?: string;
  selectedTransformations?: TransformationRecommendation[];
}

const ForecastResults: React.FC<ForecastResultsProps> = ({
  results,
  onExport,
  originalData,
  dateColumn,
  dependentVariable,
  selectedTransformations,
}) => {
  const [selectedSegment, setSelectedSegment] = useState<string>(
    results.segmentResults[0]?.segmentName || ""
  );

  const currentSegmentResult = results.segmentResults.find(
    (r) => r.segmentName === selectedSegment
  );

  // Apply transformations to data
  const applyTransformations = (values: number[], transformations: TransformationRecommendation[]): number[] => {
    let result = [...values];

    transformations.forEach((transform) => {
      switch (transform.type) {
        case "log":
          result = result.map((v) => (v > 0 ? Math.log(v) : 0));
          break;
        case "sqrt":
          result = result.map((v) => (v >= 0 ? Math.sqrt(v) : 0));
          break;
        case "difference":
          const diffResult: number[] = [];
          for (let i = 1; i < result.length; i++) {
            diffResult.push(result[i] - result[i - 1]);
          }
          result = diffResult;
          break;
        case "seasonal_difference":
          const period = transform.parameters?.seasonalPeriod || 12;
          const seasonalResult: number[] = [];
          for (let i = period; i < result.length; i++) {
            seasonalResult.push(result[i] - result[i - period]);
          }
          result = seasonalResult;
          break;
        case "box_cox":
          const lambda = transform.parameters?.lambda || 0.5;
          if (lambda === 0) {
            result = result.map((v) => (v > 0 ? Math.log(v) : 0));
          } else {
            result = result.map((v) => (v > 0 ? (Math.pow(v, lambda) - 1) / lambda : 0));
          }
          break;
      }
    });

    return result;
  };

  // Prepare transformation comparison data
  const transformationComparisonData = useMemo(() => {
    // Check required props - but allow empty transformations array
    if (!originalData || !dateColumn || !dependentVariable) {
      return null;
    }

    const values = originalData
      .map((row) => Number(row[dependentVariable]))
      .filter((v) => !isNaN(v));

    if (values.length === 0) return null;

    // Use empty array as default if selectedTransformations is undefined
    const transformations = selectedTransformations || [];

    const transformedValues = transformations.length > 0
      ? applyTransformations(values, transformations)
      : [...values]; // Clone if no transformations

    // Calculate date offset for alignment
    let dateOffset = 0;
    transformations.forEach((t) => {
      if (t.type === "difference") dateOffset += 1;
      if (t.type === "seasonal_difference") dateOffset += (t.parameters?.seasonalPeriod || 12);
    });

    // Helper to format date for display
    const formatDateStr = (dateVal: unknown): string => {
      if (!dateVal) return '';
      const str = String(dateVal);
      try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          // Check if it looks like monthly data (day is 1)
          if (date.getDate() === 1) {
            return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          }
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
        }
      } catch {
        // Fall through
      }
      // Return shortened version of original string
      return str.length > 10 ? str.slice(0, 10) : str;
    };

    // Original data
    const beforeData = values.map((val, i) => {
      const dateValue = originalData[i]?.[dateColumn];
      return {
        date: formatDateStr(dateValue) || `Point ${i + 1}`,
        value: val,
      };
    });

    // Transformed data
    const afterData = transformedValues.map((val, i) => {
      const dateIndex = Math.min(i + dateOffset, originalData.length - 1);
      const dateValue = originalData[dateIndex]?.[dateColumn];
      return {
        date: formatDateStr(dateValue) || `Point ${i + 1}`,
        value: Number.isFinite(val) ? val : 0,
      };
    });

    return { beforeData, afterData, hasTransformations: transformations.length > 0 };
  }, [originalData, dateColumn, dependentVariable, selectedTransformations]);

  const formatNumber = (num: number | null, decimals = 2): string => {
    if (num === null || num === undefined) return "N/A";
    return num.toFixed(decimals);
  };

  // Detect if dates are monthly (all on day 1 or similar pattern)
  const isMonthlyData = useMemo(() => {
    if (!currentSegmentResult) return false;
    const dates = currentSegmentResult.forecastData.slice(0, 10).map((p) => new Date(p.date));
    // Check if all dates are on day 1 or if gaps are roughly monthly
    const allDay1 = dates.every((d) => d.getDate() === 1);
    if (allDay1) return true;
    // Check if gaps are ~28-31 days
    if (dates.length >= 2) {
      const gaps = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      return avgGap >= 25 && avgGap <= 35;
    }
    return false;
  }, [currentSegmentResult]);

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If not a valid date, return as-is (might be "2024-01" format)
        return dateStr;
      }
      if (isMonthlyData) {
        // For monthly data, show "Jan 24" format
        return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }
      // For daily/weekly data, show full date
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

  // Prepare chart data
  const chartData = currentSegmentResult.forecastData.map((point) => ({
    date: formatDate(point.date),
    actual: point.actual,
    predicted: point.predicted,
    lower: point.lowerBound,
    upper: point.upperBound,
    isForecast: point.isForecast,
    isTest: point.isTestSet,
  }));

  // Find the split point for visualization
  const testStartIndex = chartData.findIndex((d) => d.isTest);
  const forecastStartIndex = chartData.findIndex((d) => d.isForecast);

  const hasTransformations = transformationComparisonData?.hasTransformations ?? false;

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
            <TabsTrigger value="chart">Forecast</TabsTrigger>
            {transformationComparisonData && (
              <TabsTrigger value="comparison">
                <BarChart3 className="h-4 w-4 mr-1" />
                Before/After
              </TabsTrigger>
            )}
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
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

                  {/* Confidence interval area */}
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

                  {/* Actual values */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                  />

                  {/* Predicted values */}
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Predicted"
                  />

                  {/* Reference lines for splits */}
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

          {/* Transformation Comparison Tab */}
          {transformationComparisonData && (
            <TabsContent value="comparison" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Data Transformation Comparison</h3>
                  {hasTransformations && (
                    <div className="flex gap-2">
                      {selectedTransformations?.map((t) => (
                        <Badge key={t.type} variant="secondary">
                          {t.type === "log" ? "Log" :
                           t.type === "difference" ? "Diff(1)" :
                           t.type === "seasonal_difference" ? `Seasonal(${t.parameters?.seasonalPeriod || 12})` :
                           t.type === "sqrt" ? "Sqrt" :
                           t.type === "box_cox" ? "Box-Cox" : t.type}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before Transformation */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2 text-center">Original Data</h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={transformationComparisonData.beforeData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            name="Original"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-center text-muted-foreground mt-2">
                      {transformationComparisonData.beforeData.length} data points
                    </div>
                  </div>

                  {/* After Transformation */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2 text-center">
                      After Transformation
                      {!hasTransformations && " (No transformation applied)"}
                    </h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={transformationComparisonData.afterData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            name="Transformed"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-center text-muted-foreground mt-2">
                      {transformationComparisonData.afterData.length} data points
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Metrics Tab */}
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

          {/* Data Tab */}
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
