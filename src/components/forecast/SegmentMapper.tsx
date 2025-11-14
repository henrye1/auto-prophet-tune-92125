import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Plus, X, Target, Calendar, TrendingUp } from "lucide-react";
import type { SegmentConfig } from "@/types/forecast";
import { analyzeSegmentData, getFrequencyName, calculateMonthsObservable } from "@/utils/dataAnalysis";

interface SegmentMapperProps {
  availableSegmentValues: string[];
  segments: SegmentConfig[];
  onSegmentsChange: (segments: SegmentConfig[]) => void;
  csvData: any[];
  segmentColumn: string;
  dateColumn: string;
}

export const SegmentMapper = ({ 
  availableSegmentValues, 
  segments, 
  onSegmentsChange,
  csvData,
  segmentColumn,
  dateColumn 
}: SegmentMapperProps) => {
  const [selectedSegmentValue, setSelectedSegmentValue] = useState("");
  const [segmentAnalysis, setSegmentAnalysis] = useState<Map<string, any>>(new Map());

  // Analyze data when segments or data changes
  useEffect(() => {
    const analysis = new Map();
    segments.forEach(segment => {
      const result = analyzeSegmentData(csvData, segmentColumn, segment.segmentValue, dateColumn);
      analysis.set(segment.segmentValue, result);
    });
    setSegmentAnalysis(analysis);
  }, [segments, csvData, segmentColumn, dateColumn]);

  const addSegment = () => {
    if (selectedSegmentValue && !segments.find((s) => s.segmentValue === selectedSegmentValue)) {
      const analysis = analyzeSegmentData(csvData, segmentColumn, selectedSegmentValue, dateColumn);
      const defaultTraining = Math.max(1, Math.floor(analysis.totalRecords * 0.9)); // Default 90% for training
      
      onSegmentsChange([
        ...segments,
        {
          segment: selectedSegmentValue,
          segmentValue: selectedSegmentValue,
          regressors: [],
          forecast_periods: 24,
          frequency: analysis.detectedFrequency,
          total_records: analysis.totalRecords,
          training_records: defaultTraining,
          test_records: analysis.totalRecords - defaultTraining,
          // Initialize with default Prophet parameters
          prophet_params: {
            growth: 'linear',
            changepoint_prior_scale: 0.05,
            seasonality_mode: 'additive',
            seasonality_prior_scale: 10,
            yearly_seasonality: true,
            weekly_seasonality: false,
            daily_seasonality: false,
            changepoint_range: 0.8,
            cv_initial: 730,
            cv_period: 180,
            cv_horizon: 365,
            custom_seasonalities: [],
            interval_width: 0.80,
            lower_bound: undefined,
            upper_bound: undefined,
          },
        },
      ]);
      setSelectedSegmentValue("");
    }
  };

  const removeSegment = (segmentName: string) => {
    onSegmentsChange(segments.filter((s) => s.segment !== segmentName));
  };

  const updateSegment = (segmentName: string, updates: Partial<SegmentConfig>) => {
    onSegmentsChange(
      segments.map((s) => (s.segment === segmentName ? { ...s, ...updates } : s))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Segment Selection & Configuration
        </CardTitle>
        <CardDescription>
          Select which segments to include and configure their forecast settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Select value={selectedSegmentValue} onValueChange={setSelectedSegmentValue}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select segment to add" />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-60">
              {availableSegmentValues
                .filter((val) => val !== "" && !segments.find((s) => s.segmentValue === val))
                .map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={addSegment} disabled={!selectedSegmentValue}>
            <Plus className="h-4 w-4 mr-2" />
            Add Segment
          </Button>
        </div>

        {segments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No segments configured. Add at least one segment to continue.
          </div>
        ) : (
          <div className="space-y-4">
            {segments.map((segment) => {
              const analysis = segmentAnalysis.get(segment.segmentValue);
              const monthsObservable = analysis 
                ? calculateMonthsObservable(analysis.firstDate, analysis.lastDate, segment.frequency)
                : 0;

              return (
                <Card key={segment.segment} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-sm">
                          {segment.segment}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {segment.regressors.length} regressors
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSegment(segment.segment)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Data Summary */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Records</div>
                        <div className="text-lg font-semibold">{segment.total_records}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Months Observable
                        </div>
                        <div className="text-lg font-semibold">{monthsObservable}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Frequency</div>
                        <div className="text-sm font-medium">{getFrequencyName(segment.frequency)}</div>
                      </div>
                    </div>

                    {/* Date Range */}
                    {analysis && (
                      <div className="text-xs text-muted-foreground">
                        Data from {analysis.firstDate?.toLocaleDateString()} to {analysis.lastDate?.toLocaleDateString()}
                      </div>
                    )}

                    {/* Training/Testing Split */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm">Training Records: {segment.training_records}</Label>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round((segment.training_records / segment.total_records) * 100)}% of data)
                          </span>
                        </div>
                        <Slider
                          value={[segment.training_records]}
                          onValueChange={([v]) =>
                            updateSegment(segment.segment, {
                              training_records: v,
                              test_records: segment.total_records - v,
                            })
                          }
                          min={1}
                          max={segment.total_records}
                          step={1}
                          className="py-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span>
                          <span>{segment.total_records}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Test Records (Holdout)
                          </Label>
                          <Input
                            type="number"
                            value={segment.test_records}
                            onChange={(e) => {
                              const testRecords = parseInt(e.target.value) || 0;
                              updateSegment(segment.segment, {
                                test_records: Math.min(testRecords, segment.total_records - 1),
                                training_records: segment.total_records - Math.min(testRecords, segment.total_records - 1),
                              });
                            }}
                            min={0}
                            max={segment.total_records - 1}
                          />
                          <div className="text-xs text-muted-foreground">
                            Last {segment.test_records} records for validation
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Forecast Periods</Label>
                          <Input
                            type="number"
                            value={segment.forecast_periods}
                            onChange={(e) =>
                              updateSegment(segment.segment, {
                                forecast_periods: parseInt(e.target.value) || 12,
                              })
                            }
                            min={1}
                          />
                          <div className="text-xs text-muted-foreground">
                            Forecast {segment.forecast_periods} {getFrequencyName(segment.frequency).toLowerCase()} periods
                          </div>
                        </div>
                      </div>

                      {/* Frequency Override */}
                      <div className="space-y-2">
                        <Label className="text-xs">Override Frequency (Optional)</Label>
                        <Select
                          value={segment.frequency}
                          onValueChange={(v) => updateSegment(segment.segment, { frequency: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="D">Daily</SelectItem>
                            <SelectItem value="W">Weekly</SelectItem>
                            <SelectItem value="SMS">Semi-Monthly</SelectItem>
                            <SelectItem value="MS">Monthly</SelectItem>
                            <SelectItem value="QS">Quarterly</SelectItem>
                            <SelectItem value="YS">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
