import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Target, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SegmentConfig } from "@/types/forecast";

interface SegmentContextSelectorProps {
  segments: SegmentConfig[];
  selectedSegment: string | null;
  onSegmentSelect: (segment: string) => void;
}

export const SegmentContextSelector = ({
  segments,
  selectedSegment,
  onSegmentSelect,
}: SegmentContextSelectorProps) => {
  if (segments.length === 0) {
    return null;
  }

  const currentSegment = segments.find(s => s.segment === selectedSegment);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Segment Context
        </CardTitle>
        <CardDescription>
          All analysis and configurations will apply to the selected segment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="segment-selector">Active Segment</Label>
          <Select value={selectedSegment || ""} onValueChange={onSegmentSelect}>
            <SelectTrigger id="segment-selector" className="w-full bg-background">
              <SelectValue placeholder="Select a segment to work with" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              {segments.filter((segment) => segment.segment !== "").map((segment) => (
                <SelectItem key={segment.segment} value={segment.segment}>
                  <div className="flex items-center gap-2">
                    <span>{segment.segment}</span>
                    <Badge variant="outline" className="text-xs">
                      {segment.total_records} records
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentSegment && (
          <Alert className="bg-background/50">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Working with <strong>{currentSegment.segment}</strong> 
              {" - "}
              {currentSegment.training_records} training records, 
              {currentSegment.test_records} test records
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
