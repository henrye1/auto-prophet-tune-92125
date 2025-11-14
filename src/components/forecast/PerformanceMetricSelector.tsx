import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
import type { PerformanceMetric } from "@/types/forecast";

interface PerformanceMetricSelectorProps {
  selectedMetrics: PerformanceMetric[];
  onMetricsChange: (metrics: PerformanceMetric[]) => void;
}

const metricDefinitions: Record<PerformanceMetric, { label: string; description: string }> = {
  mae: { label: "MAE", description: "Mean Absolute Error - Average magnitude of errors" },
  rmse: { label: "RMSE", description: "Root Mean Squared Error - Square root of average squared errors" },
  mape: { label: "MAPE", description: "Mean Absolute Percentage Error - Average percentage deviation" },
  mse: { label: "MSE", description: "Mean Squared Error - Average of squared differences" },
  r2: { label: "R²", description: "Coefficient of Determination - Proportion of variance explained" },
  adj_r2: { label: "Adjusted R²", description: "Adjusted R² - R² adjusted for number of predictors" },
  coverage: { label: "Coverage", description: "Percentage of actuals within confidence intervals" },
  smape: { label: "SMAPE", description: "Symmetric Mean Absolute Percentage Error - Symmetric version of MAPE" },
  mase: { label: "MASE", description: "Mean Absolute Scaled Error - Scaled error relative to naive forecast" },
};

export const PerformanceMetricSelector = ({ selectedMetrics, onMetricsChange }: PerformanceMetricSelectorProps) => {
  const handleToggle = (metric: PerformanceMetric) => {
    if (selectedMetrics.includes(metric)) {
      onMetricsChange(selectedMetrics.filter(m => m !== metric));
    } else {
      onMetricsChange([...selectedMetrics, metric]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Performance Metrics
        </CardTitle>
        <CardDescription>Select metrics to evaluate forecast accuracy</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(metricDefinitions) as PerformanceMetric[]).map((metric) => (
            <div key={metric} className="flex items-start space-x-3 space-y-0">
              <Checkbox
                id={metric}
                checked={selectedMetrics.includes(metric)}
                onCheckedChange={() => handleToggle(metric)}
              />
              <div className="space-y-1 leading-none">
                <Label
                  htmlFor={metric}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {metricDefinitions[metric].label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {metricDefinitions[metric].description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
