## Interview responses in Firestore

### Overview

- **Client initialization**: Firestore is initialized in `src/lib/firebase.ts` and exported as `db`.
- **Write model**: Interview responses are saved once, at the end of a session, as a single document in the `attempt_results` collection. There are no per-turn writes.
- **Legacy note**: An older, incremental `sessions` collection exists but is marked deprecated.

### Collections

- **interviewers**: Stores interviewer configurations and scripts.
  - Fields: `ownerUid`, `name`, `slug`, `script`, `createdAt`, `order`.
- **attempt_results**: Stores finished interview attempts, including the full transcript and derived artifacts. This is where interview responses live.
- **users**: Minimal user profile written at signup for both interviewer and candidate roles.

### When and how data is written

- The UI records a session locally while the interview runs.
- When the interview is finished, a single document is created in `attempt_results` via `addDoc`.
  - Write helper: `createFinishedAttempt(data)` in `src/lib/interviewersService.ts`.
  - Trigger: `src/app/interview/[slug]/page.tsx` observes `endedAt` and calls `createFinishedAttempt(...)` once.

### `attempt_results` document shape

Fields below use Unix epoch milliseconds for timestamps unless noted.

- `interviewerId` (string): Document ID from `interviewers` for this session.
- `interviewerSlug` (string, optional): Convenience copy of the slug used to start the interview.
- `scriptTitle` (string): Title of the script used in the session.
- `startedAt` (number): Session start time (ms).
- `endedAt` (number): Session end time (ms).
- `durationSec` (number): Derived total duration in seconds.
- `participant` (object | null): Candidate info collected at start.
  - `name` (string, optional)
  - `email` (string, optional)
  - `phone` (string, optional)
- `transcript` (array): Full ordered conversation turns.
  - Each item: `{ speaker: "interviewer" | "candidate", text: string, atMs: number, sectionId: string }`
- `sections` (array): Per-section timing/progress.
  - Each item: `{ id: string, startedAt?: number, endedAt?: number, overrunSec?: number }`
- `artifacts` (object, optional): Derived summaries/analytics.
  - May include: `summary` (string), `insights` (string[]), `scores` (`{ sectionId, score, evidence[] }`[]), `quotes` (string[])
- `createdAt` (number): Write time (ms) when the attempt document was created.

### Example document (`attempt_results/<auto-id>`)

```json
{
  "interviewerId": "abc123def",
  "interviewerSlug": "my-sde-loop",
  "scriptTitle": "SDE Behavioral Loop",
  "startedAt": 1723290000000,
  "endedAt": 1723290300000,
  "durationSec": 300,
  "participant": {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+1-555-0100"
  },
  "transcript": [
    {
      "speaker": "interviewer",
      "text": "Tell me about a time...",
      "atMs": 1723290005000,
      "sectionId": "q1"
    },
    {
      "speaker": "candidate",
      "text": "I led a project...",
      "atMs": 1723290012000,
      "sectionId": "q1"
    }
  ],
  "sections": [
    { "id": "q1", "startedAt": 1723290000000, "endedAt": 1723290060000 },
    { "id": "q2" }
  ],
  "artifacts": {
    "summary": "Mock summary...",
    "insights": ["Longer, structured answers score higher."],
    "scores": [
      { "sectionId": "q1", "score": 8, "evidence": ["I led a project..."] }
    ],
    "quotes": ["I led a project..."]
  },
  "createdAt": 1723290301000
}
```

### Queries

- List attempts for an interviewer (dashboard): filter by `interviewerId`, order by `createdAt` desc.
  - Equality filter + order by uses default single-field indexes.

### Legacy: `sessions` (deprecated)

- A previous flow created incremental `sessions` documents during an interview. This is now replaced by the single-write `attempt_results` model. New features should target `attempt_results` only.

### Notes and considerations

- Authentication: The interview flow allows saving an attempt without requiring sign-in. If your deployment requires auth for writes, add or tighten Firestore Security Rules accordingly.
- Timestamps: Stored as numbers (ms) for easy client-side sorting and display.
- Schema evolution: `artifacts` is intentionally flexible to allow new analytics without migrations.
