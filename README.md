# LumenAI — Self-Hosted LLM Chat

A full-stack AI chat application that runs a local language model via [Ollama](https://ollama.com). No OpenAI key required.

**Stack:** Next.js 15 · NestJS · PostgreSQL · Ollama (qwen2.5:3b) · Docker

---

> [!WARNING]
> **Running this project will download a ~2.3 GB AI model (qwen2.5:3b) to your machine.**
> Docker will pull the Ollama image and automatically fetch the model on first startup. Make sure you have sufficient disk space and a stable internet connection before proceeding.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| [Docker](https://www.docker.com/get-started) + Docker Compose | Docker 24+ |
| [Node.js](https://nodejs.org) *(local dev only)* | 22+ |

---

## Quick Start (Docker — recommended)

This single command builds all services, starts the database, pulls the Ollama model, and serves the app.

```bash
docker compose up --build
```

**First run takes longer** — Docker must pull all images and download the ~2.3 GB qwen2.5:3b model. Subsequent starts are fast.

Once everything is healthy:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Ollama | http://localhost:11434 |

Stop everything with:

```bash
docker compose down
```

To also remove all stored data (database + downloaded model):

```bash
docker compose down -v
```

---

## What Docker Runs

```
postgres       PostgreSQL 16 — stores users, conversations, messages, inference logs
ollama         Ollama server — serves the local LLM over HTTP
ollama-init    One-shot container that pulls qwen2.5:3b (~2.3 GB) on first run
backend        NestJS API on port 8080
frontend       Next.js app on port 3000
```

The `ollama-init` container only runs once. On subsequent `docker compose up` calls it exits immediately because the model is already cached in the `ollama_data` volume.

---

## Local Development (without Docker)

Run each service manually if you want hot-reload during development.

### 1. Start infrastructure

You still need Postgres and Ollama running. The easiest way:

```bash
docker compose up postgres ollama ollama-init
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

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
```

Then start the dev server:

```bash
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8080`. Open http://localhost:3000.

---

## Environment Variables

All variables have sane defaults for local dev. Only `JWT_SECRET` should be changed for any public deployment.

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `sdkfhas…` | Sign JWT tokens — **change this in production** |
| `PORT` | `8080` | Backend listen port |
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_USERNAME` | `postgres` | Postgres user |
| `DB_PASSWORD` | `postgres` | Postgres password |
| `DB_DATABASE` | `llm_ingestion` | Postgres database name |
| `LLM_PROVIDER` | `ollama` | LLM backend (`ollama` only for now) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Model to use for inference |

---

## Features

- **Streaming responses** — tokens stream to the browser as they are generated
- **Pause & resume** — pause a streaming response mid-generation and resume it later
- **Conversation history** — full message history persisted in Postgres
- **Auth** — JWT-based auth with HTTP-only cookies (7-day sessions)
- **Inference dashboard** — latency and token-usage charts per conversation
- **Rate limiting** — 100 requests per minute per IP (configurable)

---

## Changing the Model

To use a different Ollama model, update two places:

1. In `docker-compose.yml`, change the `ollama-init` entrypoint and the `OLLAMA_MODEL` env var on the backend service:

```yaml
ollama-init:
  entrypoint: ["/bin/sh", "-c", "ollama pull llama3.2:3b"]  # <-- new model

backend:
  environment:
    OLLAMA_MODEL: llama3.2:3b  # <-- match here
```

2. Re-run `docker compose up --build`.

Browse available models at [ollama.com/library](https://ollama.com/library).

> [!NOTE]
> On macOS, Ollama runs **CPU-only** inside Docker — Metal GPU acceleration is not available in containers. Inference will be slower than running Ollama natively. For faster responses on Mac, install [Ollama natively](https://ollama.com/download) and point `OLLAMA_BASE_URL` at `http://host.docker.internal:11434` (or `http://localhost:11434` in local dev mode).

---

## Project Structure

```
chatbot/
├── backend/          NestJS API
│   └── src/
│       ├── users/        Auth (signup / signin)
│       ├── conversation/ Conversations & messages
│       ├── llm/          Ollama integration + streaming
│       └── ingestion/    Inference logging & metrics
├── frontend/         Next.js 15 app
│   └── src/
│       ├── app/          Routes (/, /login, /signup, /dashboard)
│       ├── components/   UI components
│       ├── context/      Global chat state
│       └── services/     API client functions
└── docker-compose.yml
```
