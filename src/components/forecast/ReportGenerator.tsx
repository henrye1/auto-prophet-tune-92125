import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { ForecastResults } from "@/types/forecastResults";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportGeneratorProps {
  results: ForecastResults;
  modelId?: string;
}

export const ReportGenerator = ({ results, modelId }: ReportGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportType, setReportType] = useState<"pdf" | "html">("pdf");
  const [generating, setGenerating] = useState(false);

  const generateHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forecast Report - ${reportName || 'Unnamed Report'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .report-header h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
        }
        .report-meta {
            font-size: 14px;
            opacity: 0.9;
        }
        .segment-section {
            background: white;
            padding: 25px;
            margin-bottom: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .segment-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-top: 5px;
        }
        .ai-commentary {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .ai-commentary h4 {
            margin: 0 0 10px 0;
            color: #667eea;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        .data-table th {
            background: #667eea;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: 600;
        }
        .data-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e0e0e0;
        }
        .data-table tr:hover {
            background: #f8f9fa;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body { background: white; }
            .segment-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="report-header">
        <h1>${reportName || 'Forecast Report'}</h1>
        <div class="report-meta">
            <p>Model: ${results.model} | Generated: ${new Date().toLocaleString()} | Segments: ${results.segments.length}</p>
        </div>
    </div>

    ${results.segments.map(segment => `
        <div class="segment-section">
            <div class="segment-title">${segment.segment}: ${segment.segmentValue}</div>
            
            ${segment.ai_commentary ? `
                <div class="ai-commentary">
                    <h4>📊 AI Analysis</h4>
                    <p>${segment.ai_commentary}</p>
                </div>
            ` : ''}

            <h3>Performance Metrics</h3>
            <div class="metrics-grid">
                ${segment.metrics?.mae ? `
                    <div class="metric-card">
                        <div class="metric-label">MAE</div>
                        <div class="metric-value">${segment.metrics.mae.toFixed(4)}</div>
                    </div>
                ` : ''}
                ${segment.metrics?.rmse ? `
                    <div class="metric-card">
                        <div class="metric-label">RMSE</div>
                        <div class="metric-value">${segment.metrics.rmse.toFixed(4)}</div>
                    </div>
                ` : ''}
                ${segment.metrics?.mape ? `
                    <div class="metric-card">
                        <div class="metric-label">MAPE</div>
                        <div class="metric-value">${segment.metrics.mape.toFixed(2)}%</div>
                    </div>
                ` : ''}
                ${segment.metrics?.r2 ? `
                    <div class="metric-card">
                        <div class="metric-label">R²</div>
                        <div class="metric-value">${segment.metrics.r2.toFixed(4)}</div>
                    </div>
                ` : ''}
            </div>

            ${segment.benchmark_metrics ? `
                <h3>Benchmark Model Comparison</h3>
                <div class="metrics-grid">
                    ${segment.benchmark_metrics.mae ? `
                        <div class="metric-card">
                            <div class="metric-label">Benchmark MAE</div>
                            <div class="metric-value">${segment.benchmark_metrics.mae.toFixed(4)}</div>
                        </div>
                    ` : ''}
                    ${segment.benchmark_metrics.rmse ? `
                        <div class="metric-card">
                            <div class="metric-label">Benchmark RMSE</div>
                            <div class="metric-value">${segment.benchmark_metrics.rmse.toFixed(4)}</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <h3>Forecast Data (Last 20 Points)</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Actual</th>
                        <th>Predicted</th>
                        <th>Lower Bound</th>
                        <th>Upper Bound</th>
                    </tr>
                </thead>
                <tbody>
                    ${segment.forecast_data.slice(-20).map(point => `
                        <tr>
                            <td>${point.date}</td>
                            <td>${point.actual ? point.actual.toFixed(2) : '-'}</td>
                            <td>${point.predicted.toFixed(2)}</td>
                            <td>${point.lower_bound.toFixed(2)}</td>
                            <td>${point.upper_bound.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `).join('')}

    <div class="footer">
        <p>Report generated on ${new Date().toLocaleString()}</p>
        <p>Forecast Analysis Report</p>
    </div>
</body>
</html>
    `;
    return htmlContent;
  };

  const generatePDF = async () => {
    const element = document.getElementById("forecast-results-container");
    if (!element) {
      toast.error("Results container not found");
      return null;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf;
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!reportName.trim()) {
      toast.error("Please enter a report name");
      return;
    }

    setGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save reports");
        setGenerating(false);
        return;
      }

      if (reportType === "html") {
        const htmlContent = generateHTML();
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportName.replace(/\s+/g, "_")}_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Save to database
        const { error } = await supabase.from("forecast_reports").insert({
          user_id: user.id,
          model_id: modelId || null,
          report_name: reportName,
          report_type: "html",
          report_data: results,
        });

        if (error) throw error;
        toast.success("HTML report generated and saved!");
      } else {
        const pdf = await generatePDF();
        if (!pdf) {
          setGenerating(false);
          return;
        }

        pdf.save(`${reportName.replace(/\s+/g, "_")}_${Date.now()}.pdf`);

        // Save to database
        const { error } = await supabase.from("forecast_reports").insert({
          user_id: user.id,
          model_id: modelId || null,
          report_name: reportName,
          report_type: "pdf",
          report_data: results,
        });

        if (error) throw error;
        toast.success("PDF report generated and saved!");
      }

      setOpen(false);
      setReportName("");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report to database");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Forecast Report</DialogTitle>
          <DialogDescription>
            Create a downloadable report of all forecast results. The report will be saved for future reference.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name</Label>
            <Input
              id="report-name"
              placeholder="e.g., Q4 2025 Forecast Analysis"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Report Format</Label>
            <RadioGroup value={reportType} onValueChange={(value) => setReportType(value as "pdf" | "html")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">
                  PDF (Recommended for printing)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="font-normal cursor-pointer">
                  HTML (Interactive, viewable in browser)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Generate & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
