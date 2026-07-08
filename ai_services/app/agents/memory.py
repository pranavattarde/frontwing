from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

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


class InMemoryConversationMemory(BaseConversationMemory):
    """In-memory thread storage for F1 sessions context retrieval."""
    
    def __init__(self):
        # Maps conversation_id -> list of message logs
        self._store: Dict[str, List[Dict[str, Any]]] = {}
        
    def save_message(self, conversation_id: str, question: str, answer: str, context: Dict[str, Any]) -> None:
        if conversation_id not in self._store:
            self._store[conversation_id] = []
        self._store[conversation_id].append({
            "question": question,
            "answer": answer,
            "context": context
        })
        
    def get_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        return self._store.get(conversation_id, [])
        
    def resolve_context(self, conversation_id: str, question: str) -> Dict[str, Any]:
        history = self.get_history(conversation_id)
        resolved = {
            "session_id": None,
            "driver_id": None,
            "comparative_driver_id": None,
            "lap_number": None
        }
        
        if not history:
            return resolved
            
        # Parse history backwards to find most recent context values
        for exchange in reversed(history):
            past_ctx = exchange.get("context", {})
            for k in resolved.keys():
                if resolved[k] is None and past_ctx.get(k) is not None:
                    resolved[k] = past_ctx[k]
                    
        # Apply logic for relative pronouns
        q_lower = question.lower()
        
        # 1. Resolve Driver / Team references
        if "ferrari" in q_lower or "sainz" in q_lower or "leclerc" in q_lower:
            resolved["driver_id"] = "sainz"
        elif "mclaren" in q_lower or "piastri" in q_lower or "norris" in q_lower:
            resolved["driver_id"] = "piastri"
        elif "red bull" in q_lower or "verstappen" in q_lower or "perez" in q_lower:
            resolved["driver_id"] = "verstappen"
            
        # 2. Resolve Lap references (e.g. "what about lap 42")
        if "lap" in q_lower:
            import re
            lap_match = re.search(r"lap\s+(\d+)", q_lower)
            if lap_match:
                resolved["lap_number"] = int(lap_match.group(1))
                
        # 3. Resolve "same race" or "compare this"
        if "compare this" in q_lower or "what about" in q_lower or "same race" in q_lower:
            # Session is preserved by default from resolved scan
            pass
            
        return resolved


# Global instance of memory tracker
conversation_memory = InMemoryConversationMemory()
