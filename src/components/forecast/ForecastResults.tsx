import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Target, Activity, Wand2, Download } from "lucide-react";
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

  // Helper to check if a value is valid (not NaN, null, or undefined)
  const isValidNumber = (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  };

  // Helper to generate confidence interval legend labels
  const getConfidenceLabels = (segment: any) => {
    const intervalWidth = segment.interval_width ?? 0.80;
    const lowerBound = segment.lower_bound;
    const upperBound = segment.upper_bound;
    
    if (lowerBound !== undefined && upperBound !== undefined) {
      // Custom percentiles specified
      return {
        lower: `Lower Bound (${(lowerBound * 100).toFixed(0)}%)`,
        upper: `Upper Bound (${(upperBound * 100).toFixed(0)}%)`
      };
    } else {
      // Using interval_width
      const lowerPercentile = ((1 - intervalWidth) / 2 * 100).toFixed(0);
      const upperPercentile = ((1 + intervalWidth) / 2 * 100).toFixed(0);
      return {
        lower: `Lower Bound (${lowerPercentile}%)`,
        upper: `Upper Bound (${upperPercentile}%)`
      };
    }
  };

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
            html += `<div class="metric">
              <div class="metric-label">${metricLabels[m]}</div>
              <div class="metric-value">${v.toFixed(['r2','adj_r2'].includes(m) ? 3 : isPct ? 1 : 2)}${isPct && !['r2','adj_r2'].includes(m) ? '%' : ''}</div>
            </div>`;
          }
        });
        html += '</div>';
      }
      if (seg.ai_commentary) {
        html += `<div class="ai"><strong>AI Commentary:</strong><p>${seg.ai_commentary.replace(/\n/g,'<br>')}</p></div>`;
      }

      const charts = document.querySelectorAll(`[data-seg="${seg.segment}"] .recharts-wrapper`);
      for (let i = 0; i < charts.length; i++) {
        const canvas = await html2canvas(charts[i] as HTMLElement);
        html += `<div class="chart"><img src="${canvas.toDataURL()}" alt="Chart ${i+1}"/></div>`;
      }
    }
    html += '</body></html>';

    if (exportFormat === 'pdf') {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          toast.success("Print dialog opened");
        }, 500);
      }
    } else {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML report downloaded");
    }
    setExportDialog(false);
  };

  const doExport = () => {
    if (exportFormat === 'csv') exportCSV();
    else exportHTML();
  };

  if (!results || !results.segments || results.segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Results Available</CardTitle>
          <CardDescription>Run a forecast to see results here</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Forecast Results</CardTitle>
              <CardDescription>
                Model: {results.model} | Generated: {new Date(results.timestamp).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openExport('csv')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button onClick={() => openExport('html')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                HTML
              </Button>
              <Button onClick={() => openExport('pdf')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Name your report and select format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportName">Report Name</Label>
              <Input
                id="reportName"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialog(false)}>Cancel</Button>
            <Button onClick={doExport}>Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue={results.segments[0].segment} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-auto">
          {results.segments.map((segment, idx) => (
            <TabsTrigger key={idx} value={segment.segment} className="flex-1 min-w-[120px]">
              {segment.segment}
            </TabsTrigger>
          ))}
        </TabsList>

        {results.segments.map((segment, idx) => (
          <TabsContent key={idx} value={segment.segment} className="space-y-6" data-seg={segment.segment}>
            {/* Segment error indicator */}
            {segment.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p className="font-semibold text-sm mb-1">This segment could not be forecast</p>
                  <p className="text-sm">{segment.error}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Metrics Card - Primary Model */}
            {!segment.error && segment.metrics && (
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
                      const benchmarkValue = segment.benchmark_metrics?.[metric];
                      if (value === undefined) return null;

                      const isPercentage = ['mape', 'coverage', 'smape', 'r2', 'adj_r2'].includes(metric);
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
                              <p className={`text-2xl font-bold ${isBetterThanBenchmark ? 'text-green-600' : ''}`}>
                                {value.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
                                {isPercentage && !['r2', 'adj_r2'].includes(metric) ? '%' : ''}
                              </p>
                            </div>
                            {benchmarkValue !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                vs {segment.benchmark_model} {benchmarkValue.toFixed(['r2', 'adj_r2'].includes(metric) ? 3 : isPercentage ? 1 : 2)}
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

            {/* Complete Time Series */}
            {!segment.error && <Card className="border-green-500/30 bg-green-50/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  Complete Time Series
                </CardTitle>
                <CardDescription>
                  Training data, test predictions, and future forecast
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
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30">
                    <div className="w-3 h-3 bg-emerald-600/40 mr-2" />
                    {((segment.interval_width ?? 0.8) * 100).toFixed(0)}% Confidence
                  </Badge>
                </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={(() => {
                      const trainingData = segment.training_data || [];
                      const testData = segment.test_data || [];
                      const forecastData = segment.forecast_data || [];
                      const allData = [...trainingData, ...testData, ...forecastData];
                      
                      return allData.map((point, idx) => {
                        const testStartIdx = trainingData.length;
                        const testEndIdx = testStartIdx + testData.length;
                        const forecastStartIdx = testEndIdx;
                        
                        let fitted = null;
                        let forecast = null;
                        
                        if (idx >= testStartIdx && idx < testEndIdx) {
                          fitted = point.predicted;
                        } else if (idx >= forecastStartIdx) {
                          forecast = point.predicted;
                        }
                        
                        return {
                          date: point.date,
                          actual: isValidNumber(point.actual) ? point.actual : null,
                          fitted: isValidNumber(fitted) ? fitted : null,
                          forecast: isValidNumber(forecast) ? forecast : null,
                          lower_bound: isValidNumber(point.lower_bound) ? point.lower_bound : null,
                          upper_bound: isValidNumber(point.upper_bound) ? point.upper_bound : null,
                        };
                      });
                    })()}>
                    <defs>
                      <linearGradient id={`confidenceGradient-transformed-${segment.segment}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity={0.05} />
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
                    
                    <Area
                      type="monotone"
                      dataKey="upper_bound"
                      stroke="rgb(16, 185, 129)"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      fill={`url(#confidenceGradient-transformed-${segment.segment})`}
                      name={getConfidenceLabels(segment).upper}
                    />
                    <Area
                      type="monotone"
                      dataKey="lower_bound"
                      stroke="rgb(16, 185, 129)"
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      fill={`url(#confidenceGradient-transformed-${segment.segment})`}
                      name={getConfidenceLabels(segment).lower}
                    />
                    
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="rgb(37, 99, 235)"
                      strokeWidth={2.5}
                      dot={false}
                      name="Actual Data"
                      connectNulls={true}
                    />
                    
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
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>}

            {/* Results Table */}
            {!segment.error && (
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
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
