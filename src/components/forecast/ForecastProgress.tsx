import React from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SegmentProgress {
  segmentName: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
}

interface ForecastProgressProps {
  segments: SegmentProgress[];
  overallProgress: number;
  currentStep?: string;
}

const ForecastProgress: React.FC<ForecastProgressProps> = ({
  segments,
  overallProgress,
  currentStep,
}) => {
  const completedCount = segments.filter((s) => s.status === "completed").length;
  const errorCount = segments.filter((s) => s.status === "error").length;

  const getStatusIcon = (status: SegmentProgress["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  const getStatusBadge = (status: SegmentProgress["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "processing":
        return <Badge variant="default">Processing</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Running Forecast
        </CardTitle>
        <CardDescription>
          {currentStep || `Processing ${segments.length} segment(s)...`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span className="font-medium">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{completedCount} completed</span>
            {errorCount > 0 && (
              <span className="text-destructive">{errorCount} failed</span>
            )}
            <span>{segments.length - completedCount - errorCount} remaining</span>
          </div>
        </div>

        {/* Info box for long-running operations */}
        {overallProgress < 90 && overallProgress > 20 && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> For AutoGluon forecasts, check the Azure Function terminal to see real-time training progress and the model leaderboard.
            </p>
          </div>
        )}

        {/* Segment Progress List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Segment Status</h4>
          <div className="rounded-lg border divide-y">
            {segments.map((segment) => (
              <div
                key={segment.segmentName}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(segment.status)}
                  <div>
                    <p className="font-medium text-sm">{segment.segmentName}</p>
                    {segment.message && (
                      <p className="text-xs text-muted-foreground">{segment.message}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(segment.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForecastProgress;
