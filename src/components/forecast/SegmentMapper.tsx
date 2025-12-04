import React, { useMemo } from "react";
import { Settings2, Calendar, Hash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  // dateColumn can be used for future date range display
  void _dateColumn;

  // Extract unique segments from data
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

  // Calculate record counts per segment
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

  // Get selected segment names
  const selectedSegmentNames = useMemo(() => {
    return new Set(segments.map((s) => s.segmentName));
  }, [segments]);

  // Toggle segment selection
  const toggleSegment = (segmentName: string) => {
    if (selectedSegmentNames.has(segmentName)) {
      // Remove segment
      onSegmentsChange(segments.filter((s) => s.segmentName !== segmentName));
    } else {
      // Add segment with default config
      const totalRecords = segmentRecordCounts[segmentName] || 0;
      const testRecords = Math.max(1, Math.floor(totalRecords * 0.2));
      const trainRecords = totalRecords - testRecords;
      const newSegment: SegmentConfig = {
        segmentName,
        trainRecords,
        testRecords,
        forecastPeriods: 12,
        frequency: "MS" as DataFrequency,
        regressors: [],
      };
      onSegmentsChange([...segments, newSegment]);
    }
  };

  // Select all segments
  const selectAll = () => {
    if (selectedSegmentNames.size === uniqueSegments.length) {
      // Deselect all
      onSegmentsChange([]);
    } else {
      // Select all
      const allSegments: SegmentConfig[] = uniqueSegments.map((segmentName) => {
        // Keep existing config if already selected
        const existing = segments.find((s) => s.segmentName === segmentName);
        if (existing) return existing;

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
      onSegmentsChange(allSegments);
    }
  };

  const updateSegment = (segmentName: string, updates: Partial<SegmentConfig>) => {
    const newSegments = segments.map((s) =>
      s.segmentName === segmentName ? { ...s, ...updates } : s
    );
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
          Select which segments to forecast and configure training/test split for each
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segment Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Select Segments to Forecast</Label>
            <button
              onClick={selectAll}
              className="text-sm text-primary hover:underline"
            >
              {selectedSegmentNames.size === uniqueSegments.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/30">
            {uniqueSegments.map((segmentName) => {
              const isSelected = selectedSegmentNames.has(segmentName);
              const recordCount = segmentRecordCounts[segmentName] || 0;

              return (
                <div
                  key={segmentName}
                  className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-primary/30"
                      : "bg-background hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSegment(segmentName)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSegment(segmentName)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{segmentName}</p>
                    <p className="text-xs text-muted-foreground">{recordCount} records</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuration Table for Selected Segments */}
        {segments.length > 0 && (
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
                {segments.map((segment) => (
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
                          updateSegment(segment.segmentName, {
                            trainRecords: parseInt(e.target.value) || 0,
                          })
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
                          updateSegment(segment.segmentName, {
                            testRecords: parseInt(e.target.value) || 0,
                          })
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
                          updateSegment(segment.segmentName, {
                            forecastPeriods: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-24 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={segment.frequency}
                        onValueChange={(value) =>
                          updateSegment(segment.segmentName, {
                            frequency: value as DataFrequency,
                          })
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
        )}

        {segments.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            Select at least one segment above to configure forecast settings
          </p>
        )}

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
