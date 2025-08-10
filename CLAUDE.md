# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Interview Agent with both a Next.js web frontend and Python backend services for speech processing. The system conducts timed interviews with rule-based follow-ups, transcription, and summarization.

### Architecture

**Frontend (Next.js)**:
- Interview runner UI with timed sections and transcript display
- Firebase authentication with Google login
- Zustand state management via `interviewStore.ts`
- JSON script-driven interview flow with sections and target durations

**Backend Services**:
- **Chatterbox TTS**: Modal-deployed text-to-speech using streaming audio generation
- **Parakeet STT**: Modal-deployed speech-to-text with WebSocket streaming and silence detection
- **Conversation API**: FastAPI service orchestrating TTS/STT for real-time conversation flow

**Core Data Flow**:
1. Interview scripts (JSON) define sections with prompts and target durations
2. `interviewStore.ts` manages session state, timing, and transcript collection
3. Follow-up questions generated via `/api/followups` based on candidate responses
4. Session persists in-memory until completion, then writes to Firestore as single record

## Common Commands

**Next.js Development**:
```bash
pnpm install
pnpm dev          # Starts Next.js with Turbopack
pnpm build        # Production build
pnpm lint         # ESLint
```

**Modal Services**:
```bash
# Deploy both TTS and STT services
bash modal.sh

# Deploy individually
modal deploy chatterbox_tts.py
modal deploy parakeet.py
```

**Python Backend**:
```bash
# Install dependencies
pip install -r requirements.txt

# Run FastAPI conversation service
python conversation_fastapi.py  # http://localhost:8000

# Run simple inference client
python inference.py "Hello world"
```

## Key Files and Structure

**Core Types** (`src/lib/types.ts`):
- `Script`: Interview configuration with sections and target durations
- `Session`: Runtime state with transcript, timing, and artifacts
- `Utterance`: Individual speech turns with speaker, timing, and section context
- Database schemas for Firestore (`DbUser`, `DbInterview`, `DbAttempt`)

**State Management** (`src/lib/interviewStore.ts`):
- Zustand store managing interview session lifecycle
- Timer logic with automatic section advancement
- Follow-up question integration with 30-second time threshold
- In-memory persistence until session completion

**Speech Services**:
- `chatterbox_tts.py`: Modal app with H100 GPU, streaming WAV generation
- `parakeet.py`: Modal app with A100 GPU, real-time transcription via WebSocket
- `conversation_fastapi.py`: Orchestration API with WebSocket support for real-time conversation

**Interview Configuration**:
- Scripts stored as JSON in `/scripts/` directory
- Example: `scripts/hello.json` - GSS-style political/economic survey questions
- Each section has `id`, `prompt`, and `targetDurationSec`

## Modal Service URLs

When working with the deployed services, use these endpoints:
- **TTS**: `https://ryanrong24--chatterbox-tts-chatterbox-tts.modal.run`
- **STT**: `https://ryanrong24--example-parakeet-parakeet-web.modal.run/ws` (WebSocket)

## Development Notes

**Interview Flow Logic**:
- Timer automatically advances sections when time expires
- Follow-ups are skipped if ≤30 seconds remain in section
- Session state persists only in-memory until `finish()` is called
- Firebase writes happen once at completion for performance

**Audio Processing**:
- Parakeet uses 3-stage pipeline: audio preprocessor → transcriber → output handler
- Chatterbox streams WAV chunks with efficient PCM conversion
- Both services use silence detection for natural speech segmentation

**Environment Setup**:
- Copy `.env.local.example` to `.env.local` for Firebase configuration
- Firebase is optional for local development
- Visit `/interview` for demo using `scripts/hello.json`

## Testing Interview Flow

1. Start Next.js: `pnpm dev`
2. Navigate to `/interview` for demo interview
3. Use `scripts/hello.json` as example script structure
4. For audio testing, ensure Modal services are deployed via `bash modal.sh`