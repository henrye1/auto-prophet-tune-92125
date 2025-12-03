# Show Project Structure

Display the project structure with descriptions.

Run `ls -la` and show the directory tree:

```
auto-prophet-tune/
├── src/
│   ├── pages/           # Route pages (Index, Auth, NotFound)
│   ├── components/
│   │   ├── ui/          # shadcn-ui base components
│   │   └── forecast/    # Domain-specific components
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Library utilities
│   └── integrations/    # External service integrations (Supabase)
├── supabase/
│   ├── functions/       # Edge functions (Deno)
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── dist/                # Build output (generated)
```

List the actual files in each key directory to show current state.
