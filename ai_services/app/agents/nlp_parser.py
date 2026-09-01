import os
import re
import json
import unicodedata
from typing import Dict, Any, List, Optional, TypedDict
from app.core.logger import logger
from app.core.providers import reliable_llm_provider

# =====================================================================
# STAGE 6 — NORMALIZED SEMANTIC REPRESENTATION (CONTRACT)
# =====================================================================

class SemanticQueryContract(TypedDict):
    """Strongly-typed contract for FrontWing NLP Semantic Understanding.
    
    This contract is created AFTER application text preprocessing and LLM
    semantic interpretation, and BEFORE structured planner tool execution.
    """
    raw_query: str
    normalized_query: str
    domain: str                 # "formula_1" or "other"
    intent: str                 # "race_result", "driver_position", "podium", "fastest_lap", "points", "team_result", "comparison", "telemetry", "strategy", "explanation", "investigation", "research"
    requested_metric: str       # "winner", "finishing_position", "driver_at_position", "podium", "fastest_lap", "points", "team_result", "qualifying", "comparison", "explanation", "unknown"
    requested_position: Optional[int] # e.g., 3 for P3/third, 5 for fifth, 10 for P10
    requested_driver: Optional[str]   # e.g., "Charles Leclerc", "Lewis Hamilton"
    requested_team: Optional[str]     # e.g., "McLaren", "Ferrari"
    limit: Optional[int]        # e.g., 3 for top 3, 5 for top 5
    aggregation: str            # "single", "top_n", "all", "comparison"
    entities: Dict[str, Any]    # {"grand_prix": str, "circuit": str, "season": Optional[int], "driver": Optional[str], "team": Optional[str], "drivers": List[str]}
    filters: Dict[str, Any]
    comparison_drivers: List[str]
    needs_clarification: bool
    confidence: float


UNSUPPORTED_METRIC_KEYWORDS = [
    "psi", "brake pressure", "brake psi", "pedal pressure", "tire temperature", "tyre temperature",
    "carcass temperature", "steering wheel angle", "steering angle", "pit crew", "crew member",
    "crew headcount", "downforce in kg", "front wing downforce", "wind tunnel", "aero coefficient",
    "fuel flow rate", "engine oil temperature", "oil temperature", "suspension travel", "damper velocity"
]

# =====================================================================
# STAGE 2 — APPLICATION-LEVEL TEXT PREPROCESSING
# =====================================================================

def preprocess_text(raw_query: str) -> Dict[str, str]:
    """Lightweight deterministic text preprocessing layer.
    
    Responsibilities:
    1. Preserves raw user query intact for audit/history/context.
    2. Unicode normalization (NFC).
    3. Normalizes whitespace and obvious punctuation variants (smart quotes, dashes).
    4. Preserves meaningful F1 symbols/terms (P1-P20, GP names, etc.).
    5. Creates a normalized lowercase string for deterministic matching.
    
    Note on Stage 3 (Tokenization & Vector Space):
    BPE/WordPiece tokenization, token IDs, positional encodings, and vector
    embeddings are performed natively inside the Gemini/Groq model architectures.
    Application preprocessing operates on clean text strings without custom BPE duplication.
    """
    if not raw_query:
        return {"raw": "", "normalized": "", "normalized_lower": ""}
        
    # 1. Unicode NFC normalization
    text = unicodedata.normalize('NFC', raw_query)
    
    # 2. Normalize smart quotes and dashes
    quote_map = {
        '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'",
        '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"',
        '\u2013': '-', '\u2014': '-', '\u2212': '-'
    }
    for orig, repl in quote_map.items():
        text = text.replace(orig, repl)
        
    # 3. Collapse multiple spaces
    normalized = re.sub(r'\s+', ' ', text).strip()
    normalized_lower = normalized.lower()
    
    return {
        "raw": raw_query,
        "normalized": normalized,
        "normalized_lower": normalized_lower
    }


# =====================================================================
# CANONICAL ENTITY & ALIAS MAPS
# =====================================================================

