# LumenAI — Self-Hosted LLM Chat

A full-stack AI chat application that runs a local language model with no external API key required. Users can sign up, have streaming conversations with the model, pause and resume generations, and inspect inference metrics on a live dashboard.

**Stack:** Next.js 15 · NestJS · PostgreSQL · Ollama (qwen2.5:3b) · Docker

**Demo:** [Watch demo video](https://drive.google.com/file/d/13S_wKzcNKfFrgllzc8_WnyvMFkPXWxrI/view?usp=sharing)

---

> [!WARNING]
> **Running this project downloads a ~2.3 GB AI model (qwen2.5:3b) to your machine.**
> Docker pulls the Ollama image and fetches the model automatically on first startup. Ensure you have sufficient disk space and a stable internet connection before proceeding.

---

## Table of Contents

1. [Setup Instructions](#1-setup-instructions)
2. [Architecture Overview](#2-architecture-overview)
3. [Schema Design Decisions](#3-schema-design-decisions)
4. [Tradeoffs Made](#4-tradeoffs-made)
5. [What I Would Improve With More Time](#5-what-i-would-improve-with-more-time)
6. [Architecture Notes](#6-architecture-notes)

---

## 1. Setup Instructions

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| [Docker](https://www.docker.com/get-started) + Docker Compose | Docker 24+ |
| [Node.js](https://nodejs.org) *(local dev only)* | 22+ |

### Docker (recommended)

One command builds all five services, starts the database, pulls the model, and serves the app.

```bash
docker compose up --build
```

**First run is slow** — Docker pulls all images and downloads the ~2.3 GB model. Subsequent starts are fast because the model is cached in the `ollama_data` volume.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Ollama | http://localhost:11434 |

```bash
# Stop without deleting data
docker compose down

# Stop and wipe all stored data + downloaded model
docker compose down -v
```

What Docker runs:

```
postgres      PostgreSQL 16 — users, conversations, messages, inference logs
ollama        Ollama server — serves the local LLM over HTTP
ollama-init   One-shot container — pulls qwen2.5:3b on first run, then exits
backend       NestJS API on :8080
frontend      Next.js app on :3000
```

### Local Development (hot-reload)

Keep Docker for infra only, run backend and frontend natively.

**Step 1 — start infrastructure:**
```bash
docker compose up postgres ollama ollama-init
```

**Step 2 — backend:**
```bash
cd backend && npm install
```

Create `backend/.env`:
```env
PORT=8080
JWT_SECRET=your-secret-here

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=llm_ingestion

LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
# OLLAMA_FALLBACK_MODELS=llama3.2:3b,mistral:7b
```

```bash
npm run start:dev
```

**Step 3 — frontend:**
```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:3000.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | *(insecure default)* | JWT signing secret — **change for any deployment** |
| `PORT` | `8080` | Backend listen port |
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_USERNAME` | `postgres` | Postgres user |
| `DB_PASSWORD` | `postgres` | Postgres password |
| `DB_DATABASE` | `llm_ingestion` | Postgres database |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Primary model |
| `OLLAMA_FALLBACK_MODELS` | *(unset)* | Comma-separated fallback models if primary fails, e.g. `llama3.2:3b,mistral:7b` |

### Changing the Model

Edit `docker-compose.yml`:
```yaml
ollama-init:
  entrypoint: ["/bin/sh", "-c", "ollama pull llama3.2:3b"]

backend:
  environment:
    OLLAMA_MODEL: llama3.2:3b
```

Then re-run `docker compose up --build`. Browse models at [ollama.com/library](https://ollama.com/library).

> [!NOTE]
> On macOS, Ollama inside Docker runs **CPU-only** — Metal GPU is not available in containers. For faster responses, install [Ollama natively](https://ollama.com/download) and set `OLLAMA_BASE_URL=http://host.docker.internal:11434`.

---

## 2. Architecture Overview

### Request flow — message to stream

```
Browser
  │  POST /v1/conversation/:id/messages  (SSE)
  ▼
ConversationService
  │  1. persist user message → Postgres
  │  2. load full message history
  │  3. call LlmService.stream()
  ▼
LlmService
  │  delegates to FallbackProvider → OllamaProvider
  │  yields token chunks → SSE → browser
  │  on stream end: emits LLM_INFERENCE_EVENT (async, fire-and-forget)
  ▼
IngestionService  (async event listener)
  │  writes InferenceLog row to Postgres
  │  never blocks or fails the chat request
  ▼
Dashboard
  reads InferenceLog with Postgres window functions
  returns p50/p95 latency + token timeseries (no AI involved)
```

### LLM provider layer and fallback chain

```
LlmModule (reads env vars at boot)
  └─► LLM_FACTORY
          │
          ▼
      FallbackProvider         ← wraps 1..N providers, tries in order on failure
        ├── OllamaProvider(qwen2.5:3b)   ← OLLAMA_MODEL          (primary)
        ├── OllamaProvider(llama3.2:3b)  ← OLLAMA_FALLBACK_MODELS[0]
        └── OllamaProvider(mistral:7b)   ← OLLAMA_FALLBACK_MODELS[1]
```

`FallbackProvider` catches exceptions from each provider and moves to the next. **Fallback only works before the first token is yielded** — once streaming has started, partial output is already in the browser and cannot be retracted, so mid-stream errors propagate normally.

When `OLLAMA_FALLBACK_MODELS` is not set, the module uses a plain `OllamaProvider` with no wrapper overhead.

Adding a new provider type (OpenAI, Anthropic, llama.cpp) means implementing one interface (`ILLMProvider`) and registering it in the module factory. `LlmService` and everything above it stay unchanged.

### Auth

JWT is minted on signup/signin and stored as an HTTP-only, `SameSite=lax` cookie. The `JwtAuthGuard` is applied globally — all routes except `/users/signup` and `/users/signin` require it. No refresh token: 7-day TTL, redirect to `/login` on expiry.

### Project structure

```
chatbot/
├── backend/src/
│   ├── users/        signup, signin, JWT issuance
│   ├── conversation/ conversations + messages, SSE streaming
│   ├── llm/          ILLMProvider interface, OllamaProvider, FallbackProvider
│   └── ingestion/    inference event listener, analytics queries
├── frontend/src/
│   ├── app/          routes — /, /login, /signup, /dashboard
│   ├── components/   chat shell, message list, sidebar, forms
│   ├── context/      global chat state (useReducer)
│   └── services/     fetch wrappers for backend API
└── docker-compose.yml
```

---

## 3. Schema Design Decisions

### Entity relationship diagram

```
┌──────────────────────────────────┐
│              users               │
├──────────────────────────────────┤
│ id                UUID     PK    │
│ name              varchar        │
│ email             varchar   UQ   │
│ password          varchar        │  bcrypt hash, cost 10
│ is_email_verified boolean        │  reserved — not yet wired
│ created_at        timestamp      │
│ updated_at        timestamp      │
└─────────────────┬────────────────┘
                  │ 1
                  │  user_id (no DB-level FK — see note)
                  │ ∞
┌─────────────────▼────────────────┐
│           conversations          │
├──────────────────────────────────┤
│ id                UUID     PK    │
│ title             varchar        │
│ status            enum           │  ACTIVE | STREAMING | PAUSED
│                                  │  ARCHIVED | DELETED | ERROR
│ model             varchar        │  snapshot of model at creation time
│ user_id           UUID           │  → users.id
│ last_message_at   timestamp      │
│ created_at        timestamp      │
│ updated_at        timestamp      │
└─────────────────┬────────────────┘
                  │ 1
                  │  conversation_id (no DB-level FK — see note)
                  │ ∞
┌─────────────────▼────────────────┐
│             messages             │
├──────────────────────────────────┤
│ id                UUID     PK    │
│ content           text           │
│ role              enum           │  USER | ASSISTANT
│ status            enum           │  STREAMING | COMPLETED
│                                  │  INTERRUPTED | FAILED
│ conversation_id   UUID           │  → conversations.id
│ created_at        timestamp      │
│ updated_at        timestamp      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│          inference_logs          │  intentionally standalone — no FK
├──────────────────────────────────┤
│ id                UUID     PK    │
│ request_id        varchar        │  UUID generated per LLM call
│ provider          varchar        │  "ollama"
│ model             varchar        │  "qwen2.5:3b"
│ status            enum           │  COMPLETED | FAILED
│ latency_ms        int            │  wall-clock, start → last token
│ prompt_tokens     int            │
│ completion_tokens int            │
│ total_tokens      int            │
│ input_preview     text           │  first 200 chars of prompt
│ output_preview    text           │  first 200 chars of response
│ error_message     text           │
│ metadata          jsonb          │  Ollama timing breakdown (ns-level)
│ started_at        timestamp      │
│ completed_at      timestamp      │
│ created_at        timestamp      │
└──────────────────────────────────┘
```

### Design decisions and rationale

**No database-level foreign keys.**
`user_id` on `conversations` and `conversation_id` on `messages` are plain UUID columns. TypeORM's `synchronize: true` does not emit `REFERENCES` DDL for relations without `@ManyToOne`/`@JoinColumn`. This is a deliberate trade-off — it removes cascading delete behaviour which would be dangerous with `synchronize` enabled (a misconfigured entity could silently truncate dependent rows). Referential integrity is enforced in the service layer instead.

**`inference_logs` has no FK to `conversations` or `messages`.**
Logs are written by an async event listener that fires after the LLM stream ends. If the listener fails (DB write error, connection drop), the chat transaction is unaffected. A FK would couple the two — a logging failure could roll back or block a message that the user already received. Decoupling is the explicit goal.

**`message.status` enum includes `STREAMING` and `INTERRUPTED`.**
The assistant message row is written to Postgres before streaming begins. If the user cancels (pause) or the connection drops, the row stays with `INTERRUPTED` status rather than being deleted. This lets the resume flow find the exact message to continue from.

**`conversation.model` is a snapshot.**
The model name is stored at conversation creation time, not read from env at query time. If the server's `OLLAMA_MODEL` changes, existing conversations still record which model they were talking to — useful for the dashboard and for debugging.

**UUIDs everywhere, no auto-increment.**
All primary keys use `uuid_generate_v4()` (Postgres). This avoids sequential ID leakage in URLs and makes shard-safe IDs possible in future, at the cost of larger index size.

---

## 4. Tradeoffs Made

### Local model = high latency, no cost

Running `qwen2.5:3b` on CPU inside Docker trades cost for control:

| Setup | Time-to-first-token | Cost |
|-------|--------------------|-|
| Ollama in Docker, Mac CPU | 5–20 s | Free |
| Ollama native, Mac Metal GPU | 1–4 s | Free |
| Hosted API (OpenAI, Anthropic) | 0.3–1 s | Per-token billing |

Streaming is the primary mitigation — users see tokens arriving rather than waiting for the full response. The pause/resume feature exists partly because a slow, unwanted generation wastes CPU for its entire duration; pausing immediately frees it.

### Dashboard shows raw SQL metrics, not AI-generated summaries

The dashboard queries `inference_logs` with Postgres window functions (p50/p95 latency, token totals). There is no LLM-powered analysis of the logs.

Adding AI summaries would fire another model call on every dashboard load — compounding the latency problem on the same hardware that's already busy serving chat. It would also make the analytics page unreliable when the model is under load. Raw numbers are more trustworthy for debugging.

### Fallback covers connection failures, not slow responses

`FallbackProvider` catches thrown exceptions and retries the next provider. It does not implement per-request timeouts. If Ollama accepts the request but generates very slowly, there is no automatic switch. A proper solution needs an `AbortSignal` with a deadline that triggers fallback before the first token — not yet implemented.

### Cookie auth, no refresh token

HTTP-only cookies are simple and XSS-safe. The 7-day access token with no refresh is acceptable for a local tool where sessions are expected to be long. For a multi-user deployment, shorter-lived tokens with a refresh mechanism would be more appropriate.

### TypeORM `synchronize: true`

Schema is auto-synced from entity definitions on boot. This removes the need for migration files during development. It is a data-loss risk in production — TypeORM can drop columns if an entity field is removed. There is a `TODO` in the code to disable this before any real deployment.

### No database-level foreign keys

Covered in schema decisions above. The tradeoff is faster, safer development with `synchronize: true`, at the cost of no cascading deletes and no DB-enforced referential integrity.

---

## 5. What I Would Improve With More Time

**Replace `synchronize: true` with proper migrations.**
Generate TypeORM migration files, commit them to version control, and run them explicitly. This is the single highest-risk gap for any production use.

**API key support for SDK / programmatic access.**
Current auth is cookie-only — it does not work for CLI tools or integrations. Would add an `api_keys` table (hashed keys, linked to user), a parallel `Authorization: Bearer <key>` guard, and key management endpoints. This was designed around from the start (the provider interface is already decoupled from HTTP) but not yet built.

**Role-based access to the dashboard.**
All authenticated users can currently see all inference logs. Would add a `role` column (`user` | `admin`) to the `users` table and a role-guard on `/v1/ingestion/*` routes. Regular users get chat only; admins get the dashboard.

**Fallback with per-request timeout.**
Wrap each provider call in an `AbortSignal` deadline (e.g. 30 s to first token). If the deadline fires, cancel the current request and try the next provider. This makes the fallback chain useful against slow models, not just crashed ones.

**Streaming reconnect on browser disconnect.**
If the SSE connection drops mid-response (network blip, mobile sleep), the client currently shows a broken message and cannot reconnect. Would add a `Last-Event-ID` header to let the client resume from the last delivered chunk, matching against the in-progress stream buffer on the server.

**Proper indexing.**
Current schema has no explicit indexes beyond primary keys and the `email` unique index. At minimum: `conversations(user_id)`, `messages(conversation_id, created_at)`, `inference_logs(created_at)`, `inference_logs(status)`. These will matter at any real volume.

**Email verification.**
The `is_email_verified` column already exists on the `users` table — the flow is just not wired up. Would add a verification email on signup and block unverified users from the chat.

---

## 6. Architecture Notes

### Ingestion flow

Every LLM call — whether `complete()` or `stream()` — passes through `LlmService`, which wraps the provider call with a `try/catch/finally`. On completion (success or failure) it emits a `llm.inference` event synchronously before the `finally` block returns.

`IngestionService` is decorated with `@OnEvent('llm.inference', { async: true })`. NestJS's EventEmitter2 calls it in a separate async context after the main request has already returned. This means:

1. The chat response is never delayed by a slow DB write.
2. A logging failure (network error, Postgres timeout) is swallowed with a `logger.error` — it never surfaces to the user.
3. There is no delivery guarantee — if the process crashes between emit and write, the log row is lost. For a metrics-only use case this is acceptable.

The ingestion layer stores both raw fields (latency, tokens) and derived fields (p50/p95 latency) are computed at query time by Postgres, not at write time. This keeps writes cheap and gives flexibility to add new aggregations without re-processing historical data.

### Logging strategy

**Structured application logging** is handled by NestJS's built-in `Logger`. Each service has its own logger instance (`new Logger(ServiceName.name)`), so log lines are prefixed with the class name. No log aggregation pipeline is set up — logs go to stdout and are captured by Docker.

**Inference logging** is a separate concern, stored in Postgres rather than log files, for three reasons:

- It needs to be queryable (time-range filters, percentile aggregations, pagination).
- It needs to survive process restarts without a log shipper.
- It decouples observability from the application log level — you can have verbose `DEBUG` app logs while only capturing completed inference records.

`input_preview` and `output_preview` store the first 200 characters of each LLM exchange. This is enough to identify what a request was about during debugging without storing full conversation content in the analytics table (which would duplicate Postgres data and grow unboundedly).

### Scaling considerations

The current design is intentionally single-instance. Scaling it would require addressing:

**Stateful SSE connections.** Each streaming response holds an open HTTP connection on the NestJS process. Horizontally scaling the backend behind a load balancer would require sticky sessions (or WebSocket with a broker like Redis pub/sub) so a reconnecting client hits the same process that holds the active stream.

**Ollama is a single point of failure.** There is one Ollama container. The fallback chain can try multiple models but they all go to the same host. Running multiple Ollama instances behind a simple round-robin proxy would distribute CPU load across models, though on CPU-only hardware this is of limited benefit.

**Postgres connection pooling.** NestJS + TypeORM opens a connection pool per process. Under horizontal scale, connection counts multiply. A pooler like PgBouncer in front of Postgres would be needed before scaling to more than a handful of backend instances.

**`inference_logs` will grow unboundedly.** No TTL or partition strategy is in place. At production volume, `created_at`-based partitioning (monthly) and an archival job would be needed to keep the dashboard queries fast.

**No caching layer.** Dashboard aggregations re-query Postgres on every request. A short TTL cache (Redis or even in-memory) on the summary and timeseries endpoints would eliminate redundant window-function scans.

### Failure handling assumptions

| Failure | Current behaviour | Assumption |
|---------|-------------------|-----------|
| Ollama unreachable on startup | Backend starts, first chat request throws 500 | Acceptable for local dev; a health-check endpoint + readiness probe would be needed for production |
| Ollama dies mid-stream | SSE closes with an error event; browser shows error banner | User can retry; no partial message is committed as complete |
| Primary model not found | `FallbackProvider` tries next model in list; throws if all fail | At least one model must be pulled before the backend is useful |
| DB write fails (log) | Error swallowed, logged to stdout | Inference logs are best-effort metrics, not transactional data |
| DB write fails (message) | 500 returned to client; user sees error | Messages are transactional — failure should be visible |
| JWT expired | 401 returned; frontend redirects to `/login` | User loses in-flight work; no session restore |
| Browser disconnect mid-stream | SSE aborts; `AbortController` cancels the Ollama request | Ollama stops generating; no wasted CPU after client disconnects |
