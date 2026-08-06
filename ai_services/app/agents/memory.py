import json
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from app.core.db import execute_query
from app.core.logger import logger

class BaseConversationMemory(ABC):
    """Abstract interface for storing and retrieving conversation history."""
    
    @abstractmethod
    def save_message(self, conversation_id: str, question: str, answer: str, context: Dict[str, Any]) -> None:
        """Saves a message exchange and its associated metadata/context."""
        pass
        
    @abstractmethod
    def get_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Retrieves past question/answer logs for a session."""
        pass
        
    @abstractmethod
    def resolve_context(self, conversation_id: str, question: str) -> Dict[str, Any]:
        """Analyzes historical context to resolve pronouns or missing session/driver details."""
        pass


class PostgresConversationMemory(BaseConversationMemory):
    """PostgreSQL-backed conversation storage and multi-turn context resolution engine."""
    
    def __init__(self):
        self._fallback_store: Dict[str, List[Dict[str, Any]]] = {}
        self._init_db_tables()
        
    def _init_db_tables(self):
        try:
            execute_query("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    conversation_id VARCHAR(255) NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT,
                    context JSONB,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_conversations_cid ON conversations(conversation_id);
            """)
        except Exception as e:
            logger.warning(f"[PostgresConversationMemory] DB table init warning (using in-memory fallback): {e}")

    def save_message(self, conversation_id: str, question: str, answer: str, context: Dict[str, Any]) -> None:
        """Saves message exchange into PostgreSQL database and fallback cache."""
        try:
            execute_query(
                """
                INSERT INTO conversations (conversation_id, question, answer, context)
                VALUES (%s, %s, %s, %s)
                """,
                (conversation_id, question, answer, json.dumps(context))
            )
        except Exception as e:
            logger.warning(f"[PostgresConversationMemory] DB save_message failed: {e}")

        if conversation_id not in self._fallback_store:
            self._fallback_store[conversation_id] = []
        self._fallback_store[conversation_id].append({
            "question": question,
            "answer": answer,
            "context": context
        })
        
    def get_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Retrieves past question/answer logs for a conversation thread."""
        try:
            rows = execute_query(
                """
                SELECT question, answer, context FROM conversations 
                WHERE conversation_id = %s 
                ORDER BY id ASC
                """,
                (conversation_id,),
                fetch=True
            )
            if rows:
                result = []
                for r in rows:
                    ctx = r["context"]
                    if isinstance(ctx, str):
                        ctx = json.loads(ctx)
                    result.append({
                        "question": r["question"],
                        "answer": r["answer"],
                        "context": ctx or {}
                    })
                return result
        except Exception as e:
            logger.warning(f"[PostgresConversationMemory] DB get_history failed: {e}")

        return self._fallback_store.get(conversation_id, [])
        
    def resolve_context(self, conversation_id: str, question: str) -> Dict[str, Any]:
        """Multi-turn context resolution engine that analyzes historical messages to extract

        accumulated entities, session_id, drivers, and intents.
        """
        history = self.get_history(conversation_id)
        
        past_session_id = None
        past_drivers = []
        past_team = None
        past_lap = None
        
        # 1. Harvest accumulated entities across previous turns in thread
        for exchange in history:
            past_ctx = exchange.get("context", {})
            if past_ctx.get("session_id") and not past_session_id:
                past_session_id = past_ctx["session_id"]
            if past_ctx.get("driver_id") and past_ctx["driver_id"] not in past_drivers:
                past_drivers.append(past_ctx["driver_id"])
            if past_ctx.get("comparative_driver_id") and past_ctx["comparative_driver_id"] not in past_drivers:
                past_drivers.append(past_ctx["comparative_driver_id"])
            if past_ctx.get("team") and not past_team:
                past_team = past_ctx["team"]
            if past_ctx.get("lap_number") and not past_lap:
                past_lap = past_ctx["lap_number"]

        from app.agents.planner import extract_entities
        current_entities = extract_entities(question)
        q_lower = question.lower()

        resolved_session_id = past_session_id or "2024_austria_gp_race"
        resolved_driver_id = past_drivers[-1] if past_drivers else None
        resolved_comparative_driver_id = None
        resolved_team = past_team
        resolved_lap = past_lap

        # Direct explicit entity overrides
        if current_entities.get("drivers"):
            new_drv = current_entities["drivers"][0]
            if resolved_driver_id and new_drv != resolved_driver_id:
                if resolved_driver_id not in past_drivers:
                    past_drivers.append(resolved_driver_id)
                resolved_comparative_driver_id = resolved_driver_id
                resolved_driver_id = new_drv
            else:
                resolved_driver_id = new_drv

        if current_entities.get("team"):
            resolved_team = current_entities["team"]

        if current_entities.get("grand_prix"):
            gp_norm = current_entities["grand_prix"]
            if gp_norm == "Monaco GP":
                resolved_session_id = "2024_monaco_gp_race"
            elif gp_norm == "British GP":
                resolved_session_id = "2024_british_gp_race"
            elif gp_norm == "Austria GP":
                resolved_session_id = "2024_austria_gp_race"

        # Conversational Follow-up Resolution Patterns:

        # Turn Pattern: "What about Verstappen?" / "What about [Driver]?"
        if "what about" in q_lower or "how about" in q_lower or "and " in q_lower:
            if current_entities.get("drivers"):
                target_drv = current_entities["drivers"][0]
                resolved_driver_id = target_drv
                if len(past_drivers) >= 1 and past_drivers[0] != target_drv:
                    resolved_comparative_driver_id = past_drivers[0]
            elif "ferrari" in q_lower:
                resolved_team = "Ferrari"
                resolved_driver_id = "sainz"

        # Turn Pattern: "Compare them." / "Compare"
        if "compare" in q_lower or "compare them" in q_lower or "versus" in q_lower:
            if len(past_drivers) >= 2:
                resolved_driver_id = past_drivers[0]
                resolved_comparative_driver_id = past_drivers[1]
            elif len(past_drivers) == 1 and resolved_driver_id:
                resolved_comparative_driver_id = past_drivers[0]

        # Turn Pattern: "Show telemetry." / "Telemetry"
        if "telemetry" in q_lower or "show telemetry" in q_lower:
            if not resolved_driver_id and past_drivers:
                resolved_driver_id = past_drivers[-1]
            if len(past_drivers) >= 2:
                resolved_driver_id = past_drivers[0]
                resolved_comparative_driver_id = past_drivers[1]

        return {
            "session_id": resolved_session_id,
            "driver_id": resolved_driver_id,
            "comparative_driver_id": resolved_comparative_driver_id,
            "team": resolved_team,
            "lap_number": resolved_lap,
            "past_drivers": past_drivers
        }


# Global instance of PostgreSQL conversation memory tracker
conversation_memory = PostgresConversationMemory()
InMemoryConversationMemory = PostgresConversationMemory
