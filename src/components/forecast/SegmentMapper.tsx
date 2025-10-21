import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Layers } from "lucide-react";
import type { SegmentConfig } from "@/types/forecast";

interface SegmentMapperProps {
  availableColumns: string[];
  segments: SegmentConfig[];
  onSegmentsChange: (segments: SegmentConfig[]) => void;
}

export const SegmentMapper = ({ availableColumns, segments, onSegmentsChange }: SegmentMapperProps) => {
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentColumn, setNewSegmentColumn] = useState("");

  const addSegment = () => {
    if (newSegmentName && newSegmentColumn && !segments.find((s) => s.segment === newSegmentName)) {
      onSegmentsChange([
        ...segments,
        {
          segment: newSegmentName,
          regressors: [],
          forecast_periods: 12,
          frequency: 'MS',
          exclude_recent: 0,
          start_row: 1,
          end_row: 100,
        },
      ]);
      setNewSegmentName("");
      setNewSegmentColumn("");
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
          <Layers className="h-5 w-5 text-primary" />
          Segment Configuration
        </CardTitle>
        <CardDescription>
          Map segments to columns in your CSV. Each segment will have its own model.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="segment-name">Segment Name</Label>
            <Input
              id="segment-name"
              placeholder="e.g., Retail Sales"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value.trim())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="segment-column">Map to Column</Label>
            <div className="flex gap-2">
              <Select value={newSegmentColumn} onValueChange={setNewSegmentColumn}>
                <SelectTrigger id="segment-column">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {availableColumns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addSegment} disabled={!newSegmentName || !newSegmentColumn}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {segments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No segments configured. Add at least one segment to continue.
          </div>
        ) : (
          <div className="space-y-4">
            {segments.map((segment) => (
              <Card key={segment.segment} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-sm">
                        {segment.segment}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {segment.regressors.length} regressors configured
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Frequency</Label>
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
                          <SelectItem value="MS">Monthly</SelectItem>
                          <SelectItem value="QS">Quarterly</SelectItem>
                          <SelectItem value="YS">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Exclude Recent</Label>
                      <Input
                        type="number"
                        value={segment.exclude_recent}
                        onChange={(e) =>
                          updateSegment(segment.segment, {
                            exclude_recent: parseInt(e.target.value) || 0,
                          })
                        }
                        min={0}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Data Range</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="Start"
                          value={segment.start_row}
                          onChange={(e) =>
                            updateSegment(segment.segment, {
                              start_row: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-16 text-xs"
                          min={1}
                        />
                        <span className="self-center text-xs">-</span>
                        <Input
                          type="number"
                          placeholder="End"
                          value={segment.end_row}
                          onChange={(e) =>
                            updateSegment(segment.segment, {
                              end_row: parseInt(e.target.value) || 100,
                            })
                          }
                          className="w-16 text-xs"
                          min={1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
