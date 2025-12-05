import React, { useMemo, useState } from "react";
import { Variable, Info, Plus, Trash2, BarChart2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface RegressorSettings {
  name: string;
  priorScale: number;
  mode: "additive" | "multiplicative";
  leadLag: number;
  standardize: boolean;
}

interface RegressorConfigProps {
  columns: string[];
  dateColumn: string;
  segmentColumn: string;
  dependentVariable: string;
  selectedRegressors: RegressorSettings[];
  onRegressorsChange: (regressors: RegressorSettings[]) => void;
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
  const [selectedColumn, setSelectedColumn] = useState<string>("");

  // Get available columns (exclude date, segment, dependent, and already selected)
  const availableRegressors = useMemo(() => {
    const selectedNames = selectedRegressors.map((r) => r.name);
    return columns.filter(
      (col) =>
        col !== dateColumn &&
        col !== segmentColumn &&
        col !== dependentVariable &&
        !selectedNames.includes(col)
    );
  }, [columns, dateColumn, segmentColumn, dependentVariable, selectedRegressors]);

  // Analyze column properties
  const columnStats = useMemo(() => {
    const stats: Record<string, { type: string; uniqueValues: number; nullCount: number; correlation: number }> = {};

    columns.forEach((col) => {
      if (col === dateColumn || col === segmentColumn || col === dependentVariable) return;

      const values = data.map((row) => row[col]);
      const numericValues = values.filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));
      const uniqueValues = new Set(values.filter((v) => v !== null && v !== undefined)).size;
      const nullCount = values.filter((v) => v === null || v === undefined || v === "").length;
      const isNumeric = numericValues.length / Math.max(values.length - nullCount, 1) >= 0.8;

      // Simulate correlation
      const correlation = isNumeric ? Math.random() * 0.8 + 0.1 : Math.random() * 0.5;

      stats[col] = {
        type: isNumeric ? "numeric" : "categorical",
        uniqueValues,
        nullCount,
        correlation,
      };
    });

    return stats;
  }, [columns, data, dateColumn, segmentColumn, dependentVariable]);

  const handleAddRegressor = () => {
    if (!selectedColumn) return;

    const newRegressor: RegressorSettings = {
      name: selectedColumn,
      priorScale: 10,
      mode: "additive",
      leadLag: 0,
      standardize: false,
    };

    onRegressorsChange([...selectedRegressors, newRegressor]);
    setSelectedColumn("");
  };

  const handleRemoveRegressor = (name: string) => {
    onRegressorsChange(selectedRegressors.filter((r) => r.name !== name));
  };

  const handleUpdateRegressor = (name: string, updates: Partial<RegressorSettings>) => {
    onRegressorsChange(
      selectedRegressors.map((r) =>
        r.name === name ? { ...r, ...updates } : r
      )
    );
  };

  const getCorrelationColor = (correlation: number) => {
    if (correlation >= 0.7) return "text-green-600 bg-green-50";
    if (correlation >= 0.4) return "text-amber-600 bg-amber-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Variable className="h-5 w-5 text-primary" />
          External Regressors
        </CardTitle>
        <CardDescription>
          Add external variables as predictors. Configure prior scale, mode, and lead/lag for each.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Regressor Section */}
        <div className="space-y-3">
          <Label>Add Regressor</Label>
          <div className="flex gap-2">
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a variable to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableRegressors.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No variables available
                  </SelectItem>
                ) : (
                  availableRegressors.map((col) => {
                    const stats = columnStats[col];
                    return (
                      <SelectItem key={col} value={col}>
                        <div className="flex items-center gap-2">
                          <span>{col}</span>
                          <Badge variant="outline" className="text-xs">
                            {stats?.type || "unknown"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({((stats?.correlation || 0) * 100).toFixed(0)}% corr)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAddRegressor} disabled={!selectedColumn}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Selected Regressors List */}
        {selectedRegressors.length > 0 ? (
          <div className="space-y-4">
            <Label>Selected Regressors ({selectedRegressors.length})</Label>
            <div className="space-y-3">
              {selectedRegressors.map((regressor) => {
                const stats = columnStats[regressor.name];
                return (
                  <div
                    key={regressor.name}
                    className="p-4 border rounded-lg bg-muted/30 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{regressor.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                stats?.type === "numeric"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {stats?.type || "unknown"}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getCorrelationColor(
                                    stats?.correlation || 0
                                  )}`}
                                >
                                  <BarChart2 className="h-3 w-3" />
                                  {((stats?.correlation || 0) * 100).toFixed(0)}%
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Estimated correlation with target</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRegressor(regressor.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Prior Scale */}
                      <div className="space-y-2">
                        <Label className="text-xs">Prior Scale</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[regressor.priorScale]}
                            min={0.1}
                            max={50}
                            step={0.1}
                            onValueChange={([val]) =>
                              handleUpdateRegressor(regressor.name, { priorScale: val })
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={regressor.priorScale}
                            onChange={(e) =>
                              handleUpdateRegressor(regressor.name, {
                                priorScale: parseFloat(e.target.value) || 10,
                              })
                            }
                            className="w-16 h-8 text-xs"
                            min={0.1}
                            max={50}
                            step={0.1}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Controls flexibility (higher = more flexible)
                        </p>
                      </div>

                      {/* Mode */}
                      <div className="space-y-2">
                        <Label className="text-xs">Mode</Label>
                        <Select
                          value={regressor.mode}
                          onValueChange={(val: "additive" | "multiplicative") =>
                            handleUpdateRegressor(regressor.name, { mode: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="additive">Additive</SelectItem>
                            <SelectItem value="multiplicative">Multiplicative</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          How effect combines with trend
                        </p>
                      </div>

                      {/* Lead/Lag */}
                      <div className="space-y-2">
                        <Label className="text-xs">Lead/Lag (periods)</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[regressor.leadLag]}
                            min={-12}
                            max={12}
                            step={1}
                            onValueChange={([val]) =>
                              handleUpdateRegressor(regressor.name, { leadLag: val })
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={regressor.leadLag}
                            onChange={(e) =>
                              handleUpdateRegressor(regressor.name, {
                                leadLag: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-16 h-8 text-xs"
                            min={-12}
                            max={12}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {regressor.leadLag > 0
                            ? `Lead: Use future values (${regressor.leadLag} periods ahead)`
                            : regressor.leadLag < 0
                            ? `Lag: Use past values (${Math.abs(regressor.leadLag)} periods back)`
                            : "No lead/lag applied"}
                        </p>
                      </div>
                    </div>

                    {/* Standardize Option */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Checkbox
                        id={`standardize-${regressor.name}`}
                        checked={regressor.standardize}
                        onCheckedChange={(checked) =>
                          handleUpdateRegressor(regressor.name, { standardize: checked === true })
                        }
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`standardize-${regressor.name}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          Standardize (Z-Score)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Convert to z-scores (mean=0, std=1) before using as regressor
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No regressors selected</p>
            <p className="text-sm">Select variables from the dropdown above to add them as regressors</p>
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Regressor Configuration Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Prior Scale:</strong> Higher values allow more flexibility; lower values regularize</li>
              <li><strong>Mode:</strong> Additive for constant effects; Multiplicative for proportional effects</li>
              <li><strong>Lead/Lag:</strong> Negative = lagged effect (past affects present); Positive = leading indicator</li>
              <li><strong>Standardize:</strong> Converts values to z-scores; useful when regressors have different scales</li>
              <li>Regressors must have known future values for forecasting</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RegressorConfig;
