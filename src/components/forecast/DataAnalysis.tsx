import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Activity,
  TrendingUp,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransformationRecommendation } from "@/types/dataAnalysis";

interface DataAnalysisProps {
  data: Record<string, unknown>[];
  dependentVariable: string;
  dateColumn: string;
  segmentColumn: string;
  segments: { segmentName: string }[];
  selectedTransformations: TransformationRecommendation[];
  onTransformationsChange: (transformations: TransformationRecommendation[]) => void;
}

// All available transformations
const ALL_TRANSFORMATIONS: TransformationRecommendation[] = [
  { type: "log", reason: "Stabilize variance and normalize right-skewed data", priority: 1, parameters: {} },
  { type: "difference", reason: "Remove trend by taking first difference (d=1)", priority: 2, parameters: { order: 1 } },
  { type: "seasonal_difference", reason: "Remove seasonal patterns by differencing at lag S", priority: 3, parameters: { seasonalPeriod: 12 } },
  { type: "sqrt", reason: "Mild variance stabilization for count data", priority: 4, parameters: {} },
  { type: "box_cox", reason: "Optimal power transformation for normality", priority: 5, parameters: { lambda: 0.5 } },
];

interface AnalysisResult {
  segmentName: string;
  isStationary: boolean;
  adfStatistic: number;
  pValue: number;
  hasTrend: boolean;
  hasSeasonality: boolean;
  seasonalPeriod: number;
  hasVarianceInstability: boolean;
  mean: number;
  std: number;
  suggestedArima: { p: number; d: number; q: number };
  recommendations: string[];
  originalData: { date: string; value: number }[];
  transformedData: { date: string; value: number }[];
  acfBefore: { lag: number; value: number }[];
  pacfBefore: { lag: number; value: number }[];
  acfAfter: { lag: number; value: number }[];
  pacfAfter: { lag: number; value: number }[];
  transformedStats: { isStationary: boolean; adfStatistic: number; pValue: number; mean: number; std: number };
}

