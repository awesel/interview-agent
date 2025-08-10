## AI Interview Agent MVP

Vertical slice: load a JSON script, run a timed interview with simple rule‑based follow‑ups, summarize via a mock API, and export a JSON bundle. Includes a Firebase Google login stub.

### Quick start

1. Copy env template and fill in (Firebase optional for local dev):

```bash
cp .env.local.example .env.local
```

2. Install and run dev:

```bash
pnpm install
pnpm dev
```

3. Visit `/interview` for the demo run using `scripts/hello.json`.

### Notable paths

- `src/lib/types.ts` domain types and validators
- `src/lib/interviewStore.ts` minimal state machine
- `scripts/hello.json` example script
- `src/app/interview/page.tsx` runner UI
- `src/app/api/summarize/route.ts` mock summary endpoint
- `src/lib/firebase.ts` Firebase client init (Google login at `/login`)
