import { Button } from "@/components/ui/button";
import { FileText, Download, FileCode } from "lucide-react";
import { toast } from "sonner";
import type { ForecastResults } from "@/types/forecastResults";
import type { ForecastConfig } from "@/types/forecast";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportExportProps {
  results: ForecastResults;
  config: ForecastConfig;
  csvData?: any[];
  modelId?: string;
  modelName?: string;
}

export function ReportExport({ results, config, csvData, modelId, modelName }: ReportExportProps) {
  const saveReportToDatabase = async (reportData: any, reportName: string, reportType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save reports");
        return;
      }

      const { error } = await supabase
        .from("forecast_reports")
        .insert({
          user_id: user.id,
          model_id: modelId || null,
          report_name: reportName,
          report_type: reportType,
          report_data: reportData,
        });

      if (error) throw error;
      toast.success("Report saved to database");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report to database");
    }
  };

  const exportDetailedCSV = async () => {
    try {
      const exportData: any[] = [];
      const timestamp = new Date().toISOString();
      
      // Add configuration header section
      exportData.push({ Section: "FORECAST CONFIGURATION" });
      exportData.push({ Section: "Report Generated", Value: timestamp });
      exportData.push({ Section: "Model Name", Value: modelName || "Unsaved Model" });
      exportData.push({ Section: "Model Type", Value: config.model });
      exportData.push({ Section: "Date Column", Value: config.date_column });
      exportData.push({ Section: "Segment Column", Value: config.segment_column });
      exportData.push({ Section: "Dependent Variable", Value: config.dependent_variable });
      exportData.push({ Section: "Performance Metrics", Value: config.performance_metrics.join(", ") });
      exportData.push({});

      // Add model-specific parameters
      if (config.model === 'prophet' && config.prophet_params) {
        exportData.push({ Section: "PROPHET PARAMETERS" });
        Object.entries(config.prophet_params).forEach(([key, value]) => {
          exportData.push({ Section: key, Value: JSON.stringify(value) });
        });
        exportData.push({});
      } else if (config.model === 'autogluon' && config.autogluon_params) {
        exportData.push({ Section: "AUTOGLUON PARAMETERS" });
        Object.entries(config.autogluon_params).forEach(([key, value]) => {
          exportData.push({ Section: key, Value: JSON.stringify(value) });
        });
        exportData.push({});
      } else if (config.traditional_params) {
        exportData.push({ Section: "MODEL PARAMETERS" });
        Object.entries(config.traditional_params).forEach(([key, value]) => {
          exportData.push({ Section: key, Value: JSON.stringify(value) });
        });
        exportData.push({});
      }

      // Add segment configurations
      exportData.push({ Section: "SEGMENT CONFIGURATIONS" });
      config.segments.forEach((seg, idx) => {
        exportData.push({ Section: `Segment ${idx + 1}`, Value: seg.segment });
        exportData.push({ Section: "Segment Value", Value: seg.segmentValue });
        exportData.push({ Section: "Forecast Periods", Value: seg.forecast_periods });
        exportData.push({ Section: "Frequency", Value: seg.frequency });
        exportData.push({ Section: "Training Records", Value: seg.training_records });
        exportData.push({ Section: "Test Records", Value: seg.test_records });
        if (seg.regressors && seg.regressors.length > 0) {
          exportData.push({ Section: "Regressors", Value: seg.regressors.map(r => r.name).join(", ") });
        }
        exportData.push({});
      });

      // Add detailed results for each segment
      results.segments.forEach((segment) => {
        exportData.push({ Section: `RESULTS FOR ${segment.segment}` });
        
        // Add metrics
        if (segment.metrics) {
          exportData.push({ Section: "Performance Metrics" });
          Object.entries(segment.metrics).forEach(([key, value]) => {
            exportData.push({ Section: key.toUpperCase(), Value: value });
          });
          exportData.push({});
        }

        // Add AI commentary
        if (segment.ai_commentary) {
          exportData.push({ Section: "AI Analysis", Value: segment.ai_commentary });
          exportData.push({});
        }

        // Add all data points (training, test, forecast)
        exportData.push({ Section: "COMPLETE TIME SERIES DATA" });
        exportData.push({
          Date: "Date",
          Actual: "Actual",
          Predicted: "Predicted",
          Lower_Bound: "Lower Bound",
          Upper_Bound: "Upper Bound",
          Data_Type: "Data Type"
        });

        // Training data
        segment.training_data.forEach((point) => {
          exportData.push({
            Date: point.date,
            Actual: point.actual,
            Predicted: point.predicted,
            Lower_Bound: point.lower_bound,
            Upper_Bound: point.upper_bound,
            Data_Type: "Training"
          });
        });

        // Test data
        segment.test_data.forEach((point) => {
          exportData.push({
            Date: point.date,
            Actual: point.actual,
            Predicted: point.predicted,
            Lower_Bound: point.lower_bound,
            Upper_Bound: point.upper_bound,
            Data_Type: "Test"
          });
        });

        // Forecast data
        segment.forecast_data.forEach((point) => {
          exportData.push({
            Date: point.date,
            Actual: point.actual || "",
            Predicted: point.predicted,
            Lower_Bound: point.lower_bound,
            Upper_Bound: point.upper_bound,
            Data_Type: "Forecast"
          });
        });

        exportData.push({});
        exportData.push({});
      });

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `detailed_forecast_report_${modelName || 'model'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save to database
      await saveReportToDatabase({
        config,
        results,
        timestamp,
        exportType: "detailed_csv"
      }, `Detailed Report - ${modelName || 'Unnamed'} - ${timestamp}`, "detailed_csv");

      toast.success("Detailed report exported with configuration");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  const exportSummaryCSV = async () => {
    try {
      const exportData: any[] = [];
      const timestamp = new Date().toISOString();

      // Add header
      exportData.push({
        Model: modelName || "Unsaved Model",
        Generated: timestamp,
        Model_Type: config.model,
        Segment: "Segment",
        MAE: "MAE",
        RMSE: "RMSE",
        MAPE: "MAPE",
        R2: "R²",
      });

      // Add segment metrics
      results.segments.forEach((segment) => {
        if (segment.metrics) {
          exportData.push({
            Model: modelName || "Unsaved Model",
            Generated: timestamp,
            Model_Type: config.model,
            Segment: segment.segment,
            MAE: segment.metrics.mae?.toFixed(4) || "N/A",
            RMSE: segment.metrics.rmse?.toFixed(4) || "N/A",
            MAPE: segment.metrics.mape?.toFixed(2) || "N/A",
            R2: segment.metrics.r2?.toFixed(4) || "N/A",
          });
        }
      });

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `summary_report_${modelName || 'model'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save to database
      await saveReportToDatabase({
        config,
        results,
        timestamp,
        exportType: "summary_csv"
      }, `Summary Report - ${modelName || 'Unnamed'} - ${timestamp}`, "summary_csv");

      toast.success("Summary report exported");
    } catch (error) {
      console.error("Error exporting summary:", error);
      toast.error("Failed to export summary");
    }
  };

  const exportPDF = async () => {
    try {
      const timestamp = new Date().toISOString();
      
      // Create HTML content for PDF
      const htmlContent = generateReportHTML(false);
      
      // Create a temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '800px';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      // Generate canvas from HTML
      const canvas = await html2canvas(container, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      // Remove temporary container
      document.body.removeChild(container);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`forecast_report_${modelName || 'model'}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Save to database
      await saveReportToDatabase({
        config,
        results,
        timestamp,
        exportType: "pdf"
      }, `PDF Report - ${modelName || 'Unnamed'} - ${timestamp}`, "pdf");
      
      toast.success("PDF report exported");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  const exportHTML = async () => {
    try {
      const timestamp = new Date().toISOString();
      const htmlContent = generateReportHTML(true);
      
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `forecast_report_${modelName || 'model'}_${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Save to database
      await saveReportToDatabase({
        config,
        results,
        timestamp,
        exportType: "html"
      }, `HTML Report - ${modelName || 'Unnamed'} - ${timestamp}`, "html");
      
      toast.success("HTML report exported");
    } catch (error) {
      console.error("Error exporting HTML:", error);
      toast.error("Failed to export HTML");
    }
  };

  const generateReportHTML = (standalone: boolean) => {
    const timestamp = new Date().toISOString();
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #1e293b; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #334155; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 10px; }
        h3 { color: #475569; margin-top: 20px; }
        .section { background: #f8fafc; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-weight: bold; color: #64748b; }
        .metric-value { color: #1e293b; font-size: 1.1em; }
        .config-item { margin: 8px 0; padding: 8px; background: white; border-radius: 4px; }
        .commentary { background: #eff6ff; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-weight: bold; }
      </style>
    `;
    
    let html = standalone ? `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Forecast Report - ${modelName || 'Model'}</title>${styles}</head><body>` : `<div style="padding: 20px;">`;
    
    // Header
    html += `<h1>Forecast Report: ${modelName || 'Unnamed Model'}</h1>`;
    html += `<p><strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}</p>`;
    html += `<p><strong>Model Type:</strong> ${config.model}</p>`;
    
    // Configuration Section
    html += `<h2>Configuration Summary</h2><div class="section">`;
    html += `<div class="config-item"><strong>Date Column:</strong> ${config.date_column}</div>`;
    html += `<div class="config-item"><strong>Segment Column:</strong> ${config.segment_column}</div>`;
    html += `<div class="config-item"><strong>Dependent Variable:</strong> ${config.dependent_variable}</div>`;
    html += `<div class="config-item"><strong>Performance Metrics:</strong> ${config.performance_metrics.join(", ")}</div>`;
    html += `</div>`;
    
    // Model Parameters
    if (config.model === 'prophet' && config.prophet_params) {
      html += `<h3>Prophet Parameters</h3><div class="section">`;
      Object.entries(config.prophet_params).forEach(([key, value]) => {
        html += `<div class="config-item"><strong>${key}:</strong> ${JSON.stringify(value)}</div>`;
      });
      html += `</div>`;
    }
    
    // Segment Results
    results.segments.forEach((segment, idx) => {
      html += `<h2>Segment ${idx + 1}: ${segment.segment}</h2>`;
      
      // Metrics
      if (segment.metrics) {
        html += `<div class="section"><h3>Performance Metrics</h3>`;
        Object.entries(segment.metrics).forEach(([key, value]) => {
          if (value != null) {
            html += `<div class="metric"><span class="metric-label">${key.toUpperCase()}:</span> <span class="metric-value">${typeof value === 'number' ? value.toFixed(4) : value}</span></div>`;
          }
        });
        html += `</div>`;
      }
      
      // AI Commentary
      if (segment.ai_commentary) {
        html += `<div class="commentary"><h3>AI Analysis</h3><p>${segment.ai_commentary.replace(/\n/g, '<br>')}</p></div>`;
      }
      
      // Segment Configuration
      const segConfig = config.segments.find(s => s.segment === segment.segment);
      if (segConfig) {
        html += `<div class="section"><h3>Segment Configuration</h3>`;
        html += `<div class="config-item"><strong>Forecast Periods:</strong> ${segConfig.forecast_periods}</div>`;
        html += `<div class="config-item"><strong>Frequency:</strong> ${segConfig.frequency}</div>`;
        html += `<div class="config-item"><strong>Training Records:</strong> ${segConfig.training_records}</div>`;
        html += `<div class="config-item"><strong>Test Records:</strong> ${segConfig.test_records}</div>`;
        if (segConfig.regressors && segConfig.regressors.length > 0) {
          html += `<div class="config-item"><strong>Regressors:</strong> ${segConfig.regressors.map(r => r.name).join(", ")}</div>`;
        }
        html += `</div>`;
      }
    });
    
    html += standalone ? `</body></html>` : `</div>`;
    return html;
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button onClick={exportDetailedCSV} variant="outline" size="sm">
        <FileText className="h-4 w-4 mr-2" />
        Export Detailed CSV
      </Button>
      <Button onClick={exportSummaryCSV} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export Summary CSV
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileCode className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={exportPDF}>
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportHTML}>
            Export as HTML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}