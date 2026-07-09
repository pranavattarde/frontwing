from abc import ABC, abstractmethod
from typing import Dict, Any, List

# =====================================================================
# 1. Base Loader & RAG Sources Loaders
# =====================================================================

class BaseLoader(ABC):
    """Abstract base class for modular knowledge loaders."""
    
    @abstractmethod
    def load(self) -> List[Dict[str, Any]]:
        """Loads and returns list of document dictionaries containing id, source, and content."""
        pass


class FIASportingLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "sporting_rules_1",
                "source": "FIA Sporting Regulations",
                "content": "Article 40.8: During safety car periods, all cars must reduce speed to the safety car delta profile. Overtaking is strictly prohibited unless directed by race control."
            },
            {
                "id": "sporting_rules_2",
                "source": "FIA Sporting Regulations",
                "content": "Article 16.3: Driving offenses resulting in safety hazard or track deflection warnings will yield grid penalty deductions or time penalties between 5 to 10 seconds."
            }
        ]


class FIATechnicalLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "technical_rules_1",
                "source": "FIA Technical Regulations",
                "content": "Article 3.5: Aerodynamic body deflection restrictions dictate rear wings slot gap deflection limits are strictly governed at 85mm spacing max."
            },
            {
                "id": "technical_rules_2",
                "source": "FIA Technical Regulations",
                "content": "Article 5.1: Minimum car weight chassis limitations require the car to weigh no less than 798kg without fuel at all points during the Grand Prix session."
            }
        ]


class CircuitNotesLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "circuit_spielberg",
                "source": "Circuit Notes",
                "content": "Spielberg (Red Bull Ring): High-altitude circuit located at 677 meters. Turn 3 uphill zone triggers heavy lockup risks due to wind gusts. Speed traps are measured in DRS Zone 1."
            }
        ]


class HistoricGPLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "historic_aut_2024",
                "source": "Historic GP Reports",
                "content": "2024 Austrian GP: Verstappen and Norris collided on Lap 64 while fighting for the lead. George Russell won, and Carlos Sainz recovered to finish P3 ahead of Piastri."
            }
        ]


class TyreStrategyLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "tyre_deg_rates",
                "source": "Tyre Strategy Articles",
                "content": "Compound Wear Characteristics: Soft tyres (optimal length 18 laps) offer rapid heat cycle but degrade at 0.12 s/lap. Mediums run 26 laps, Hards run 34 laps with 0.05 s/lap wear slopes."
            }
        ]


class TrackCharacteristicsLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "track_traction",
                "source": "Track Characteristics",
                "content": "Traction Limits: Racetracks with high traction demands (like Spielberg exit zones) accelerate rear tyre thermal degradation under load."
            }
        ]


class WeatherNotesLoader(BaseLoader):
    def load(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "weather_conditions",
                "source": "Weather Notes",
                "content": "Temperature Variables: High track temperatures (>40C) induce blistering on tyre compounds, while cooler headwinds enhance aerodynamic downforce stabilization."
            }
        ]


# =====================================================================
# 2. Knowledge Engine Index Search
# =====================================================================

class KnowledgeEngine:
    """RAG Search Engine loading documents and running search relevance indexes."""
    
    def __init__(self):
        self.loaders: List[BaseLoader] = [
            FIASportingLoader(),
            FIATechnicalLoader(),
            CircuitNotesLoader(),
            HistoricGPLoader(),
            TyreStrategyLoader(),
            TrackCharacteristicsLoader(),
            WeatherNotesLoader()
        ]
        self.documents: List[Dict[str, Any]] = []
        self._initialize_index()
        
    def _initialize_index(self):
        for loader in self.loaders:
            self.documents.extend(loader.load())
            
    def retrieve(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Performs basic RAG string match keyword indexing query."""
        words = query.lower().split()
        scored_docs = []
        
        for doc in self.documents:
            score = 0
            content_lower = doc["content"].lower()
            source_lower = doc["source"].lower()
            
            for word in words:
                if len(word) > 2:  # ignore small prepositions
                    if word in content_lower:
                        score += content_lower.count(word)
                    if word in source_lower:
                        score += 5  # Source matches get higher weight
                        
            if score > 0:
                scored_docs.append((score, doc))
                
        # Sort by relevance score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        results = [doc for _, doc in scored_docs[:limit]]
        # Fallback to general documents if no keyword matches
        if not results:
            results = self.documents[:limit]
            
        return results


# Global RAG Instance
rag_knowledge = KnowledgeEngine()


# =====================================================================
# Backward Compatibility Placeholders for Sprint 3
# =====================================================================

class CircuitKnowledgePlaceholder:
    def query_circuit_layout(self, circuit_id: str) -> Dict[str, Any]:
        return {
            "circuit_id": circuit_id,
            "length_km": 4.318,
            "turns_count": 10,
            "drs_zones_count": 3
        }

class FIARegulationsPlaceholder:
    def retrieve_sporting_rule(self, term: str) -> List[Dict[str, Any]]:
        return [{
            "article": "Article 40.8",
            "title": "Safety Car Procedures",
            "content": "All cars must maintain speed delta."
        }]

class HistoricalArticlesPlaceholder:
    def search_historical_events(self, year: int, circuit_id: str) -> List[Dict[str, Any]]:
        return [{
            "year": year,
            "circuit_id": circuit_id,
            "headline": "Austrian GP George Russell wins after Norris-Verstappen crash."
        }]

class TechnicalRegulationsPlaceholder:
    def verify_technical_limit(self, term: str) -> Dict[str, Any]:
        return {
            "section": "Article 3.5 Aerodynamic Deflections",
            "limit": "85mm maximum spacing."
        }

class RaceNotesPlaceholder:
    def get_event_debrief_notes(self, session_id: str) -> List[Dict[str, Any]]:
        return [{
            "session_id": session_id,
            "note": "Turn 3 uphill lockup risk under wind gusts."
        }]

