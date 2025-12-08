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
import { Download, TrendingUp, AlertCircle, BarChart3, FileText, Table2, LineChart as LineChartIcon } from "lucide-react";
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
  segmentColumn?: string;
  dependentVariable?: string;
  selectedTransformations?: TransformationRecommendation[];
}

const ForecastResults: React.FC<ForecastResultsProps> = ({
  results,
  onExport,
  originalData,
  dateColumn,
  segmentColumn,
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

    // Filter data by selected segment
    let segmentData = originalData;
    if (segmentColumn && selectedSegment && selectedSegment !== "All Data") {
      segmentData = originalData.filter(
        (row) => String(row[segmentColumn]) === selectedSegment
      );
    }

    const values = segmentData
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

    // Helper to format date for display - use frequency-aware formatting
    const formatDateStr = (dateVal: unknown): string => {
      if (!dateVal) return '';
      const str = String(dateVal);

      // Handle YYYY/MM/DD format (with slashes) - monthly data
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
        const [year, month] = str.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, 1)
          .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }

      // Handle YYYY-MM-DD format (with dashes)
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [year, month, day] = str.split('-');
        const d = parseInt(day);
        if (d === 1 || d >= 28) {
          return new Date(parseInt(year), parseInt(month) - 1, d)
            .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        }
        return new Date(parseInt(year), parseInt(month) - 1, d)
          .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
      }

      // Handle YYYY-MM format directly
      if (/^\d{4}-\d{2}$/.test(str)) {
        const [year, month] = str.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1)
          .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }

      try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          const day = date.getDate();
          if (day === 1 || day >= 28) {
            return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          }
          return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
        }
      } catch {
        // Fall through
      }
      return str.length > 10 ? str.slice(0, 10) : str;
    };

    // Original data - use segmentData for dates
    const beforeData = values.map((val, i) => {
      const dateValue = segmentData[i]?.[dateColumn];
      return {
        date: formatDateStr(dateValue) || `Point ${i + 1}`,
        value: val,
      };
    });

    // Transformed data - use segmentData for dates
    const afterData = transformedValues.map((val, i) => {
      const dateIndex = Math.min(i + dateOffset, segmentData.length - 1);
      const dateValue = segmentData[dateIndex]?.[dateColumn];
      return {
        date: formatDateStr(dateValue) || `Point ${i + 1}`,
        value: Number.isFinite(val) ? val : 0,
      };
    });

    return { beforeData, afterData, hasTransformations: transformations.length > 0 };
  }, [originalData, dateColumn, segmentColumn, selectedSegment, dependentVariable, selectedTransformations]);

  const formatNumber = (num: number | null, decimals = 4): string => {
    if (num === null || num === undefined) return "N/A";
    return num.toFixed(decimals);
  };

  // Download helper functions
  const downloadCSV = (data: string, filename: string) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadForecast = () => {
    if (!currentSegmentResult) return;

    const headers = ['Date', 'Actual', 'Predicted', 'Lower Bound', 'Upper Bound', 'Type'];
    const rows = currentSegmentResult.forecastData.map((point) => [
      point.date,
      point.actual ?? '',
      point.predicted ?? '',
      point.lowerBound ?? '',
      point.upperBound ?? '',
      point.isForecast ? 'Forecast' : point.isTestSet ? 'Test' : 'Train'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    downloadCSV(csvContent, `forecast_${selectedSegment}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadMetrics = () => {
    if (!currentSegmentResult) return;

    const headers = ['Metric', 'Full Name', 'Training Value', 'Test Value'];
    const rows = currentSegmentResult.metrics.map((m) => [
      m.metric.toUpperCase(),
      metricNames[m.metric] || m.metric,
      m.trainValue ?? '',
      m.testValue ?? ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    downloadCSV(csvContent, `metrics_${selectedSegment}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadOriginalData = () => {
    if (!originalData || originalData.length === 0) return;

    // Get all column names from the first row
    const headers = Object.keys(originalData[0]);

    // Filter by segment if applicable
    let dataToExport = originalData;
    if (segmentColumn && selectedSegment && selectedSegment !== "All Data") {
      dataToExport = originalData.filter(
        (row) => String(row[segmentColumn]) === selectedSegment
      );
    }

    const rows = dataToExport.map((row) =>
      headers.map((h) => {
        const val = row[h];
        // Escape commas and quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    downloadCSV(csvContent, `data_${selectedSegment}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Detect if dates are monthly based on frequency setting or data pattern
  const isMonthlyData = useMemo(() => {
    if (!currentSegmentResult) return false;
    // Check frequency setting first - MS (monthly), QS (quarterly), YS (yearly) should show without day
    const freq = currentSegmentResult.frequency;
    if (freq === 'MS' || freq === 'QS' || freq === 'YS') return true;

    // Fallback: check data pattern
    const dates = currentSegmentResult.forecastData.slice(0, 10).map((p) => {
      try {
        return new Date(p.date);
      } catch {
        return null;
      }
    }).filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    if (dates.length === 0) return false;

    // Check if all dates are on day 1
    const allDay1 = dates.every((d) => d.getDate() === 1);
    if (allDay1) return true;

    // Check if gaps are ~28-31 days (monthly)
    if (dates.length >= 2) {
      const gaps = dates.slice(1).map((d, i) => (d.getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24));
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      return avgGap >= 25;
    }
    return false;
  }, [currentSegmentResult]);

  const formatDate = (dateStr: string): string => {
    try {
      // Handle YYYY/MM/DD format (with slashes) - monthly data
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
        const [year, month] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, 1)
          .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }

      // Handle YYYY-MM-DD format (with dashes)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-');
        const d = parseInt(day);
        if (d === 1 || d >= 28 || isMonthlyData) {
          return new Date(parseInt(year), parseInt(month) - 1, d)
            .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        }
        return new Date(parseInt(year), parseInt(month) - 1, d)
          .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
      }

      // Handle YYYY-MM format directly
      if (/^\d{4}-\d{2}$/.test(dateStr)) {
        const [year, month] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1)
          .toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      if (isMonthlyData) {
        return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }
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
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={handleDownloadForecast} title="Download Forecast">
                <LineChartIcon className="h-4 w-4 mr-1" />
                Forecast
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMetrics} title="Download Metrics">
                <Table2 className="h-4 w-4 mr-1" />
                Metrics
              </Button>
              {originalData && originalData.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleDownloadOriginalData} title="Download Data">
                  <FileText className="h-4 w-4 mr-1" />
                  Data
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Forecast</TabsTrigger>
            <TabsTrigger value="comparison">
              <BarChart3 className="h-4 w-4 mr-1" />
              Before/After
            </TabsTrigger>
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
          <TabsContent value="comparison" className="mt-4">
            {transformationComparisonData ? (
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
                  <div className="border-2 rounded-lg p-4 bg-blue-50/30">
                    <h4 className="text-sm font-medium mb-2 text-center text-blue-700">Original Data (Before)</h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={transformationComparisonData.beforeData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: '#6b7280' }}
                            interval="preserveStartEnd"
                            axisLine={{ stroke: '#9ca3af' }}
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: '#6b7280' }}
                            width={60}
                            axisLine={{ stroke: '#9ca3af' }}
                            tickFormatter={(val) => typeof val === 'number' ? val.toFixed(2) : val}
                          />
                          <Tooltip
                            formatter={(value: number) => [value?.toFixed(4), 'Value']}
                            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ r: 2, fill: '#2563eb', stroke: '#2563eb' }}
                            activeDot={{ r: 4, fill: '#2563eb' }}
                            connectNulls={true}
                            isAnimationActive={false}
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
                  <div className="border-2 rounded-lg p-4 bg-green-50/30">
                    <h4 className="text-sm font-medium mb-2 text-center text-green-700">
                      After Transformation
                      {!hasTransformations && " (No transformation applied)"}
                    </h4>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={transformationComparisonData.afterData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: '#6b7280' }}
                            interval="preserveStartEnd"
                            axisLine={{ stroke: '#9ca3af' }}
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: '#6b7280' }}
                            width={60}
                            axisLine={{ stroke: '#9ca3af' }}
                            tickFormatter={(val) => typeof val === 'number' ? val.toFixed(2) : val}
                          />
                          <Tooltip
                            formatter={(value: number) => [value?.toFixed(4), 'Value']}
                            contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#16a34a"
                            strokeWidth={2}
                            dot={{ r: 2, fill: '#16a34a', stroke: '#16a34a' }}
                            activeDot={{ r: 4, fill: '#16a34a' }}
                            connectNulls={true}
                            isAnimationActive={false}
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transformation comparison data available.</p>
                <p className="text-sm mt-2">Make sure data is loaded and variables are configured.</p>
              </div>
            )}
          </TabsContent>

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
