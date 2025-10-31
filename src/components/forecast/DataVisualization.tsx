import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp, Info } from "lucide-react";
import type { SegmentConfig } from "@/types/forecast";

interface DataVisualizationProps {
  segments: SegmentConfig[];
  segmentAnalysisStates: Record<string, Record<string, any>>;
  dependentVariable: string;
  csvData: any[];
  dateColumn: string;
  segmentColumn: string;
}

export const DataVisualization = ({ 
  segments, 
  segmentAnalysisStates, 
  dependentVariable,
  csvData,
  dateColumn,
  segmentColumn
}: DataVisualizationProps) => {
  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Transformed Data Visualization
          </CardTitle>
          <CardDescription>Configure segments to view transformed data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No segments configured. Please map your segments first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Transformed Data Visualization
        </CardTitle>
        <CardDescription>View transformed data that will be sent to the forecasting model for each segment</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={segments[0]?.segmentValue} className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto">
            {segments.map((segment) => (
              <TabsTrigger key={segment.segmentValue} value={segment.segmentValue}>
                {segment.segmentValue}
              </TabsTrigger>
            ))}
          </TabsList>

          {segments.map((segment) => {
            const segmentStates = segmentAnalysisStates[segment.segmentValue];
            const hasAnalysis = segmentStates && Object.keys(segmentStates).length > 0;
            
            // Get raw data for this segment
            const rawSegmentData = csvData
              .filter(row => row[segmentColumn] === segment.segmentValue)
              .slice(0, 100)
              .map((row) => ({
                date: row[dateColumn],
                [dependentVariable]: parseFloat(row[dependentVariable]) || 0,
                ...segment.regressors.reduce((acc, reg) => {
                  const regName = typeof reg === 'string' ? reg : reg.toString();
                  return {
                    ...acc,
                    [regName]: parseFloat(row[regName]) || 0
                  };
                }, {})
              }));

            return (
              <TabsContent key={segment.segmentValue} value={segment.segmentValue} className="space-y-6">
                {/* Transformation Info Alert */}
                {hasAnalysis && (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Applied Transformations:</p>
                        <div className="flex flex-wrap gap-2">
                          {segmentStates.dependent?.transformations?.map((t: any, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              Dependent: {t.type}
                            </Badge>
                          ))}
                          {segment.regressors.map(reg => {
                            const regName = typeof reg === 'string' ? reg : String(reg);
                            const regState = segmentStates[regName];
                            return regState?.transformations?.map((t: any, idx: number) => (
                              <Badge key={`${regName}-${idx}`} variant="outline">
                                {regName}: {t.type}
                              </Badge>
                            ));
                          })}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Dependent Variable Chart */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold">Dependent Variable: {dependentVariable}</h4>
                    {hasAnalysis && segmentStates.dependent && (
                      <Badge variant="default">
                        {segmentStates.dependent.transformations?.length || 0} transformation(s)
                      </Badge>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={hasAnalysis && segmentStates.dependent?.afterData 
                      ? segmentStates.dependent.afterData 
                      : rawSegmentData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={hasAnalysis && segmentStates.dependent?.afterData ? "value" : dependentVariable}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name={hasAnalysis ? "Transformed" : "Original"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Regressors Chart */}
                {segment.regressors.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold">Regressors/Covariates</h4>
                      {hasAnalysis && (
                        <Badge variant="secondary">
                          {segment.regressors.filter(r => {
                            const regName = typeof r === 'string' ? r : String(r);
                            return segmentStates[regName]?.transformations?.length > 0;
                          }).length} transformed
                        </Badge>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={rawSegmentData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                          }}
                        />
                        <Legend />
                        {segment.regressors.slice(0, 5).map((regressor, index) => {
                          const regName = typeof regressor === 'string' ? regressor : String(regressor);
                          const regState = segmentStates?.[regName];
                          const data = hasAnalysis && regState?.afterData 
                            ? regState.afterData 
                            : rawSegmentData;
                          const dataKey = hasAnalysis && regState?.afterData ? "value" : regName;
                          
                          return (
                            <Line
                              key={regName}
                              type="monotone"
                              dataKey={regName}
                              stroke={colors[index % colors.length]}
                              strokeWidth={2}
                              dot={false}
                              name={regName}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {!hasAnalysis && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Run AI analysis first to see transformed data. Currently showing raw data.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
