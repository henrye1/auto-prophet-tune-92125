import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, ChevronDown } from "lucide-react";
import type { ForecastPoint } from "@/types/forecastResults";

interface ResultsTableProps {
  segment: string;
  trainingData: ForecastPoint[];
  testData: ForecastPoint[];
  forecastData: ForecastPoint[];
  primaryModel?: string;
  benchmarkModel?: string;
  benchmarkTrainingData?: ForecastPoint[];
  benchmarkTestData?: ForecastPoint[];
  benchmarkForecastData?: ForecastPoint[];
}

export const ResultsTable = ({ 
  segment, 
  trainingData, 
  testData, 
  forecastData,
  primaryModel,
  benchmarkModel,
  benchmarkTrainingData,
  benchmarkTestData,
  benchmarkForecastData
}: ResultsTableProps) => {
  const allData = [...trainingData, ...testData, ...forecastData];
  const hasBenchmark = benchmarkModel && benchmarkTestData && benchmarkForecastData;

  const exportToCSV = (includeTraining: boolean = true) => {
    const dataToExport = includeTraining 
      ? allData 
      : [...testData, ...forecastData];

    const headers = hasBenchmark
      ? ["Date", "Actual", `${primaryModel}_Predicted`, `${primaryModel}_Lower`, `${primaryModel}_Upper`, `${benchmarkModel}_Predicted`, `${benchmarkModel}_Lower`, `${benchmarkModel}_Upper`, "Type"]
      : ["Date", "Actual", "Predicted", "Lower Bound", "Upper Bound", "Type"];
    
    const rows = dataToExport.map((point) => {
      const benchmarkPoint = hasBenchmark ? (
        point.is_test 
          ? benchmarkTestData[testData.findIndex(t => t.date === point.date)]
          : point.is_forecast
          ? benchmarkForecastData[forecastData.findIndex(f => f.date === point.date)]
          : null
      ) : null;

      const baseRow = [
        point.date,
        point.actual !== undefined ? point.actual.toFixed(4) : "",
        point.predicted.toFixed(4),
        point.lower_bound.toFixed(4),
        point.upper_bound.toFixed(4),
      ];

      if (hasBenchmark && benchmarkPoint) {
        baseRow.push(
          benchmarkPoint.predicted.toFixed(4),
          benchmarkPoint.lower_bound.toFixed(4),
          benchmarkPoint.upper_bound.toFixed(4)
        );
      } else if (hasBenchmark) {
        baseRow.push("", "", "");
      }

      baseRow.push(point.is_test ? "Test" : point.is_forecast ? "Forecast" : "Training");
      return baseRow;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const suffix = includeTraining ? "all" : "test_forecast";
    link.download = `forecast_results_${segment}_${suffix}_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detailed Results Table</CardTitle>
            <CardDescription>
              Complete forecast data for {segment}
              {hasBenchmark && ` (includes ${benchmarkModel} benchmark)`}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV(true)}>
                Export All Data ({allData.length} rows)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(false)}>
                Export Test & Forecast Only ({testData.length + forecastData.length} rows)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Predicted</TableHead>
                <TableHead className="text-right">Lower Bound</TableHead>
                <TableHead className="text-right">Upper Bound</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allData.slice(-50).map((point, idx) => (
                <TableRow key={idx} className={
                  point.is_forecast ? "bg-chart-4/10" : 
                  point.is_test ? "bg-chart-3/10" : 
                  ""
                }>
                  <TableCell className="font-mono text-xs">
                    {new Date(point.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {point.actual !== undefined ? point.actual.toFixed(4) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {point.predicted.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {point.lower_bound.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {point.upper_bound.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {point.is_test ? "Test" : point.is_forecast ? "Forecast" : "Training"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {allData.length > 50 && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing last 50 rows of {allData.length} total rows
          </p>
        )}
      </CardContent>
    </Card>
  );
};
