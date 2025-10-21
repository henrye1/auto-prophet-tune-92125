import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface SegmentProgress {
  segment: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
}

interface ForecastProgressProps {
  segmentProgress: SegmentProgress[];
}

export const ForecastProgress = ({ segmentProgress }: ForecastProgressProps) => {
  const completedCount = segmentProgress.filter((s) => s.status === 'completed').length;
  const totalCount = segmentProgress.length;
  const overallProgress = (completedCount / totalCount) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forecast Progress</CardTitle>
        <CardDescription>
          Building models for {totalCount} segment{totalCount !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">
              {completedCount} / {totalCount} completed
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {segmentProgress.map((segment) => (
            <div key={segment.segment} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{segment.segment}</span>
                  {segment.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {segment.status === 'running' && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                  {segment.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                </div>
                <Badge
                  variant={
                    segment.status === 'completed'
                      ? 'default'
                      : segment.status === 'error'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {segment.status}
                </Badge>
              </div>
              {segment.status === 'running' && (
                <>
                  <Progress value={segment.progress} className="h-1.5 mb-2" />
                  {segment.message && (
                    <p className="text-xs text-muted-foreground">{segment.message}</p>
                  )}
                </>
              )}
              {segment.status === 'error' && segment.message && (
                <p className="text-xs text-destructive">{segment.message}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