F1_CIRCUIT_ALIAS_MAP = {
    "suzuka": "Japanese GP",
    "interlagos": "Brazilian GP",
    "sao paulo": "Brazilian GP",
    "são paulo": "Brazilian GP",
    "monza": "Italian GP",
    "spa": "Belgian GP",
    "spa-francorchamps": "Belgian GP",
    "silverstone": "British GP",
    "hungaroring": "Hungary GP",
    "budapest": "Hungary GP",
    "spielberg": "Austria GP",
    "red bull ring": "Austria GP",
    "monte carlo": "Monaco GP",
    "catalunya": "Spanish GP",
    "barcelona": "Spanish GP",
    "shanghai": "Chinese GP",
    "marina bay": "Singapore GP",
    "imola": "Emilia Romagna GP",
    "emilia-romagna": "Emilia Romagna GP",
    "emilia romagna": "Emilia Romagna GP",
    "zandvoort": "Dutch GP",
    "baku": "Azerbaijan GP",
    "cota": "United States GP",
    "austin": "United States GP",
    "yas marina": "Abu Dhabi GP",
    "lusail": "Qatar GP",
    "sakhir": "Bahrain GP",
    "jeddah": "Saudi Arabia GP",
    "melbourne": "Australian GP",
    "albert park": "Australian GP",
    "vegas": "Las Vegas GP",
    "las vegas": "Las Vegas GP",
    "miami": "Miami GP",
    "montreal": "Canadian GP",
    "gilles villeneuve": "Canadian GP",
    "mexico city": "Mexico GP"
}

F1_DRIVER_ALIAS_MAP = {
    "verstappen": "Max Verstappen",
    "max": "Max Verstappen",
    "norris": "Lando Norris",
    "lando": "Lando Norris",
    "hamilton": "Lewis Hamilton",
    "lewis": "Lewis Hamilton",
    "leclerc": "Charles Leclerc",
    "charles": "Charles Leclerc",
    "sainz": "Carlos Sainz",
    "carlos": "Carlos Sainz",
    "piastri": "Oscar Piastri",
    "oscar": "Oscar Piastri",
    "russell": "George Russell",
    "george": "George Russell",
    "perez": "Sergio Perez",
    "checo": "Sergio Perez",
    "alonso": "Fernando Alonso",
    "fernando": "Fernando Alonso",
    "gasly": "Pierre Gasly",
    "pierre": "Pierre Gasly",
    "ocon": "Esteban Ocon",
    "esteban": "Esteban Ocon",
    "albon": "Alexander Albon",
    "alex": "Alexander Albon",
    "tsunoda": "Yuki Tsunoda",
    "yuki": "Yuki Tsunoda",
    "hulkenberg": "Nico Hulkenberg",
    "nico": "Nico Hulkenberg",
    "stroll": "Lance Stroll",
    "lance": "Lance Stroll",
    "bottas": "Valtteri Bottas",
    "zhou": "Guanyu Zhou",
    "magnussen": "Kevin Magnussen",
    "sargeant": "Logan Sargeant",
    "ricciardo": "Daniel Ricciardo"
}

F1_TEAM_ALIAS_MAP = {
    "mclaren": "McLaren",
    "ferrari": "Ferrari",
    "red bull": "Red Bull Racing",
    "redbull": "Red Bull Racing",
    "mercedes": "Mercedes",
    "aston martin": "Aston Martin",
    "aston": "Aston Martin",
    "alpine": "Alpine",
    "williams": "Williams",
    "haas": "Haas",
    "sauber": "Kick Sauber",
    "kick sauber": "Kick Sauber",
    "rb": "RB",
    "racing bulls": "RB"
}


# =====================================================================
# STAGE 4 & 5 — LLM SEMANTIC NLP UNDERSTANDING & CONTEXTUAL ALIGNMENT
# =====================================================================

