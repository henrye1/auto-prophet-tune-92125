import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegressorConfig } from "./RegressorConfig";
import { Target } from "lucide-react";
import { getNumericColumns } from "@/utils/dataAnalysis";
import type { SegmentConfig } from "@/types/forecast";

interface SegmentRegressorConfigProps {
  segments: SegmentConfig[];
  availableRegressors: string[];
  onSegmentsChange: (segments: SegmentConfig[]) => void;
  data?: any[];
}

export const SegmentRegressorConfig = ({
  segments,
  availableRegressors,
  onSegmentsChange,
  data,
}: SegmentRegressorConfigProps) => {
  // Filter to only numeric columns
  const numericRegressors = data 
    ? getNumericColumns(data, availableRegressors)
    : availableRegressors;
  
  const nonNumericCount = availableRegressors.length - numericRegressors.length;
  
  const updateSegmentRegressors = (segmentName: string, regressors: any[]) => {
    onSegmentsChange(
      segments.map((s) => (s.segment === segmentName ? { ...s, regressors } : s))
    );
  };

  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Segment Regressors</CardTitle>
          <CardDescription>Configure regressors for each segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No segments configured. Please add segments first.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Segment Regressors
        </CardTitle>
        <CardDescription>
          Configure drivers/regressors for each segment individually
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={segments[0].segment} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto bg-muted/50">
            {segments.map((segment) => (
              <TabsTrigger key={segment.segment} value={segment.segment} className="whitespace-nowrap">
                {segment.segment}
                {segment.regressors.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {segment.regressors.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {segments.map((segment) => (
            <TabsContent key={segment.segment} value={segment.segment} className="mt-6">
              <RegressorConfig
                availableRegressors={numericRegressors}
                selectedRegressors={segment.regressors}
                onRegressorsChange={(regressors) =>
                  updateSegmentRegressors(segment.segment, regressors)
                }
                nonNumericCount={nonNumericCount}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
