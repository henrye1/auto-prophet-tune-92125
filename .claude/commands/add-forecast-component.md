# Add New Forecast Component

Guide for creating a new forecast component in the application.

## Steps:

1. **Create the component file** at `src/components/forecast/<ComponentName>.tsx`

2. **Use this template**:
```tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface <ComponentName>Props {
  // Define props here
}

const <ComponentName>: React.FC<<ComponentName>Props> = ({ /* props */ }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Title</CardTitle>
        <CardDescription>Description of what this component does</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
};

export default <ComponentName>;
```

3. **Import in Index.tsx** and add to the appropriate tab in the workflow

4. **Add any necessary types** to `src/types/forecast.ts`

Ask the user what the component should do, then implement it following these patterns.