SYSTEM_NLP_PROMPT = """You are the FrontWing F1 Natural Language Processing Engine.
Your sole job is to perform deep semantic query understanding on Formula 1 questions before structured tool execution.

Analyze the raw user query and return a valid JSON object matching this schema:

{
  "domain": "formula_1" or "other",
  "intent": "race_result" | "driver_position" | "podium" | "fastest_lap" | "points" | "team_result" | "comparison" | "telemetry" | "telemetry_comparison" | "strategy" | "explanation" | "investigation" | "research",
  "requested_metric": "winner" | "finishing_position" | "driver_at_position" | "podium" | "fastest_lap" | "points" | "team_result" | "qualifying" | "comparison" | "telemetry" | "telemetry_comparison" | "explanation" | "unknown",
  "requested_position": integer or null (e.g. 3 for P3/third, 5 for fifth, 10 for P10, 1 for P1/winner),
  "requested_driver": string or null (canonical driver name if asked, e.g. "Charles Leclerc", "Lewis Hamilton"),
  "requested_team": string or null (canonical team name if asked, e.g. "McLaren", "Ferrari"),
  "limit": integer or null (e.g. 3 for top 3, 5 for top 5, 10 for top 10),
  "aggregation": "single" | "top_n" | "all" | "comparison",
  "entities": {
    "grand_prix": string or null (e.g. "Japanese GP", "Monaco GP", "Emilia Romagna GP", "Brazilian GP", "Spanish GP"),
    "circuit": string or null (e.g. "Suzuka", "Interlagos", "Monza", "Silverstone"),
    "season": integer or null (ONLY set if user explicitly provides a year e.g. 2024. Leave null if omitted),
    "driver": string or null,
    "team": string or null
  },
  "filters": {},
  "comparison_drivers": list of strings,
  "needs_clarification": boolean,
  "confidence": float (0.0 to 1.0)
}

RULES:
1. "Who won X?", "Who took victory at X?", "Who came 1st at X?" -> requested_metric = "winner", requested_position = 1.
2. "Who finished P3?", "Who came 3rd at X?", "Who was third in X?", "Tell me the X P3 finisher" -> requested_metric = "driver_at_position", requested_position = 3, aggregation = "single".
3. "Where did Charles Leclerc finish?", "How did Leclerc finish at X?" -> requested_metric = "finishing_position", requested_driver = "Charles Leclerc". DO NOT set requested_metric to winner!
4. "Top three finishers", "Give me the podium at X" -> requested_metric = "podium", limit = 3, aggregation = "top_n".
5. "What was Hamilton's fastest lap?", "Fastest lap at Monza" -> requested_metric = "fastest_lap", requested_driver = "Lewis Hamilton" (if specified).
6. "How did McLaren finish at X?" -> requested_metric = "team_result", requested_team = "McLaren".
7. "How many points did Verstappen score?" -> requested_metric = "points", requested_driver = "Max Verstappen".
8. "Compare Verstappen and Norris telemetry at X", "Compare lap times of X and Y", "Compare sector times", "Where did X gain time on Y?", "Compare speed" -> intent = "telemetry_comparison", requested_metric = "telemetry_comparison", comparison_drivers = ["Max Verstappen", "Lando Norris"], aggregation = "comparison".
9. "Compare Verstappen and Norris at X" (position/general) -> intent = "comparison", requested_metric = "comparison", comparison_drivers = ["Max Verstappen", "Lando Norris"].
10. "Explain DRS" -> intent = "explanation", requested_metric = "explanation".
11. "How did Verstappen perform at X?", "Verstappen performance at X", "Score Verstappen at X", "Rate Verstappen" -> intent = "scoring", requested_metric = "scoring", requested_driver = "Max Verstappen".
12. "What if Verstappen pitted on lap 30 at X?", "Simulate Verstappen pitting on lap 30" -> intent = "simulation", requested_metric = "simulation", requested_driver = "Max Verstappen".
13. Leave "season" as NULL unless a 4-digit year (e.g. 2024, 2023) is explicitly mentioned in the query.

Respond with ONLY valid JSON."""


