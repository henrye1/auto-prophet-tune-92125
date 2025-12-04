import React, { useMemo } from "react";
import { Variable, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RegressorConfigProps {
  columns: string[];
  dateColumn: string;
  segmentColumn: string;
  dependentVariable: string;
  selectedRegressors: string[];
  onRegressorsChange: (regressors: string[]) => void;
  data: Record<string, unknown>[];
}

const RegressorConfig: React.FC<RegressorConfigProps> = ({
  columns,
  dateColumn,
  segmentColumn,
  dependentVariable,
  selectedRegressors,
  onRegressorsChange,
  data,
}) => {
  // Get available columns (exclude date, segment, and dependent variable)
  const availableRegressors = useMemo(() => {
    return columns.filter(
      (col) =>
        col !== dateColumn &&
        col !== segmentColumn &&
        col !== dependentVariable
    );
  }, [columns, dateColumn, segmentColumn, dependentVariable]);

  // Check if column is numeric
  const isNumericColumn = (col: string): boolean => {
    if (data.length === 0) return false;
    const sampleSize = Math.min(10, data.length);
    let numericCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][col];
      if (value !== null && value !== undefined && !isNaN(Number(value))) {
        numericCount++;
      }
    }
    return numericCount / sampleSize >= 0.8;
  };

  // Get column stats for display
  const getColumnStats = (col: string) => {
    if (data.length === 0) return { type: "unknown", uniqueValues: 0 };
    const isNumeric = isNumericColumn(col);
    const uniqueValues = new Set(data.map((row) => row[col])).size;
    return {
      type: isNumeric ? "numeric" : "categorical",
      uniqueValues,
    };
  };

  const handleToggle = (col: string) => {
    if (selectedRegressors.includes(col)) {
      onRegressorsChange(selectedRegressors.filter((r) => r !== col));
    } else {
      onRegressorsChange([...selectedRegressors, col]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRegressors.length === availableRegressors.length) {
      onRegressorsChange([]);
    } else {
      onRegressorsChange(availableRegressors);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Variable className="h-5 w-5" />
          External Regressors
        </CardTitle>
        <CardDescription>
          Select additional variables to include as predictors in your forecast model.
          These should be variables that may influence your target variable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableRegressors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No additional columns available. All columns are already assigned to date, segment, or target variable.
          </p>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={selectedRegressors.length === availableRegressors.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Select All ({availableRegressors.length} available)
              </Label>
            </div>

            {/* Available Regressors */}
            <div className="grid gap-3">
              {availableRegressors.map((col) => {
                const stats = getColumnStats(col);
                const isSelected = selectedRegressors.includes(col);

                return (
                  <div
                    key={col}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`regressor-${col}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(col)}
                      />
                      <Label
                        htmlFor={`regressor-${col}`}
                        className="cursor-pointer font-medium"
                      >
                        {col}
                      </Label>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          stats.type === "numeric"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {stats.type}
                      </span>
                      <span>{stats.uniqueValues} unique</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {stats.type === "numeric"
                              ? "Numeric columns are used directly as regressors"
                              : "Categorical columns will be encoded before use"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>
                <strong>Tip:</strong> Select variables that you believe have a causal relationship
                with your target variable. For Prophet models, regressors must have known future
                values for the forecast period.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RegressorConfig;
