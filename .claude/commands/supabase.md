# Supabase Integration

Help with Supabase-related tasks.

## Edge Functions
Located in `supabase/functions/`:
- `analyze-transformations/` - AI transformation recommendations
- `statistical-tests/` - ADF, ACF, PACF statistical tests
- `optimize-prophet-params/` - Prophet parameter optimization
- `generate-model-pickle/` - Model serialization

## Calling Edge Functions
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* payload */ }
});
```

## Authentication
The app uses Supabase Auth with email/password:
- Sign up/in handled in `src/pages/Auth.tsx`
- Session managed via `supabase.auth.onAuthStateChange()`

## Database
- Types in `src/integrations/supabase/types.ts`
- Migrations in `supabase/migrations/`

Ask what Supabase task you need help with.
