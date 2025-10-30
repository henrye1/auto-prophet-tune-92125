import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SegmentConfig } from "@/types/forecast";

interface MultiSegmentSelectorProps {
  segments: SegmentConfig[];
  selectedSegments: string[];
  onSelectionChange: (selectedValues: string[]) => void;
}

export function MultiSegmentSelector({
  segments,
  selectedSegments,
  onSelectionChange,
}: MultiSegmentSelectorProps) {
  const handleToggle = (segmentValue: string) => {
    if (selectedSegments.includes(segmentValue)) {
      onSelectionChange(selectedSegments.filter((s) => s !== segmentValue));
    } else {
      onSelectionChange([...selectedSegments, segmentValue]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSegments.length === segments.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(segments.map((s) => s.segmentValue));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Segments</CardTitle>
        <CardDescription>
          Choose which segments to include in the analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Checkbox
            id="select-all"
            checked={selectedSegments.length === segments.length && segments.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="font-semibold cursor-pointer">
            Select All ({segments.length})
          </Label>
        </div>
        <div className="space-y-3">
          {segments.map((segment) => (
            <div key={segment.segmentValue} className="flex items-center space-x-2">
              <Checkbox
                id={segment.segmentValue}
                checked={selectedSegments.includes(segment.segmentValue)}
                onCheckedChange={() => handleToggle(segment.segmentValue)}
              />
              <Label htmlFor={segment.segmentValue} className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">{segment.segmentValue}</span>
                  <span className="text-sm text-muted-foreground">
                    {segment.total_records} records • {segment.frequency} frequency
                  </span>
                </div>
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