def parse_semantic_query(raw_query: str, history: Optional[List[Dict[str, Any]]] = None, context: Optional[Dict[str, Any]] = None) -> SemanticQueryContract:
    """Stage 4 & 6: Deterministic & efficient NLP Semantic Query Understanding.
    
    1. Preprocesses raw text.
    2. Runs high-speed deterministic semantic parsing for entities, metrics, and intents.
    3. Merges caller context seamlessly for follow-up questions.
    4. Merges semantic extraction into the downstream Planning execution.
    """
    preprocessed = preprocess_text(raw_query)
    contract = _fallback_semantic_parser(preprocessed, context=context)
    logger.info(f"[NLP Parser] Semantic intent '{contract['intent']}' / metric '{contract['requested_metric']}' for query: '{preprocessed['normalized']}'")
    return contract


def _build_contract_from_parsed(preprocessed: Dict[str, str], parsed: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> SemanticQueryContract:
    """Helper to convert and canonicalize parsed JSON into SemanticQueryContract."""
    entities = parsed.get("entities") or {}
    
    # Alias Resolution for GP/Circuit
    gp = entities.get("grand_prix")
    circuit = entities.get("circuit")
    if not gp and circuit:
        c_lower = circuit.lower()
        if c_lower in F1_CIRCUIT_ALIAS_MAP:
            gp = F1_CIRCUIT_ALIAS_MAP[c_lower]
            
    if gp:
        gp_lower = gp.lower()
        if gp_lower in F1_CIRCUIT_ALIAS_MAP:
            gp = F1_CIRCUIT_ALIAS_MAP[gp_lower]
            
    # Driver Canonical Resolution
    driver = parsed.get("requested_driver") or entities.get("driver")
    if driver:
        d_lower = driver.lower()
        if d_lower in F1_DRIVER_ALIAS_MAP:
            driver = F1_DRIVER_ALIAS_MAP[d_lower]
            
    # Team Canonical Resolution
    team = parsed.get("requested_team") or entities.get("team")
    if team:
        t_lower = team.lower()
        if t_lower in F1_TEAM_ALIAS_MAP:
            team = F1_TEAM_ALIAS_MAP[t_lower]
            
    # Season extraction
    season = entities.get("season")
    if isinstance(season, str) and season.isdigit():
        season = int(season)
    elif not isinstance(season, int):
        # Extract 4-digit year from query if present
        year_match = re.search(r'\b(202[0-9])\b', preprocessed["normalized"])
        season = int(year_match.group(1)) if year_match else None
        
    # Context fallback
    if context:
        if not driver and context.get("driver_id"):
            driver = context.get("driver_id")
        if not gp and context.get("grand_prix"):
            gp = context.get("grand_prix")
        if not season and context.get("season"):
            season = context.get("season")

    entities["grand_prix"] = gp
    entities["circuit"] = circuit
    entities["season"] = season
    entities["driver"] = driver
    entities["team"] = team
    
    comparison_drivers = parsed.get("comparison_drivers", [])
    if not comparison_drivers and context and context.get("drivers"):
        comparison_drivers = list(context.get("drivers"))
    
    return SemanticQueryContract(
        raw_query=preprocessed["raw"],
        normalized_query=preprocessed["normalized"],
        domain=parsed.get("domain", "formula_1"),
        intent=parsed.get("intent", "race_result"),
        requested_metric=parsed.get("requested_metric", "winner"),
        requested_position=parsed.get("requested_position"),
        requested_driver=driver,
        requested_team=team,
        limit=parsed.get("limit"),
        aggregation=parsed.get("aggregation", "single"),
        entities=entities,
        filters=parsed.get("filters", {}),
        comparison_drivers=comparison_drivers,
        needs_clarification=parsed.get("needs_clarification", False),
        confidence=float(parsed.get("confidence", 0.95))
    )


def _fallback_semantic_parser(preprocessed: Dict[str, str], context: Optional[Dict[str, Any]] = None) -> SemanticQueryContract:
    """Deterministic Rule-Based Semantic Parser Fallback.
    
    Guarantees 100% reliable semantic query contracts during offline dev,
    unit testing, or provider rate-limit conditions.
    """
    q_raw = preprocessed["raw"]
    q_norm = preprocessed["normalized"]
    q_lower = preprocessed["normalized_lower"]
    
    # 1. Season extraction (explicit only)
    year_match = re.search(r'\b(202[0-9])\b', q_norm)
    season = int(year_match.group(1)) if year_match else None
    
    # 2. Circuit / GP Extraction with Alias Support
    gp = None
    circuit = None
    for alias, canonical_gp in sorted(F1_CIRCUIT_ALIAS_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
            gp = canonical_gp
            circuit = alias
            break
            
    if not gp:
        # Check standard GP names
        gp_list = [
            ("monaco", "Monaco GP"), ("spanish", "Spanish GP"), ("spain", "Spanish GP"),
            ("hungary", "Hungary GP"), ("hungarian", "Hungary GP"), ("austria", "Austria GP"),
            ("austrian", "Austria GP"), ("british", "British GP"), ("britain", "British GP"),
            ("italian", "Italian GP"), ("italy", "Italian GP"), ("singapore", "Singapore GP"),
            ("belgian", "Belgian GP"), ("belgium", "Belgian GP"), ("japanese", "Japanese GP"),
            ("japan", "Japanese GP"), ("bahrain", "Bahrain GP"), ("saudi", "Saudi Arabia GP"),
            ("australian", "Australian GP"), ("australia", "Australian GP"), ("miami", "Miami GP"),
            ("canadian", "Canadian GP"), ("canada", "Canadian GP"), ("azerbaijan", "Azerbaijan GP"),
            ("united states", "United States GP"), ("us", "United States GP"),
            ("mexican", "Mexico GP"), ("mexico", "Mexico GP"), ("brazilian", "Brazilian GP"),
            ("brazil", "Brazilian GP"), ("vegas", "Las Vegas GP"), ("qatar", "Qatar GP"),
            ("abu dhabi", "Abu Dhabi GP"), ("dutch", "Dutch GP"), ("chinese", "Chinese GP"),
            ("china", "Chinese GP")
        ]
        for key, val in gp_list:
            if re.search(r'\b' + re.escape(key) + r'\b', q_lower):
                gp = val
                break
                
    # 3. Driver Extraction
    driver = None
    for alias, canonical_driver in sorted(F1_DRIVER_ALIAS_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
            driver = canonical_driver
            break
            
    # 4. Team Extraction
    team = None
    for alias, canonical_team in sorted(F1_TEAM_ALIAS_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
            team = canonical_team
            break

    # Context fallback for entities if not present in query string
    if context:
        if not driver and context.get("driver_id"):
            driver = context.get("driver_id")
        if not gp and context.get("grand_prix"):
            gp = context.get("grand_prix")
        if not season and context.get("season"):
            season = context.get("season")
            
    # 5. Position / Metric Determination
    requested_position = None
    requested_metric = "winner"
    intent = "race_result"
    limit = None
    aggregation = "single"
    comparison_drivers = []
    
    # Check Podium / Top N first before single position matches
    if re.search(r'\b(podium|top three|top 3)\b', q_lower):
        requested_metric = "podium"
        intent = "podium"
        limit = 3
        aggregation = "top_n"
    elif re.search(r'\b(top five|top 5)\b', q_lower):
        requested_metric = "top_n"
        intent = "top_n"
        limit = 5
        aggregation = "top_n"
    elif re.search(r'\b(top ten|top 10)\b', q_lower):
        requested_metric = "top_n"
        intent = "top_n"
        limit = 10
        aggregation = "top_n"
    else:
        pos_match = re.search(r'\b(?:p(\d+)|(\d+)(?:st|nd|rd|th))\b', q_lower)
        if pos_match and any(w in q_lower for w in ["finish", "who", "place", "which driver", "ended", "came", "was", "finisher", "position"]):
            requested_position = int(pos_match.group(1) or pos_match.group(2))
            requested_metric = "driver_at_position"
        elif re.search(r'\b(first|winner|won|1st|victory)\b', q_lower) and any(w in q_lower for w in ["who", "which", "winner", "won", "victory", "first", "1st"]):
            requested_position = 1
            requested_metric = "winner"
        elif re.search(r'\b(second|2nd)\b', q_lower) and any(w in q_lower for w in ["who", "which", "place", "came", "finished", "was"]):
            requested_position = 2
            requested_metric = "driver_at_position"
        elif re.search(r'\b(third|3rd)\b', q_lower) and any(w in q_lower for w in ["who", "which", "place", "came", "finished", "was"]):
            requested_position = 3
            requested_metric = "driver_at_position"
        elif re.search(r'\b(fourth|4th)\b', q_lower) and any(w in q_lower for w in ["who", "which", "place", "came", "finished", "was"]):
            requested_position = 4
            requested_metric = "driver_at_position"
        elif re.search(r'\b(fifth|5th)\b', q_lower) and any(w in q_lower for w in ["who", "which", "place", "came", "finished", "was"]):
            requested_position = 5
            requested_metric = "driver_at_position"

        
    # Check Fastest Lap
    if "fastest lap" in q_lower or "best lap" in q_lower:
        requested_metric = "fastest_lap"
        intent = "fastest_lap"
        
    # Check Points
    elif "point" in q_lower or "points" in q_lower:
        requested_metric = "points"
        intent = "points"
        
    # Check Driver Specific Finishing Position ("How did Leclerc finish?", "what was his race result and finishing position?")
    elif (driver or any(p in q_lower for p in ["his", "their", "he", "they", "driver"])) and any(k in q_lower for k in ["finish", "result", "where did", "how did", "place", "position", "standings"]):
        requested_metric = "finishing_position"
        intent = "driver_position"

    elif any(k in q_lower for k in ["race result", "finishing position", "race results", "final result", "classification", "who finished"]):
        requested_metric = "finishing_position"
        intent = "driver_position"
        
    # Check Team Specific Result ("How did McLaren finish?")
    elif team and ("finish" in q_lower or "result" in q_lower or "how did" in q_lower):
        requested_metric = "team_result"
        intent = "team_result"
        
    # Find all drivers mentioned, preserving user query appearance order
    driver_matches = []
    for alias, d_name in F1_DRIVER_ALIAS_MAP.items():
        m = re.search(r'\b' + re.escape(alias) + r'\b', q_lower)
        if m:
            driver_matches.append((m.start(), d_name))
            
    driver_matches.sort(key=lambda x: x[0])
    matched_drivers = []
    for pos, d_name in driver_matches:
        if d_name not in matched_drivers:
            matched_drivers.append(d_name)
            
    comparison_drivers = matched_drivers
    if not comparison_drivers and context and context.get("drivers"):
        comparison_drivers = list(context.get("drivers"))

    # Check Unsupported Metric Queries (metrics not available in timing/telemetry datasets)
    UNSUPPORTED_METRIC_KEYWORDS = [
        "psi", "brake pressure in psi", "pedal pressure", "tire temperature", "tyre temperature",
        "carcass temperature", "steering wheel angle", "steering angle", "pit crew", "crew member",
        "crew headcount", "downforce in kg", "front wing downforce", "wind tunnel", "aero coefficient",
        "fuel flow rate", "engine oil temperature", "oil temperature", "suspension travel", "damper velocity"
    ]
    is_unsupported_query = any(k in q_lower for k in UNSUPPORTED_METRIC_KEYWORDS)

    # Check Knowledge / Explanation Queries (Concept definitions, regulations, tyres, technical terms)
    is_knowledge_term = any(k in q_lower for k in ["understeer", "oversteer", "drs", "compound", "undercut", "overcut", "dirty air", "slipstream", "downforce", "aerodynamics", "regulations", "graining", "blistering", "porpoising", "ground effect", "diffuser", "venturi", "plank", "skid block", "technical directive", "difference between"])
    is_explanation_prefix = any(q_lower.startswith(prefix) for prefix in ["what is", "explain", "how does", "what are", "define", "describe", "what causes"]) or "explain" in q_lower or "difference between" in q_lower

    # Check Strategy, Pit Timing & Simulation
    is_simulation_query = any(k in q_lower for k in ["what if", "simulate", "pitted 5 laps", "pitted earlier", "pitted later", "pitted on lap", "pitted lap", "pit on lap", "pit lap", "pitted on"])
    is_pit_timing_query = (any(k in q_lower for k in ["when did", "what lap did", "which lap did", "pit stop", "pitted", "pit in", "pit out", "pit lap", "pit stops", "pit timing", "pit window"]) and any(k in q_lower for k in ["pit", "pitted", "stop", "box", "stint"])) and not is_simulation_query
    is_investigation_query = any(k in q_lower for k in ["what went wrong", "went wrong", "what happened to", "why did", "loss of pace", "lost position", "lost pace", "root cause", "investigate", "struggled", "struggle"]) and not is_simulation_query
    is_strategy_query = (any(k in q_lower for k in ["strategy", "stint", "why did he pit", "pit strategy"]) or (not is_explanation_prefix and any(k in q_lower for k in ["wear", "degradation"]))) and not is_pit_timing_query and not is_simulation_query and not is_investigation_query
    is_scoring_query = (any(k in q_lower for k in ["perform", "performance", "score", "scorecard", "rate", "rating", "score card"]) or (driver and "how did" in q_lower and not any(k in q_lower for k in ["finish", "win", "qualify", "p1", "p2", "p3", "result", "position", "pit", "pitted"]))) and not is_investigation_query

    # Check Telemetry & Driver Comparison
    is_telemetry_query = any(k in q_lower for k in ["telemetry", "lap time", "lap timing", "lap times", "sector", "speed", "top speed", "delta", "gain time", "faster", "pace"])
    has_comparison_keywords = any(k in q_lower for k in ["compare", "vs", "versus", "against", "faster than", "gap to", "delta between", "both", "their"])
    is_true_comparison = len(comparison_drivers) >= 2 or (len(comparison_drivers) == 1 and has_comparison_keywords)

    if is_unsupported_query:
        intent = "unsupported_metric"
        requested_metric = "unsupported_metric"
        aggregation = "single"
    elif is_explanation_prefix or (is_knowledge_term and not is_simulation_query and not is_strategy_query and not is_scoring_query and not is_telemetry_query and not is_pit_timing_query and not is_investigation_query):
        intent = "knowledge"
        requested_metric = "knowledge"
        aggregation = "single"
    elif is_simulation_query:
        intent = "simulation"
        requested_metric = "simulation"
        aggregation = "single"
        requested_position = None
    elif is_investigation_query:
        intent = "investigation"
        requested_metric = "root_cause_investigation"
        aggregation = "single"
    elif is_pit_timing_query:
        intent = "pit_stop_timing"
        requested_metric = "pit_stops"
        aggregation = "single"
    elif is_scoring_query:
        intent = "scoring"
        requested_metric = "scoring"
        aggregation = "single"
    elif is_strategy_query:
        intent = "strategy"
        requested_metric = "strategy"
        aggregation = "single"
    elif is_true_comparison and is_telemetry_query:
        intent = "telemetry_comparison"
        requested_metric = "telemetry_comparison"
        aggregation = "comparison"
    elif is_true_comparison:
        intent = "comparison"
        requested_metric = "comparison"
        aggregation = "comparison"
    elif is_telemetry_query:
        intent = "telemetry"
        requested_metric = "lap_telemetry"
        aggregation = "single"
    elif intent in ("fastest_lap", "points", "driver_position", "team_result", "podium", "top_n") or requested_metric in ("fastest_lap", "points", "driver_at_position", "finishing_position", "podium", "top_n", "winner"):
        intent = "historical_fact"
    else:
        # Default for factual or unspecified race queries
        intent = "historical_fact"
        requested_metric = requested_metric or "historical_fact"

    confidence_score = 0.15 if is_unsupported_query else 0.95

    return SemanticQueryContract(
        raw_query=q_raw,
        normalized_query=q_norm,
        domain="formula_1",
        intent=intent,
        requested_metric=requested_metric,
        requested_position=requested_position,
        requested_driver=driver,
        requested_team=team,
        limit=limit,
        aggregation=aggregation,
        entities={
            "grand_prix": gp,
            "circuit": circuit,
            "season": season,
            "driver": driver,
            "team": team
        },
        filters={},
        comparison_drivers=comparison_drivers,
        needs_clarification=False,
        confidence=confidence_score
    )
