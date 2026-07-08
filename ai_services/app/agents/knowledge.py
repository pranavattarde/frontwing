from abc import ABC, abstractmethod
from typing import Dict, Any, List

class CircuitKnowledgeInterface(ABC):
    """Abstract interface to look up circuit tracks details and layouts."""
    
    @abstractmethod
    def query_circuit_layout(self, circuit_id: str) -> Dict[str, Any]:
        """Retrieves turns counts, tracks lengths, and DRS zones allocations."""
        pass


class FIARegulationsInterface(ABC):
    """Abstract interface to look up sporting regulations and safety boundaries."""
    
    @abstractmethod
    def retrieve_sporting_rule(self, keyword: str) -> List[Dict[str, Any]]:
        """Retrieves articles related to safety cars, grid penalties, or sporting disputes."""
        pass


class HistoricalArticlesInterface(ABC):
    """Abstract interface to query previous F1 grand prix races summaries."""
    
    @abstractmethod
    def search_historical_events(self, year: int, circuit_id: str) -> List[Dict[str, Any]]:
        """Searches past reports detailing race overtakes or tire strategies."""
        pass


class TechnicalRegulationsInterface(ABC):
    """Abstract interface to look up FIA parameters and chassis compliance."""
    
    @abstractmethod
    def verify_technical_limit(self, sub_section: str) -> Dict[str, Any]:
        """Loads technical rules detailing minimum weight limits or wing dimensions."""
        pass


class RaceNotesInterface(ABC):
    """Abstract interface to query practice observations or team race alerts."""
    
    @abstractmethod
    def get_event_debrief_notes(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieves team comments or driver complaints logged during track sessions."""
        pass


# Concrete placeholder implementations (No RAG vector stores setup)
class CircuitKnowledgePlaceholder(CircuitKnowledgeInterface):
    def query_circuit_layout(self, circuit_id: str) -> Dict[str, Any]:
        return {
            "circuit_id": circuit_id,
            "turns": 10,
            "length_km": 4.318,
            "drs_zones": 3,
            "track_type": "Permanent racetrack"
        }

class FIARegulationsPlaceholder(FIARegulationsInterface):
    def retrieve_sporting_rule(self, keyword: str) -> List[Dict[str, Any]]:
        return [{
            "article": "Section 40.8",
            "title": "Safety Car Procedures",
            "rule": "Safety car speed controls transit zones, and overtaking is strictly prohibited."
        }]

class HistoricalArticlesPlaceholder(HistoricalArticlesInterface):
    def search_historical_events(self, year: int, circuit_id: str) -> List[Dict[str, Any]]:
        return [{
            "year": 2024,
            "circuit_id": circuit_id,
            "headline": "Sainz battles tyre deg to recover P3 finishing Austrian GP"
        }]

class TechnicalRegulationsPlaceholder(TechnicalRegulationsInterface):
    def verify_technical_limit(self, sub_section: str) -> Dict[str, Any]:
        return {
            "section": "Article 3.5",
            "limit": "Max rear wing deflection constraints are governed at 85mm slot sizes."
        }

class RaceNotesPlaceholder(RaceNotesInterface):
    def get_event_debrief_notes(self, session_id: str) -> List[Dict[str, Any]]:
        return [{
            "session_id": session_id,
            "note": "Wind direction changed to headwinds at Turn 3, inducing lockup warnings."
        }]
