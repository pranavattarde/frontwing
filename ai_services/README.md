# FrontWing AI Services

Python microservice powered by FastAPI, LangGraph, and FastF1 for advanced Formula 1 data analytics and natural language reasoning.

## Tech Stack
- **FastAPI**: Lightweight HTTP REST framework for bridging Node.js commands to Python executors.
- **FastF1**: Direct F1 telemetry, lap timings, car status, and tire histories parsing.
- **LangGraph**: Orchestrates custom agent state machines for F1-specific tasks.
- **LangChain & pgvector**: RAG orchestration utilizing embedded race commentaries and rule documents.

## Local Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows: .\venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure Environment Variables (`.env`):
   ```env
   OPENAI_API_KEY=your-api-key
   DATABASE_URL=postgresql://user:pass@localhost:5432/frontwing
   REDIS_URL=redis://localhost:6379/0
   ```

4. Run the Dev Server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
