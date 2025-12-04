#!/bin/bash

# Prophet-Tune Project Generator - Part 3
# Forecast Components

set -e

echo "Creating forecast components..."

cat > src/components/forecast/DataUpload.tsx << 'ENDOFFILE'
import React, { useCallback, useState } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, X, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataUploadProps {
  onDataLoaded: (data: Record<string, unknown>[], columns: string[]) => void;
  isLoaded: boolean;
  fileName?: string;
  onClear?: () => void;
}

const DataUpload: React.FC<DataUploadProps> = ({
  onDataLoaded,
  isLoaded,
  fileName,
  onClear,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setIsLoading(true);
      setError(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsLoading(false);
          if (results.errors.length > 0) {
            setError(`Parse error: ${results.errors[0].message}`);
            return;
          }
          const data = results.data as Record<string, unknown>[];
          const columns = results.meta.fields || [];
          if (data.length === 0) {
            setError("The file appears to be empty");
            return;
          }
          onDataLoaded(data, columns);
        },
        error: (err) => {
          setIsLoading(false);
          setError(`Failed to parse file: ${err.message}`);
        },
      });
    },
    [onDataLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        processFile(file);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  if (isLoaded && fileName) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Data Loaded
          </CardTitle>
          <CardDescription>Your CSV file has been successfully loaded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">Ready for configuration</p>
              </div>
            </div>
            {onClear && (
              <Button variant="outline" size="sm" onClick={onClear}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Your Data</CardTitle>
        <CardDescription>
          Upload a CSV file containing your time series data. The file should include a date column
          and at least one numeric column for forecasting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
            isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            isLoading && "opacity-50 pointer-events-none"
          )}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
            disabled={isLoading}
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isLoading ? "Processing..." : "Drop your CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
            <Button variant="outline" disabled={isLoading} asChild>
              <span>Select File</span>
            </Button>
          </label>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataUpload;
ENDOFFILE

cat > src/components/forecast/ModelSelector.tsx << 'ENDOFFILE'
import React from "react";
import { TrendingUp, Zap, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ForecastModel } from "@/types/forecast";

interface ModelSelectorProps {
  selectedModel: ForecastModel;
  onModelChange: (model: ForecastModel) => void;
}

interface ModelOption {
  value: ForecastModel;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  status: "available" | "coming_soon";
}

const modelOptions: ModelOption[] = [
  {
    value: "prophet",
    name: "Prophet",
    description: "Facebook's robust forecasting model with automatic seasonality detection",
    icon: <TrendingUp className="h-6 w-6" />,
    features: ["Automatic seasonality", "Holiday effects", "Trend changepoints", "Uncertainty intervals"],
    status: "available",
  },
  {
    value: "autogluon",
    name: "AutoGluon",
    description: "AutoML framework that automatically trains and ensembles multiple models",
    icon: <Zap className="h-6 w-6" />,
    features: ["Automatic model selection", "Ensemble methods", "Feature engineering", "Multi-model comparison"],
    status: "available",
  },
  {
    value: "arima",
    name: "ARIMA",
    description: "Classic statistical model for time series analysis",
    icon: <BarChart3 className="h-6 w-6" />,
    features: ["Auto-regressive", "Integrated", "Moving average", "Seasonal variants"],
    status: "coming_soon",
  },
];

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Forecasting Model</CardTitle>
        <CardDescription>
          Choose the forecasting algorithm that best fits your data characteristics and requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedModel}
          onValueChange={(value) => onModelChange(value as ForecastModel)}
          className="grid gap-4"
        >
          {modelOptions.map((model) => (
            <div key={model.value} className="relative">
              <RadioGroupItem
                value={model.value}
                id={model.value}
                className="peer sr-only"
                disabled={model.status === "coming_soon"}
              />
              <Label
                htmlFor={model.value}
                className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all
                  peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                  hover:bg-muted/50
                  ${model.status === "coming_soon" ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {model.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{model.name}</span>
                    {model.status === "coming_soon" && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{model.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {model.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs font-normal">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default ModelSelector;
ENDOFFILE

cat > src/components/forecast/VariableConfig.tsx << 'ENDOFFILE'
import React, { useMemo } from "react";
import { Calendar, Layers, Target, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VariableConfigProps {
  columns: string[];
  dateColumn: string;
  segmentColumn: string;
  dependentVariable: string;
  onDateColumnChange: (column: string) => void;
  onSegmentColumnChange: (column: string) => void;
  onDependentVariableChange: (column: string) => void;
  data: Record<string, unknown>[];
}

const VariableConfig: React.FC<VariableConfigProps> = ({
  columns,
  dateColumn,
  segmentColumn,
  dependentVariable,
  onDateColumnChange,
  onSegmentColumnChange,
  onDependentVariableChange,
  data,
}) => {
  const likelyDateColumns = useMemo(() => {
    return columns.filter((col) => {
      const colLower = col.toLowerCase();
      return (
        colLower.includes("date") ||
        colLower.includes("time") ||
        colLower.includes("day") ||
        colLower.includes("month") ||
        colLower.includes("year")
      );
    });
  }, [columns]);

  const numericColumns = useMemo(() => {
    if (data.length === 0) return columns;
    return columns.filter((col) => {
      const sampleValue = data[0][col];
      return typeof sampleValue === "number" || !isNaN(Number(sampleValue));
    });
  }, [columns, data]);

  const availableSegmentColumns = useMemo(() => {
    return columns.filter(
      (col) => col !== dateColumn && col !== dependentVariable
    );
  }, [columns, dateColumn, dependentVariable]);

  const isValid = dateColumn && dependentVariable;
  const hasWarning = !segmentColumn && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Variables</CardTitle>
        <CardDescription>
          Select the columns that represent your date, segments, and the variable you want to forecast
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="date-column" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Date Column <span className="text-destructive">*</span>
          </Label>
          <Select value={dateColumn} onValueChange={onDateColumnChange}>
            <SelectTrigger id="date-column">
              <SelectValue placeholder="Select date column" />
            </SelectTrigger>
            <SelectContent>
              {likelyDateColumns.length > 0 && (
                <>
                  <SelectItem value="__header__" disabled className="text-xs text-muted-foreground">
                    Suggested
                  </SelectItem>
                  {likelyDateColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                  <SelectItem value="__divider__" disabled className="text-xs text-muted-foreground">
                    All Columns
                  </SelectItem>
                </>
              )}
              {columns
                .filter((col) => !likelyDateColumns.includes(col))
                .map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The column containing timestamps or dates for your time series
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="segment-column" className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Segment Column <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Select value={segmentColumn || "__none__"} onValueChange={(val) => onSegmentColumnChange(val === "__none__" ? "" : val)}>
            <SelectTrigger id="segment-column">
              <SelectValue placeholder="Select segment column (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No segmentation</SelectItem>
              {availableSegmentColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Use this to forecast multiple series separately (e.g., by product, region, or category)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dependent-var" className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Target Variable <span className="text-destructive">*</span>
          </Label>
          <Select value={dependentVariable} onValueChange={onDependentVariableChange}>
            <SelectTrigger id="dependent-var">
              <SelectValue placeholder="Select variable to forecast" />
            </SelectTrigger>
            <SelectContent>
              {numericColumns
                .filter((col) => col !== dateColumn && col !== segmentColumn)
                .map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The numeric column you want to forecast
          </p>
        </div>

        {!isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select both a date column and a target variable to continue
            </AlertDescription>
          </Alert>
        )}

        {hasWarning && isValid && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No segment column selected. All data will be treated as a single time series.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default VariableConfig;
ENDOFFILE

cat > src/components/forecast/SegmentMapper.tsx << 'ENDOFFILE'
import React, { useMemo } from "react";
import { Settings2, Calendar, Hash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SegmentConfig, DataFrequency } from "@/types/forecast";
import { frequencyNames } from "@/types/forecast";

interface SegmentMapperProps {
  data: Record<string, unknown>[];
  dateColumn: string;
  segmentColumn: string;
  segments: SegmentConfig[];
  onSegmentsChange: (segments: SegmentConfig[]) => void;
}

const SegmentMapper: React.FC<SegmentMapperProps> = ({
  data,
  dateColumn: _dateColumn,
  segmentColumn,
  segments,
  onSegmentsChange,
}) => {
  void _dateColumn;
  const uniqueSegments = useMemo(() => {
    if (!segmentColumn) return ["All Data"];
    const segmentSet = new Set<string>();
    data.forEach((row) => {
      const value = row[segmentColumn];
      if (value !== null && value !== undefined) {
        segmentSet.add(String(value));
      }
    });
    return Array.from(segmentSet).sort();
  }, [data, segmentColumn]);

  const segmentRecordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!segmentColumn) {
      counts["All Data"] = data.length;
      return counts;
    }
    data.forEach((row) => {
      const segment = String(row[segmentColumn] || "Unknown");
      counts[segment] = (counts[segment] || 0) + 1;
    });
    return counts;
  }, [data, segmentColumn]);

  React.useEffect(() => {
    if (segments.length === 0 && uniqueSegments.length > 0) {
      const initialSegments: SegmentConfig[] = uniqueSegments.map((segmentName) => {
        const totalRecords = segmentRecordCounts[segmentName] || 0;
        const testRecords = Math.max(1, Math.floor(totalRecords * 0.2));
        const trainRecords = totalRecords - testRecords;
        return {
          segmentName,
          trainRecords,
          testRecords,
          forecastPeriods: 12,
          frequency: "MS" as DataFrequency,
          regressors: [],
        };
      });
      onSegmentsChange(initialSegments);
    }
  }, [uniqueSegments, segmentRecordCounts, segments.length, onSegmentsChange]);

  const updateSegment = (index: number, updates: Partial<SegmentConfig>) => {
    const newSegments = [...segments];
    newSegments[index] = { ...newSegments[index], ...updates };
    onSegmentsChange(newSegments);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Segment Configuration
        </CardTitle>
        <CardDescription>
          Configure training/test split and forecast horizon for each segment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead className="text-center">Total Records</TableHead>
                <TableHead className="text-center">Train Records</TableHead>
                <TableHead className="text-center">Test Records</TableHead>
                <TableHead className="text-center">Forecast Periods</TableHead>
                <TableHead className="text-center">Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((segment, index) => (
                <TableRow key={segment.segmentName}>
                  <TableCell className="font-medium">{segment.segmentName}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-muted-foreground">
                      {segmentRecordCounts[segment.segmentName] || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={segmentRecordCounts[segment.segmentName] - 1}
                      value={segment.trainRecords}
                      onChange={(e) =>
                        updateSegment(index, { trainRecords: parseInt(e.target.value) || 0 })
                      }
                      className="w-24 mx-auto text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={segmentRecordCounts[segment.segmentName] - segment.trainRecords}
                      value={segment.testRecords}
                      onChange={(e) =>
                        updateSegment(index, { testRecords: parseInt(e.target.value) || 0 })
                      }
                      className="w-24 mx-auto text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={segment.forecastPeriods}
                      onChange={(e) =>
                        updateSegment(index, { forecastPeriods: parseInt(e.target.value) || 1 })
                      }
                      className="w-24 mx-auto text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={segment.frequency}
                      onValueChange={(value) =>
                        updateSegment(index, { frequency: value as DataFrequency })
                      }
                    >
                      <SelectTrigger className="w-28 mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(frequencyNames).map(([value, name]) => (
                          <SelectItem key={value} value={value}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Train: Data used to fit the model</span>
          </div>
          <div className="flex items-center gap-1">
            <Hash className="h-4 w-4" />
            <span>Test: Data used to evaluate accuracy</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentMapper;
ENDOFFILE

echo "Creating more forecast components..."
echo "Run: bash create-project-part4.sh"
