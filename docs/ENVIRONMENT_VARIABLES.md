# FrontWing - Production Environment & Secrets Reference

This document provides a single unified reference for all environment variables across FrontWing services, detailing their purpose, security classification, format requirements, and procedures for obtaining or generating production credentials.

---

## 1. Backend Service (`backend/`)

| Variable | Type | Required | Default / Example | Description & Where to Obtain |
| :--- | :---: | :---: | :--- | :--- |
| `PORT` | Integer | Optional | `5000` | Port on which the Express HTTP/WebSocket server listens. |
| `NODE_ENV` | String | **Required** | `production` | Runtime mode. When set to `production`, disables CORS wildcards and masks technical internal error stack traces. |
| `DATABASE_URL` | URI | **Required** | `postgresql://postgres:postgres@postgres:5432/frontwing` | PostgreSQL connection string. Format: `postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]`. |
| `REDIS_URL` | URI | **Required** | `redis://redis:6379/0` | Redis connection URL for caching and rate limiting. Format: `redis://[HOST]:[PORT]/[DB_INDEX]`. |
| `AI_SERVICE_URL` | URL | **Required** | `http://ai_services:8000` | Base URL of the FastF1 / LangGraph Python AI service. |
| `JWT_SECRET` | Secret | **Required** | *Must be generated* | Cryptographic signing secret for user authentication tokens. **Generation**: Run `openssl rand -hex 32` to produce a high-entropy 256-bit key. Never commit this key to version control. |
| `JWT_EXPIRES_IN` | String | Optional | `7d` | Token expiration duration (e.g. `7d`, `24h`, `60m`). |
| `LOG_LEVEL` | String | Optional | `info` | Logging verbosity (`error`, `warn`, `info`, `debug`). |
| `ALLOWED_ORIGINS` | CSV List | **Required** in Prod | `http://localhost,http://localhost:80,http://localhost:5173` | Comma-separated list of trusted client origins for CORS policy enforcement. Wildcards (`*`) are disallowed. |

---

## 2. AI Services (`ai_services/`)

| Variable | Type | Required | Default / Example | Description & Where to Obtain |
| :--- | :---: | :---: | :--- | :--- |
| `ENVIRONMENT` | String | **Required** | `production` | Gating flag for FastAPI. When `production`, disables `/docs`, `/redoc`, and `/openapi.json`, and masks internal stack traces. |
| `PORT` | Integer | Optional | `8000` | Port for Uvicorn ASGI server. |
| `LOG_LEVEL` | String | Optional | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `MODEL_PROVIDER` | String | Optional | `gemini` | Primary LLM provider for intent classification and race debrief synthesis (`gemini` or `groq`). |
| `GEMINI_API_KEY` | Secret | **Required** if Gemini | *Obtain from AI Studio* | API key for Google Gemini models (`gemini-3.6-flash`, `gemini-2.0-flash`). **Obtain from**: [Google AI Studio](https://aistudio.google.com/). |
| `GEMINI_MODEL` | String | Optional | `gemini-3.6-flash` | Identifier of Gemini model to invoke. |
| `GROQ_API_KEY` | Secret | **Required** if Groq | *Obtain from Groq Console* | API key for Groq Cloud high-speed inference. **Obtain from**: [Groq Cloud Console](https://console.groq.com/). |
| `GROQ_MODEL` | String | Optional | `openai/gpt-oss-120b` | Model identifier on Groq Cloud. |
| `DATABASE_URL` | URI | **Required** | `postgresql://postgres:postgres@postgres:5432/frontwing` | PostgreSQL connection string for timing telemetry and session lookups. |
| `REDIS_URL` | URI | **Required** | `redis://redis:6379/0` | Redis connection URL for tool caching and deduplication. |
| `LLM_CACHE_ENABLED` | Boolean | Optional | `true` | Enables/disables caching of LLM planner responses in Redis. |
| `OPENF1_BASE_URL` | URL | Optional | `https://api.openf1.org/v1` | Base URL for OpenF1 live timing and session data. |
| `ERGAST_BASE_URL` | URL | Optional | `https://ergast.com/api/f1` | Base URL for legacy Ergast F1 archive. |
| `LANGCHAIN_TRACING_V2` | Boolean | Optional | `false` | Enables LangSmith distributed trace collection. |
| `LANGCHAIN_API_KEY` | Secret | Optional | *Obtain from LangSmith* | API key for LangSmith observability platform. **Obtain from**: [LangSmith Console](https://smith.langchain.com/). |
| `LANGCHAIN_PROJECT` | String | Optional | `FrontWing` | Project name in LangSmith telemetry workspace. |

---

## 3. Frontend Service (`frontend/`)

| Variable | Type | Required | Default / Example | Description & Where to Obtain |
| :--- | :---: | :---: | :--- | :--- |
| `VITE_API_URL` | URL | Optional | `http://localhost:5000` | Base URL pointing to the Express backend API gateway. When deploying behind the production Nginx reverse proxy, leave blank (`""`) to utilize relative path proxying. |

---

## 4. Production Security Checklist

1. **Secret Generation**:
   - Every production deployment MUST generate a fresh `JWT_SECRET` via:
     ```bash
     openssl rand -hex 32
     ```
2. **Database Credentials**:
   - Production PostgreSQL deployments must replace default `postgres:postgres` credentials with a dedicated role and strong password:
     ```bash
     openssl rand -base64 24
     ```
3. **CORS Restrictions**:
   - Verify `ALLOWED_ORIGINS` in `backend` contains only the domain(s) on which the frontend is hosted.
4. **Docs Gating**:
   - Verify `ENVIRONMENT=production` in `ai_services` to ensure Swagger UI (`/docs`) and OpenAPI schema endpoints are closed to external callers.