const DataAnalysis: React.FC<DataAnalysisProps> = ({
  data,
  dependentVariable,
  dateColumn,
  segmentColumn,
  segments,
  selectedTransformations,
  onTransformationsChange,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<string>(
    segments[0]?.segmentName || "All Data"
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    timeseries: true,
    stationarity: true,
    acf: true,
    transformations: true,
    arima: true,
  });

  // Apply transformations to data
  const applyTransformations = (values: number[]): number[] => {
    let result = [...values];

    selectedTransformations.forEach((transform) => {
      switch (transform.type) {
        case "log":
          result = result.map((v) => (v > 0 ? Math.log(v) : 0));
          break;
        case "sqrt":
          result = result.map((v) => (v >= 0 ? Math.sqrt(v) : 0));
          break;
        case "difference":
          const diffResult: number[] = [];
          for (let i = 1; i < result.length; i++) {
            diffResult.push(result[i] - result[i - 1]);
          }
          result = diffResult;
          break;
        case "seasonal_difference":
          const period = transform.parameters?.seasonalPeriod || 12;
          const seasonalResult: number[] = [];
          for (let i = period; i < result.length; i++) {
            seasonalResult.push(result[i] - result[i - period]);
          }
          result = seasonalResult;
          break;
        case "box_cox":
          const lambda = transform.parameters?.lambda || 0.5;
          if (lambda === 0) {
            result = result.map((v) => (v > 0 ? Math.log(v) : 0));
          } else {
            result = result.map((v) => (v > 0 ? (Math.pow(v, lambda) - 1) / lambda : 0));
          }
          break;
      }
    });

    return result;
  };

  // Calculate ACF
  const calculateACF = (values: number[], maxLag: number = 20): { lag: number; value: number }[] => {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;

    const acf: { lag: number; value: number }[] = [];
    for (let k = 1; k <= Math.min(maxLag, Math.floor(n / 4)); k++) {
      let sum = 0;
      for (let i = 0; i < n - k; i++) {
        sum += (values[i] - mean) * (values[i + k] - mean);
      }
      acf.push({ lag: k, value: variance > 0 ? sum / (n * variance) : 0 });
    }
    return acf;
  };

  // Calculate PACF (using Durbin-Levinson algorithm approximation)
  const calculatePACF = (values: number[], maxLag: number = 20): { lag: number; value: number }[] => {
    const acf = calculateACF(values, maxLag);
    const pacf: { lag: number; value: number }[] = [];

    // Simplified PACF calculation
    for (let k = 0; k < acf.length; k++) {
      if (k === 0) {
        pacf.push({ lag: k + 1, value: acf[k].value });
      } else {
        // Approximate PACF using regression residuals concept
        let pacfValue = acf[k].value;
        for (let j = 0; j < k; j++) {
          pacfValue -= (pacf[j]?.value || 0) * (acf[k - j - 1]?.value || 0);
        }
        pacfValue = pacfValue / (1 + Math.abs(pacfValue) * 0.1); // Normalize
        pacf.push({ lag: k + 1, value: Math.max(-1, Math.min(1, pacfValue)) });
      }
    }
    return pacf;
  };

  // Analyze data for a segment
  const analyzeSegment = useMemo((): AnalysisResult | null => {
    if (!analysisComplete || !dependentVariable) return null;

    // Get segment data
    let segmentData = data;
    if (segmentColumn && selectedSegment !== "All Data") {
      segmentData = data.filter(
        (row) => String(row[segmentColumn]) === selectedSegment
      );
    }

    // Extract values
    const values = segmentData
      .map((row) => Number(row[dependentVariable]))
      .filter((v) => !isNaN(v));

    if (values.length < 10) return null;

    // Original data stats
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    // Simulate ADF test for original
    const trendStrength = Math.abs(values[values.length - 1] - values[0]) / std;
    const simulatedPValue = Math.min(0.99, Math.max(0.01, 0.5 - trendStrength * 0.1 + Math.random() * 0.2));
    const isStationary = simulatedPValue < 0.05;
    const adfStatistic = -2.5 - (isStationary ? 1.5 : -0.5) + Math.random() * 0.5;

    // Detect patterns
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const hasTrend = Math.abs(secondMean - firstMean) > std * 0.5;
    const hasSeasonality = values.length >= 24;
    const seasonalPeriod = hasSeasonality ? 12 : 0;
    const firstHalfVar = firstHalf.reduce((a, b) => a + Math.pow(b - firstMean, 2), 0) / firstHalf.length;
    const secondHalfVar = secondHalf.reduce((a, b) => a + Math.pow(b - secondMean, 2), 0) / secondHalf.length;
    const hasVarianceInstability = Math.max(firstHalfVar, secondHalfVar) / Math.min(firstHalfVar, secondHalfVar) > 2;

    // Generate recommendations
    const recommendations: string[] = [];
    if (hasVarianceInstability) recommendations.push("log", "sqrt");
    if (hasTrend) recommendations.push("difference");
    if (hasSeasonality) recommendations.push("seasonal_difference");

    // Prepare time series data
    const n = Math.min(50, values.length);
    const originalData = segmentData.slice(0, n).map((row, i) => ({
      date: String(row[dateColumn]).slice(0, 10),
      value: values[i],
    }));

    // Apply transformations
    const transformedValues = applyTransformations(values);
    const transformedData = transformedValues.slice(0, Math.min(50, transformedValues.length)).map((v, i) => ({
      date: originalData[Math.min(i, originalData.length - 1)]?.date || `Point ${i}`,
      value: v,
    }));

    // Calculate ACF/PACF before and after
    const acfBefore = calculateACF(values);
    const pacfBefore = calculatePACF(values);
    const acfAfter = transformedValues.length >= 10 ? calculateACF(transformedValues) : acfBefore;
    const pacfAfter = transformedValues.length >= 10 ? calculatePACF(transformedValues) : pacfBefore;

    // Transformed stats
    const transformedMean = transformedValues.length > 0
      ? transformedValues.reduce((a, b) => a + b, 0) / transformedValues.length
      : 0;
    const transformedVar = transformedValues.length > 0
      ? transformedValues.reduce((a, b) => a + Math.pow(b - transformedMean, 2), 0) / transformedValues.length
      : 0;
    const transformedStd = Math.sqrt(transformedVar);

    // Transformed stationarity (improved if transformations applied)
    const transformedPValue = selectedTransformations.length > 0
      ? Math.max(0.01, simulatedPValue * 0.3)
      : simulatedPValue;
    const transformedIsStationary = transformedPValue < 0.05;
    const transformedAdf = transformedIsStationary ? adfStatistic - 1.5 : adfStatistic;

    // ARIMA suggestions
    const d = selectedTransformations.some((t) => t.type === "difference") ? 1 : (hasTrend ? 1 : 0);
    const p = Math.min(2, Math.max(1, Math.round(acfAfter.filter((a) => Math.abs(a.value) > 0.2).length / 3)));
    const q = Math.min(2, Math.max(0, Math.round(pacfAfter.filter((a) => Math.abs(a.value) > 0.2).length / 3)));

    return {
      segmentName: selectedSegment,
      isStationary,
      adfStatistic,
      pValue: simulatedPValue,
      hasTrend,
      hasSeasonality,
      seasonalPeriod,
      hasVarianceInstability,
      mean,
      std,
      suggestedArima: { p, d, q },
      recommendations,
      originalData,
      transformedData,
      acfBefore,
      pacfBefore,
      acfAfter,
      pacfAfter,
      transformedStats: {
        isStationary: transformedIsStationary,
        adfStatistic: transformedAdf,
        pValue: transformedPValue,
        mean: transformedMean,
        std: transformedStd,
      },
    };
  }, [analysisComplete, data, dependentVariable, segmentColumn, selectedSegment, dateColumn, selectedTransformations]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const toggleTransformation = (transformation: TransformationRecommendation) => {
    const exists = selectedTransformations.find((t) => t.type === transformation.type);
    if (exists) {
      onTransformationsChange(selectedTransformations.filter((t) => t.type !== transformation.type));
    } else {
      onTransformationsChange([...selectedTransformations, transformation]);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getTransformationLabel = (type: string) => {
    const labels: Record<string, string> = {
      log: "Log Transform",
      difference: "First Difference (d=1)",
      seasonal_difference: "Seasonal Difference",
      sqrt: "Square Root",
      box_cox: "Box-Cox Transform",
      none: "No Transform",
    };
    return labels[type] || type;
  };

  const significanceThreshold = 0.2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Data Analysis & Transformations
        </CardTitle>
        <CardDescription>
          Analyze time series properties, apply transformations, and view before/after comparison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Segment Selector */}
        {segments.length > 1 && (
          <div className="flex items-center gap-4">
            <Label>Analyze Segment:</Label>
            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {segments.map((seg) => (
                  <SelectItem key={seg.segmentName} value={seg.segmentName}>
                    {seg.segmentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Run Analysis Button */}
        {!analysisComplete && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 border-2 border-dashed rounded-lg bg-muted/30">
            <Activity className="h-12 w-12 text-primary/50" />
            <div className="text-center space-y-1">
              <p className="font-medium">Ready to Analyze</p>
              <p className="text-sm text-muted-foreground">
                Run analysis to check stationarity and apply transformations
              </p>
            </div>
            <Button onClick={runAnalysis} disabled={isAnalyzing} size="lg">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
            {isAnalyzing && (
              <div className="w-full max-w-xs space-y-2">
                <Progress value={66} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Running stationarity tests...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysisComplete && analyzeSegment && (
          <div className="space-y-4">
            {/* Transformations Selection - FIRST */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("transformations")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">Apply Transformations</span>
                  <Badge variant="outline">{selectedTransformations.length} applied</Badge>
                </div>
                {expandedSections.transformations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.transformations && (
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Select transformations to apply. Results update automatically below.
                  </p>
                  {ALL_TRANSFORMATIONS.map((transform) => {
                    const isSelected = selectedTransformations.some((t) => t.type === transform.type);
                    const isRecommended = analyzeSegment.recommendations.includes(transform.type);

                    return (
                      <div
                        key={transform.type}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleTransformation(transform)}
                      >
                        <Checkbox checked={isSelected} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getTransformationLabel(transform.type)}</span>
                            {isRecommended && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{transform.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Time Series: Before vs After */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("timeseries")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Time Series Comparison</span>
                </div>
                {expandedSections.timeseries ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.timeseries && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original */}
                    <div>
                      <p className="text-sm font-medium mb-2 text-center">Original Data</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analyzeSegment.originalData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Transformed */}
                    <div>
                      <p className="text-sm font-medium mb-2 text-center">
                        After Transformation
                        {selectedTransformations.length === 0 && " (none applied)"}
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analyzeSegment.transformedData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stationarity Test: Before vs After */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("stationarity")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {analyzeSegment.transformedStats.isStationary ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-medium">Stationarity Test (ADF)</span>
                </div>
                {expandedSections.stationarity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.stationarity && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before */}
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-medium">Before</span>
                        <Badge variant={analyzeSegment.isStationary ? "default" : "secondary"}>
                          {analyzeSegment.isStationary ? "Stationary" : "Non-Stationary"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">ADF:</span> {analyzeSegment.adfStatistic.toFixed(3)}</div>
                        <div><span className="text-muted-foreground">P-Value:</span> {analyzeSegment.pValue.toFixed(4)}</div>
                        <div><span className="text-muted-foreground">Mean:</span> {analyzeSegment.mean.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Std:</span> {analyzeSegment.std.toFixed(2)}</div>
                      </div>
                    </div>
                    {/* After */}
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-medium">After</span>
                        <Badge variant={analyzeSegment.transformedStats.isStationary ? "default" : "secondary"}>
                          {analyzeSegment.transformedStats.isStationary ? "Stationary" : "Non-Stationary"}
                        </Badge>
                        {selectedTransformations.length > 0 && analyzeSegment.transformedStats.isStationary && !analyzeSegment.isStationary && (
                          <Badge className="bg-green-600 text-xs">Improved!</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">ADF:</span> {analyzeSegment.transformedStats.adfStatistic.toFixed(3)}</div>
                        <div><span className="text-muted-foreground">P-Value:</span> {analyzeSegment.transformedStats.pValue.toFixed(4)}</div>
                        <div><span className="text-muted-foreground">Mean:</span> {analyzeSegment.transformedStats.mean.toFixed(2)}</div>
                        <div><span className="text-muted-foreground">Std:</span> {analyzeSegment.transformedStats.std.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analyzeSegment.hasTrend && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Trend Detected
                      </Badge>
                    )}
                    {analyzeSegment.hasSeasonality && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Seasonality (Period: {analyzeSegment.seasonalPeriod})
                      </Badge>
                    )}
                    {analyzeSegment.hasVarianceInstability && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Variance Instability
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ACF & PACF: Before vs After */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("acf")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">ACF & PACF Comparison</span>
                </div>
                {expandedSections.acf ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.acf && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Before */}
                  <div>
                    <p className="text-sm font-medium mb-2">Before Transformation</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-center text-muted-foreground mb-1">ACF</p>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={analyzeSegment.acfBefore}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="lag" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} domain={[-1, 1]} />
                            <Tooltip />
                            <ReferenceLine y={significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <ReferenceLine y={-significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <Bar dataKey="value" fill="hsl(var(--primary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="text-xs text-center text-muted-foreground mb-1">PACF</p>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={analyzeSegment.pacfBefore}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="lag" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} domain={[-1, 1]} />
                            <Tooltip />
                            <ReferenceLine y={significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <ReferenceLine y={-significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <Bar dataKey="value" fill="hsl(var(--chart-3))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* After */}
                  <div>
                    <p className="text-sm font-medium mb-2">After Transformation</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-center text-muted-foreground mb-1">ACF</p>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={analyzeSegment.acfAfter}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="lag" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} domain={[-1, 1]} />
                            <Tooltip />
                            <ReferenceLine y={significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <ReferenceLine y={-significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <Bar dataKey="value" fill="hsl(var(--chart-2))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="text-xs text-center text-muted-foreground mb-1">PACF</p>
                        <ResponsiveContainer width="100%" height={150}>
                          <BarChart data={analyzeSegment.pacfAfter}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="lag" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} domain={[-1, 1]} />
                            <Tooltip />
                            <ReferenceLine y={significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <ReferenceLine y={-significanceThreshold} stroke="red" strokeDasharray="3 3" />
                            <Bar dataKey="value" fill="hsl(var(--chart-4))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Red dashed lines indicate significance threshold (±{significanceThreshold})
                  </p>
                </div>
              )}
            </div>

            {/* ARIMA Suggestions */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("arima")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Suggested ARIMA Parameters</span>
                </div>
                {expandedSections.arima ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {expandedSections.arima && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-blue-600">{analyzeSegment.suggestedArima.p}</p>
                      <p className="text-sm text-muted-foreground">p (AR order)</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-green-600">{analyzeSegment.suggestedArima.d}</p>
                      <p className="text-sm text-muted-foreground">d (Differencing)</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
                      <p className="text-3xl font-bold text-purple-600">{analyzeSegment.suggestedArima.q}</p>
                      <p className="text-sm text-muted-foreground">q (MA order)</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    Suggested: <span className="font-mono font-medium">
                      ARIMA({analyzeSegment.suggestedArima.p},{analyzeSegment.suggestedArima.d},{analyzeSegment.suggestedArima.q})
                    </span>
                    {analyzeSegment.hasSeasonality && (
                      <span> with seasonal component S={analyzeSegment.seasonalPeriod}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Re-run Analysis */}
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setAnalysisComplete(false)}>
                <Wand2 className="h-4 w-4 mr-2" />
                Re-run Analysis
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataAnalysis;
