# AI OS Backend

FastAPI backend for the andplanning AI OS.

## Architecture

```
Browser (Next.js)
  └─ lib/api/adapters/rest.ts  (REST Adapter)
       └─ HTTP/SSE → this backend
                        ├─ GET/PATCH  /api/settings   (OS settings + API keys)
                        ├─ GET        /api/factories   (7 AI factories)
                        ├─ GET        /api/workflows   (workflow definitions)
                        ├─ POST       /api/workflows/:id/runs  (start a run)
                        ├─ GET        /api/workflow-runs       (run history)
                        ├─ POST       /api/chat/claude         (SSE streaming)
                        ├─ POST       /api/chat/openai         (SSE streaming)
                        ├─ POST       /api/chat/gemini         (SSE streaming)
                        └─ ...
                             └─ OpenAI / Anthropic / Google
```

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env and add your API keys (or configure them later via the Settings page)
```

### 2. Run with Docker (recommended)

```bash
docker-compose up --build
# Backend available at http://localhost:8000
# API docs at        http://localhost:8000/docs
```

### 3. Run locally (Python 3.12+)

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
mkdir -p data
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Connect the frontend

Add to `website/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The app automatically uses the REST adapter when this variable is set (default).
To fall back to mock data: `NEXT_PUBLIC_API_ADAPTER=mock`

## Factory Model Routing

Each factory uses a dedicated AI model by default:

| Factory          | Default Model              | Provider  |
|------------------|----------------------------|-----------|
| Writing Factory  | claude-sonnet-4-6          | Anthropic |
| Research Factory | gpt-4o                     | OpenAI    |
| Marketing Factory| gemini-2.0-flash           | Google    |
| Video Factory    | gemini-2.0-flash           | Google    |
| Fortune Factory  | claude-haiku-4-5-20251001  | Anthropic |
| Creator Factory  | gpt-4o-mini                | OpenAI    |
| AI OS Core       | (OS default)               | Auto      |

Override per factory via `PATCH /api/factories/{id}/settings` or the UI.

## SSE Streaming

Chat endpoints return Server-Sent Events:

```
POST /api/chat/claude
Content-Type: application/json

{ "messages": [{"role": "user", "content": "こんにちは"}], "factory_id": "writing" }

→ data: {"content": "こんに"}
→ data: {"content": "ちは！"}
→ data: [DONE]
```

JavaScript client example:

```js
const res = await fetch('http://localhost:8000/api/chat/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
})
const reader = res.body.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = decoder.decode(value)
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const chunk = JSON.parse(line.slice(6))
      process.stdout.write(chunk.content)
    }
  }
}
```

## API Keys

Keys can be set two ways (highest precedence first):

1. **Settings page** → Save All → stored in DB → used by all subsequent requests
2. **`.env` file** → `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` → fallback

The DB value always takes priority over the `.env` fallback.

## Database

SQLite by default (`./data/aios.db`).  
Swap to PostgreSQL by changing `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aios
```

Also add `asyncpg` to `requirements.txt`.

## API Documentation

Interactive docs available when the server is running:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc:       `http://localhost:8000/redoc`
