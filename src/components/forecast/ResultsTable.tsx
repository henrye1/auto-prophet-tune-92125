import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
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
  benchmarkForecastData,
}: ResultsTableProps) => {
  const allData = [...trainingData, ...testData, ...forecastData];
  const hasBenchmark = benchmarkModel && benchmarkTestData && benchmarkForecastData;

  const exportToCSV = () => {
    const headers = hasBenchmark
      ? ["Date", "Actual", `${primaryModel}_Predicted`, `${primaryModel}_Lower`, `${primaryModel}_Upper`, `${benchmarkModel}_Predicted`, `${benchmarkModel}_Lower`, `${benchmarkModel}_Upper`, "Type"]
      : ["Date", "Actual", "Predicted", "Lower Bound", "Upper Bound", "Type"];
    
    const rows = allData.map((point) => {
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
    link.download = `forecast_results_${segment}_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = (data: ForecastPoint[], isRaw: boolean = false) => (
    <div className="rounded-md border max-h-[400px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Predicted</TableHead>
            <TableHead className="text-right">Lower Bound</TableHead>
            <TableHead className="text-right">Upper Bound</TableHead>
            {!isRaw && hasBenchmark && (
              <>
                <TableHead className="text-right">{benchmarkModel} Predicted</TableHead>
                <TableHead className="text-right">{benchmarkModel} Lower</TableHead>
                <TableHead className="text-right">{benchmarkModel} Upper</TableHead>
              </>
            )}
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((point, idx) => {
            const benchmarkPoint = !isRaw && hasBenchmark ? (
              point.is_test 
                ? benchmarkTestData[testData.findIndex(t => t.date === point.date)]
                : point.is_forecast
                ? benchmarkForecastData[forecastData.findIndex(f => f.date === point.date)]
                : null
            ) : null;

            return (
              <TableRow key={idx}>
                <TableCell>{new Date(point.date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {point.actual !== undefined ? point.actual.toFixed(4) : "-"}
                </TableCell>
                <TableCell className="text-right">{point.predicted.toFixed(4)}</TableCell>
                <TableCell className="text-right">{point.lower_bound.toFixed(4)}</TableCell>
                <TableCell className="text-right">{point.upper_bound.toFixed(4)}</TableCell>
                {!isRaw && hasBenchmark && benchmarkPoint && (
                  <>
                    <TableCell className="text-right">{benchmarkPoint.predicted.toFixed(4)}</TableCell>
                    <TableCell className="text-right">{benchmarkPoint.lower_bound.toFixed(4)}</TableCell>
                    <TableCell className="text-right">{benchmarkPoint.upper_bound.toFixed(4)}</TableCell>
                  </>
                )}
                {!isRaw && hasBenchmark && !benchmarkPoint && (
                  <>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </>
                )}
                <TableCell>
                  {point.is_test ? "Test" : point.is_forecast ? "Forecast" : "Training"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

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
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderTable(allData, false)}
      </CardContent>
    </Card>
  );
};
