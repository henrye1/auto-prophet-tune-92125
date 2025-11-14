import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { TrendingUp, Target, Activity, Wand2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResultsTable } from "./ResultsTable";
import { toast } from "sonner";
import html2canvas from "html2canvas";
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
  adj_r2: "Adjusted R²",
  coverage: "Coverage",
  smape: "SMAPE",
  mase: "MASE",
};

export const ForecastResults = ({ results, selectedMetrics }: ForecastResultsProps) => {
  const [exportDialog, setExportDialog] = useState(false);
  const [reportName, setReportName] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "html" | "pdf">("pdf");

  const openExport = (format: "csv" | "html" | "pdf") => {
    setExportFormat(format);
    setReportName(`Forecast_${new Date().toISOString().split('T')[0]}`);
    setExportDialog(true);
  };

  const exportCSV = () => {
    let csv = "Segment,Date,Actual,Predicted,Lower,Upper,Type\n";
    results.segments.forEach(seg => {
      [...seg.training_data.map(d => ({...d, type: 'Train'})),
       ...seg.test_data.map(d => ({...d, type: 'Test'})),
       ...seg.forecast_data.map(d => ({...d, type: 'Forecast'}))
      ].forEach(row => {
        csv += `${seg.segment},${row.date},${row.actual||''},${row.predicted},${row.lower_bound||''},${row.upper_bound||''},${row.type}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const exportHTML = async () => {
    toast.loading("Capturing charts...");
    let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${reportName}</title>
<style>
  body{font-family:Arial;margin:40px;background:#fff}
  h1{color:#333;border-bottom:3px solid #4f46e5;padding-bottom:10px}
  h2{color:#4f46e5;margin-top:30px}
  .meta{color:#666;margin-bottom:30px}
  .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0}
  .metric{padding:15px;background:#f9fafb;border-left:4px solid #4f46e5}
  .metric-label{font-size:12px;color:#666}
  .metric-value{font-size:24px;font-weight:bold}
  .chart{margin:30px 0}
  .chart img{max-width:100%;border:1px solid #e5e7eb}
  .ai{background:#eff6ff;padding:20px;margin:20px 0;border-left:4px solid #3b82f6}
  @media print{body{margin:20px}}
</style></head><body>
<h1>${reportName}</h1>
<div class="meta"><p><strong>Model:</strong> ${results.model}</p>
<p><strong>Generated:</strong> ${new Date(results.timestamp).toLocaleString()}</p></div>`;

    for (const seg of results.segments) {
      html += `<h2>${seg.segment}</h2>`;
      if (seg.metrics) {
        html += '<div class="metrics">';
        selectedMetrics.forEach(m => {
          const v = seg.metrics?.[m];
          if (v !== undefined) {
            const isPct = ['mape','coverage','smape','r2','adj_r2'].includes(m);
            html += `<div class="metric"><div class="metric-label">${metricLabels[m]}</div>
<div class="metric-value">${v.toFixed(['r2','adj_r2'].includes(m)?3:isPct?1:2)}${isPct&&!['r2','adj_r2'].includes(m)?'%':''}</div></div>`;
          }
        });
        html += '</div>';
      }
      if (seg.ai_commentary) {
        html += `<div class="ai"><strong>AI Analysis:</strong><br>${seg.ai_commentary.replace(/\n/g,'<br>')}</div>`;
      }
      const charts = document.querySelectorAll(`[data-seg="${seg.segment}"] .recharts-wrapper`);
      for (let i = 0; i < charts.length; i++) {
        const canvas = await html2canvas(charts[i] as HTMLElement, { backgroundColor: '#fff', scale: 2 });
        html += `<div class="chart"><img src="${canvas.toDataURL('image/png')}"/></div>`;
      }
    }
    html += '</body></html>';

    if (exportFormat === 'html') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML downloaded");
    } else {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
        toast.success("Print dialog opened");
      }
    }
  };

  const doExport = async () => {
    setExportDialog(false);
    if (exportFormat === 'csv') exportCSV();
    else await exportHTML();
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Forecast Results
              </CardTitle>
              <CardDescription>
                Model: {results.model} | Generated: {new Date(results.timestamp).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openExport('csv')}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => openExport('html')}>
                <Download className="h-4 w-4 mr-2" />HTML
              </Button>
              <Button variant="outline" size="sm" onClick={() => openExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>Name your report</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Report Name</Label>
            <Input id="name" value={reportName} onChange={(e) => setReportName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialog(false)}>Cancel</Button>
            <Button onClick={doExport}>Export {exportFormat.toUpperCase()}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={results.segments[0]?.segment || "0"} className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex-wrap h-auto">
          {results.segments.map((segment, idx) => (
            <TabsTrigger key={idx} value={segment.segment} className="flex-1 min-w-[120px]">
              {segment.segment}
            </TabsTrigger>
          ))}
        </TabsList>

        {results.segments.map((segment, idx) => (
          <TabsContent key={idx} value={segment.segment} className="space-y-6" data-seg={segment.segment}>
            {/* Metrics Card - Primary Model */}
            {segment.metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Model Performance: {segment.model || results.model}
                    {segment.transformations_applied && segment.transformations_applied.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        Transformations Applied
                      </Badge>
                    )}
                  </CardTitle>
                  {segment.transformations_applied && segment.transformations_applied.length > 0 && (
                    <CardDescription>
                      Applied transformations: {segment.transformations_applied.join(', ')}
                      {segment.benchmark_model && ` | Benchmark: ${segment.benchmark_model}`}
                    </CardDescription>
                  )}
                  {!segment.transformations_applied && segment.benchmark_model && (
                    <CardDescription>
                      Comparing with AI-recommended benchmark: {segment.benchmark_model}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedMetrics.map((metric) => {
                      const value = segment.metrics?.[metric];
                      const rawValue = segment.raw_metrics?.[metric];
                      const benchmarkValue = segment.benchmark_metrics?.[metric];
                      if (value === undefined) return null;
                      
                      const isPercentage = ['mape', 'coverage', 'smape', 'r2', 'adj_r2'].includes(metric);
                      const isBetterThanRaw = rawValue !== undefined && (
                        ['mae', 'rmse', 'mse', 'mape', 'smape', 'mase'].includes(metric) 
                          ? value < rawValue 
                          : value > rawValue
                      );
                      const isBetterThanBenchmark = benchmarkValue !== undefined && (
                        ['mae', 'rmse', 'mse', 'mape', 'smape', 'mase'].includes(metric) 
                          ? value < benchmarkValue 
                          : value > benchmarkValue
                      );
                      
                      return (
                        <div key={metric} className="space-y-1">
                          <p className="text-xs text-muted-foreground">{metricLabels[metric]}</p>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-baseline gap-2">
                              <p className={`text-2xl font-bold ${(isBetterThanRaw || isBetterThanBenchmark) ? 'text-green-600' : ''}`}>
                                {value.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
                                {isPercentage && !['r2', 'adj_r2'].includes(metric) ? '%' : ''}
                              </p>
                              {rawValue !== undefined && (
                                <p className="text-xs text-muted-foreground">
                                  vs raw {rawValue.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
                                  {isPercentage && !['r2', 'adj_r2'].includes(metric) ? '%' : ''}
                                </p>
                              )}
                            </div>
                            {benchmarkValue !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                benchmark: {benchmarkValue.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
                                {isPercentage && !['r2', 'adj_r2'].includes(metric) ? '%' : ''}
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

            {/* Transformation Impact Comparison */}
            {segment.raw_test_data && segment.raw_metrics && (
              <Card className="border-blue-500/30 bg-blue-50/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Transformation Impact: Test Set Performance
                  </CardTitle>
                  <CardDescription>
                    Visual comparison of model performance with and without transformations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={segment.test_data.map((d, i) => ({
                      date: d.date,
                      actual: d.actual,
                      transformed_predicted: d.predicted,
                      raw_predicted: segment.raw_test_data?.[i]?.predicted,
                    }))}>
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
                        dot={{ fill: 'rgb(37, 99, 235)', r: 4 }}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="transformed_predicted"
                        stroke="rgb(34, 197, 94)"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{ fill: 'rgb(34, 197, 94)', r: 3 }}
                        name="With Transformations"
                      />
                      <Line
                        type="monotone"
                        dataKey="raw_predicted"
                        stroke="rgb(239, 68, 68)"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={{ fill: 'rgb(239, 68, 68)', r: 3 }}
                        name="Without Transformations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-semibold text-green-800 mb-2">With Transformations</p>
                      <div className="space-y-1">
                        {selectedMetrics.slice(0, 3).map((metric) => {
                          const value = segment.metrics?.[metric];
                          if (value === undefined) return null;
                          const isPercentage = ['mape', 'coverage', 'smape', 'r2', 'adj_r2'].includes(metric);
                          return (
                            <div key={metric} className="flex justify-between text-sm">
                              <span className="text-green-700">{metricLabels[metric]}:</span>
                              <span className="font-semibold text-green-900">
                                {value.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
                                {isPercentage && !['r2', 'adj_r2'].includes(metric) ? '%' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-semibold text-red-800 mb-2">Without Transformations</p>
                      <div className="space-y-1">
                        {selectedMetrics.slice(0, 3).map((metric) => {
                          const value = segment.raw_metrics?.[metric];
                          if (value === undefined) return null;
                          const isPercentage = ['mape', 'coverage', 'smape', 'r2', 'adj_r2'].includes(metric);
                          return (
                            <div key={metric} className="flex justify-between text-sm">
                              <span className="text-red-700">{metricLabels[metric]}:</span>
                              <span className="font-semibold text-red-900">
                                {value.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
                                {isPercentage && !['r2', 'adj_r2'].includes(metric) ? '%' : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Complete Time Series - Transformed Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Complete Time Series: Transformed Data
                  {segment.transformations_applied && (
                    <Badge variant="secondary" className="ml-2">
                      {segment.transformations_applied.join(', ')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Training data, test predictions, and future forecast with transformations applied
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
                      let raw_fitted = null;
                      let raw_forecast = null;
                      let benchmark_predicted = null;
                      
                      if (idx >= testStartIdx && idx < testEndIdx) {
                        // This is test data - show fitted line
                        fitted = point.predicted;
                        if (segment.raw_test_data) {
                          raw_fitted = segment.raw_test_data[idx - testStartIdx]?.predicted;
                        }
                        if (segment.benchmark_test_data) {
                          benchmark_predicted = segment.benchmark_test_data[idx - testStartIdx]?.predicted;
                        }
                      } else if (idx >= forecastStartIdx) {
                        // This is forecast data - show forecast line
                        forecast = point.predicted;
                        if (segment.raw_forecast_data) {
                          raw_forecast = segment.raw_forecast_data[idx - forecastStartIdx]?.predicted;
                        }
                        if (segment.benchmark_forecast_data) {
                          benchmark_predicted = segment.benchmark_forecast_data[idx - forecastStartIdx]?.predicted;
                        }
                      }
                      
                      return { 
                        ...point, 
                        fitted,
                        forecast,
                        raw_fitted,
                        raw_forecast,
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
                      name="Forecast - Transformed"
                      connectNulls={true}
                    />
                    
                    {/* Raw data predictions (if available) */}
                    {segment.raw_test_data && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="raw_fitted"
                          stroke="rgb(239, 68, 68)"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={{ fill: 'rgb(239, 68, 68)', r: 2 }}
                          name="Fitted (Test) - Raw"
                          connectNulls={true}
                        />
                        <Line
                          type="monotone"
                          dataKey="raw_forecast"
                          stroke="rgb(236, 72, 153)"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={{ fill: 'rgb(236, 72, 153)', r: 2 }}
                          name="Forecast - Raw"
                          connectNulls={true}
                        />
                      </>
                    )}
                    
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
