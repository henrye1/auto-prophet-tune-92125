import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { TrendingUp, Target, Activity, Wand2, FileDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResultsTable } from "./ResultsTable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { ForecastResults as ForecastResultsType } from "@/types/forecastResults";
import type { PerformanceMetric, ForecastConfig } from "@/types/forecast";

interface ForecastResultsProps {
  results: ForecastResultsType;
  selectedMetrics: PerformanceMetric[];
  config?: ForecastConfig;
  csvData?: any[];
  modelId?: string;
  modelName?: string;
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

export const ForecastResults = ({ results, selectedMetrics, config, csvData, modelId, modelName }: ForecastResultsProps) => {
  const { toast } = useToast();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [exportType, setExportType] = useState<"pdf" | "html">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const saveReportToDatabase = async (reportData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to save reports", variant: "destructive" });
      return null;
    }

    const { data, error } = await supabase
      .from('saved_reports')
      .insert({
        user_id: user.id,
        model_id: modelId,
        report_name: reportData.name,
        report_type: reportData.type,
        report_data: reportData.data,
        forecast_config: config,
        model_name: modelName
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: `Failed to save report: ${error.message}`, variant: "destructive" });
      return null;
    }

    return data;
  };

  const generateReportHTML = (forStandalone: boolean = false) => {
    const styles = `
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
        .report-container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { color: #111827; font-size: 32px; margin-bottom: 8px; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; }
        h2 { color: #374151; font-size: 24px; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        h3 { color: #4b5563; font-size: 20px; margin-top: 24px; margin-bottom: 12px; }
        .meta { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
        .segment-section { margin-bottom: 48px; padding: 24px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .segment-title { font-size: 28px; color: #1f2937; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
        .metric-card { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
        .metric-value { font-size: 24px; font-weight: 700; color: #111827; margin-top: 4px; }
        .ai-commentary { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .ai-commentary-title { font-weight: 600; color: #1e40af; margin-bottom: 8px; }
        .config-section { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .config-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 14px; }
        .config-item { padding: 8px; background: white; border-radius: 4px; }
        .config-label { font-weight: 600; color: #374151; }
        .config-value { color: #6b7280; }
        .chart-placeholder { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 40px; text-align: center; color: #6b7280; margin: 20px 0; }
      </style>
    `;

    let html = forStandalone ? `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${reportName || 'Forecast Report'}</title>${styles}</head><body>` : '';
    html += `<div class="report-container">`;
    html += `<h1>Forecast Report: ${reportName || modelName || 'Unnamed Report'}</h1>`;
    html += `<div class="meta">Model: ${results.model} | Generated: ${new Date(results.timestamp).toLocaleString()}</div>`;

    // Configuration Section
    if (config) {
      html += `<div class="config-section">`;
      html += `<h2>Configuration</h2>`;
      html += `<div class="config-grid">`;
      html += `<div class="config-item"><span class="config-label">Model:</span> <span class="config-value">${config.model}</span></div>`;
      html += `<div class="config-item"><span class="config-label">Date Column:</span> <span class="config-value">${config.date_column}</span></div>`;
      html += `<div class="config-item"><span class="config-label">Target Variable:</span> <span class="config-value">${config.dependent_variable}</span></div>`;
      html += `<div class="config-item"><span class="config-label">Segment Column:</span> <span class="config-value">${config.segment_column}</span></div>`;
      html += `</div></div>`;
    }

    // Segments
    results.segments.forEach((segment) => {
      html += `<div class="segment-section">`;
      html += `<div class="segment-title">Segment: ${segment.segment}</div>`;
      
      if (segment.metrics) {
        html += `<h3>Performance Metrics</h3>`;
        html += `<div class="metrics-grid">`;
        selectedMetrics.forEach((metric) => {
          const value = segment.metrics?.[metric];
          if (value !== undefined) {
            const isPercentage = ['mape', 'coverage', 'smape', 'r2'].includes(metric);
            html += `<div class="metric-card">`;
            html += `<div class="metric-label">${metricLabels[metric]}</div>`;
            html += `<div class="metric-value">${value.toFixed(metric === 'r2' ? 3 : isPercentage ? 1 : 2)}${isPercentage && metric !== 'r2' ? '%' : ''}</div>`;
            html += `</div>`;
          }
        });
        html += `</div>`;
      }

      if (segment.ai_commentary) {
        html += `<div class="ai-commentary">`;
        html += `<div class="ai-commentary-title">AI Analysis</div>`;
        html += `<div>${segment.ai_commentary.replace(/\n/g, '<br>')}</div>`;
        html += `</div>`;
      }

      html += `<div class="chart-placeholder">📊 Chart: Complete Time Series<br><small>(Visual charts are captured in PDF/HTML exports)</small></div>`;
      
      if (segment.test_data.length > 0) {
        html += `<div class="chart-placeholder">📈 Chart: Test Set Performance<br><small>(Visual charts are captured in PDF/HTML exports)</small></div>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
    if (forStandalone) html += `</body></html>`;
    
    return html;
  };

  const exportPDF = async () => {
    if (!reportName.trim()) {
      toast({ title: "Error", description: "Please enter a report name", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      // Create a temporary container for the report
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '1200px';
      tempContainer.innerHTML = generateReportHTML(false);
      document.body.appendChild(tempContainer);

      // Capture charts
      const chartImages: { [key: string]: string } = {};
      for (const [key, ref] of Object.entries(chartRefs.current)) {
        if (ref) {
          try {
            const canvas = await html2canvas(ref, { scale: 2, backgroundColor: '#ffffff' });
            chartImages[key] = canvas.toDataURL('image/png');
          } catch (err) {
            console.error(`Failed to capture chart ${key}:`, err);
          }
        }
      }

      // Generate PDF
      const canvas = await html2canvas(tempContainer, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      document.body.removeChild(tempContainer);

      // Save to database
      await saveReportToDatabase({
        name: reportName,
        type: 'pdf',
        data: {
          results,
          config,
          selectedMetrics,
          timestamp: new Date().toISOString()
        }
      });

      toast({ title: "Success", description: "PDF report exported and saved successfully" });
      setExportDialogOpen(false);
      setReportName("");
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: "Error", description: "Failed to export PDF report", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportHTML = async () => {
    if (!reportName.trim()) {
      toast({ title: "Error", description: "Please enter a report name", variant: "destructive" });
      return;
    }

    setIsExporting(true);
    try {
      const htmlContent = generateReportHTML(true);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName.replace(/[^a-z0-9]/gi, '_')}.html`;
      link.click();
      URL.revokeObjectURL(url);

      // Save to database
      await saveReportToDatabase({
        name: reportName,
        type: 'html',
        data: {
          results,
          config,
          selectedMetrics,
          timestamp: new Date().toISOString()
        }
      });

      toast({ title: "Success", description: "HTML report exported and saved successfully" });
      setExportDialogOpen(false);
      setReportName("");
    } catch (error) {
      console.error('HTML export error:', error);
      toast({ title: "Error", description: "Failed to export HTML report", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSVDetailed = async () => {
    if (!config || !csvData) return;

    const csvRows: any[] = [];
    
    // Header
    csvRows.push(['Forecast Report - Detailed']);
    csvRows.push(['Generated', new Date().toISOString()]);
    csvRows.push(['Model', results.model]);
    csvRows.push([]);

    // Configuration
    csvRows.push(['Configuration']);
    csvRows.push(['Date Column', config.date_column]);
    csvRows.push(['Target Variable', config.dependent_variable]);
    csvRows.push(['Segment Column', config.segment_column]);
    csvRows.push([]);

    // Segments Data
    results.segments.forEach((segment) => {
      csvRows.push([`Segment: ${segment.segment}`]);
      csvRows.push([]);

      if (segment.metrics) {
        csvRows.push(['Metrics']);
        selectedMetrics.forEach((metric) => {
          const value = segment.metrics?.[metric];
          if (value !== undefined) {
            csvRows.push([metricLabels[metric], value]);
          }
        });
        csvRows.push([]);
      }

      if (segment.ai_commentary) {
        csvRows.push(['AI Commentary', segment.ai_commentary]);
        csvRows.push([]);
      }

      csvRows.push(['Time Series Data']);
      csvRows.push(['Date', 'Actual', 'Predicted', 'Lower Bound', 'Upper Bound', 'Data Type']);
      
      segment.training_data.forEach((point) => {
        csvRows.push([point.date, point.actual, point.predicted, point.lower_bound, point.upper_bound, 'Training']);
      });
      
      segment.test_data.forEach((point) => {
        csvRows.push([point.date, point.actual, point.predicted, point.lower_bound, point.upper_bound, 'Test']);
      });
      
      segment.forecast_data.forEach((point) => {
        csvRows.push([point.date, '', point.predicted, point.lower_bound, point.upper_bound, 'Forecast']);
      });
      
      csvRows.push([]);
    });

    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forecast_detailed_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Success", description: "Detailed CSV exported successfully" });
  };

  const exportCSVSummary = async () => {
    const csvRows: any[] = [];
    
    csvRows.push(['Segment', 'Model', ...selectedMetrics.map(m => metricLabels[m])]);
    
    results.segments.forEach((segment) => {
      const row = [
        segment.segment,
        segment.model || results.model,
        ...selectedMetrics.map(metric => segment.metrics?.[metric] ?? '')
      ];
      csvRows.push(row);
    });

    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forecast_summary_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Success", description: "Summary CSV exported successfully" });
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
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Forecast Results
              </CardTitle>
              <CardDescription>
                Model: {results.model} | Generated: {new Date(results.timestamp).toLocaleString()}
              </CardDescription>
            </div>
            {config && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSVDetailed}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Detailed CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSVSummary}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Summary CSV
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setExportType("pdf");
                    setExportDialogOpen(true);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setExportType("html");
                    setExportDialogOpen(true);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export HTML
                </Button>
              </div>
            )}
          </div>
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

            {/* Complete Time Series */}
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
                <div ref={el => chartRefs.current[`complete-${segment.segment}`] = el}>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30">
                      <div className="w-3 h-3 rounded-full bg-blue-600 mr-2" />
                      Actual Data
                    </Badge>
                    <Badge variant="outline" className="bg-gray-500/10 border-gray-500/30">
                      <div className="w-3 h-3 rounded-full bg-gray-600 mr-2" />
                      Training Fit
                    </Badge>
                    <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30">
                      <div className="w-3 h-3 rounded-full bg-orange-600 mr-2" />
                      Test Predictions
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30">
                      <div className="w-3 h-3 rounded-full bg-purple-600 mr-2" />
                      Forecast
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30">
                      <div className="w-3 h-3 bg-emerald-600/40 mr-2" />
                      95% Confidence
                    </Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={(() => {
                      const allData = [...segment.training_data, ...segment.test_data, ...segment.forecast_data];
                      return allData.map((point, idx) => {
                        const testStartIdx = segment.training_data.length;
                        const testEndIdx = testStartIdx + segment.test_data.length;
                        
                        let training_predicted = null;
                        let fitted = null;
                        let forecast = null;
                        
                        if (idx < testStartIdx) {
                          training_predicted = point.predicted;
                        } else if (idx >= testStartIdx && idx < testEndIdx) {
                          fitted = point.predicted;
                        } else {
                          forecast = point.predicted;
                        }
                        
                        return { ...point, training_predicted, fitted, forecast };
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
                        dataKey="training_predicted"
                        stroke="rgb(107, 114, 128)"
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                        dot={false}
                        name="Training Fit"
                        connectNulls={true}
                        strokeOpacity={0.6}
                      />
                      
                      <Line
                        type="monotone"
                        dataKey="fitted"
                        stroke="rgb(249, 115, 22)"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{ fill: 'rgb(249, 115, 22)', r: 3 }}
                        name="Test Predictions"
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
                </div>
              </CardContent>
            </Card>

            {/* Test Performance */}
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
                  <div ref={el => chartRefs.current[`test-${segment.segment}`] = el}>
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
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
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

      {/* Export Dialog */}
      {exportDialogOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">
              Export {exportType.toUpperCase()} Report
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a name for your report before exporting
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="reportName" className="text-sm font-medium">
                  Report Name
                </label>
                <input
                  id="reportName"
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="e.g., Q1 Sales Forecast"
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setExportDialogOpen(false);
                    setReportName("");
                  }}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={exportType === "pdf" ? exportPDF : exportHTML}
                  disabled={isExporting}
                >
                  {isExporting ? "Exporting..." : `Export ${exportType.toUpperCase()}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
