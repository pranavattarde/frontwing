# FrontWing Sprint Task List: NLP-First Query Understanding Pipeline Real-World Validation

## Objective
Validate the real-world runtime flow for arbitrary unseen natural language F1 queries across the full stack: `User Question` → `Application Preprocessing` → `LLM Semantic Parser` → `SemanticQueryContract` → `FrontWing Planner` → `Tool Execution` → `SessionResolver/EntityResolver` → `PostgreSQL/FastF1` → `Evidence Retrieval` → `Evidence-First Synthesis` → `Express Gateway` → `React Frontend`.

## Checklist
- [x] STAGE 1 — Raw Text Preservation (`nlp_parser.py`)
- [x] STAGE 2 — Application Preprocessing (`preprocess_text` in `nlp_parser.py`)
- [x] STAGE 3 — LLM Tokenization & Embeddings (Natively handled by Gemini/Groq APIs)
- [x] STAGE 4 — LLM Semantic NLP Parser (`parse_semantic_query`)
- [x] STAGE 5 — Contextual Alignment & RAG Scope Boundary
- [x] STAGE 6 — Normalized Semantic Contract (`SemanticQueryContract`)
- [x] STAGE 7 — Structured Query Generation & Planner Integration (`plan_node` in `planner.py`)
- [x] STAGE 8 — Evidence-First Synthesis (`synthesize_node` in `planner.py`)
- [x] Real-World Runtime Validation (10 Unseen Queries executed via POST `/engineer/query` API)
- [x] Critical Fallback Check (Verified LLM vs Fallback parser activation rules, HTTP 429 failover, controlled error outputs)
- [x] Frontend UI Verification (Verified via browser subagent: no infinite loading, no blank pages, no React exceptions)
- [x] Data Correctness Verification (Verified factual answers linked strictly to PostgreSQL `race_results_tool` and `historical_results_tool` evidence)
- [x] Build Verification: Express Backend `tsc` (0 errors), React Frontend Vite (`dist` built in 5.31s)
