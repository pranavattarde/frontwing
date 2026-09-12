import os
from dotenv import load_dotenv

# Find and load .env file from ai_services directory or root directory
_base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_env_path = os.path.join(_base_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path, override=True)
else:
    load_dotenv(override=True)

# Synchronize LangSmith and LangChain environment variables
_ls_key = os.getenv("LANGCHAIN_API_KEY") or os.getenv("LANGSMITH_API_KEY") or ""
if _ls_key:
    os.environ["LANGCHAIN_API_KEY"] = _ls_key
    os.environ["LANGSMITH_API_KEY"] = _ls_key

_ls_tracing = os.getenv("LANGCHAIN_TRACING_V2") or os.getenv("LANGSMITH_TRACING") or "true"
if str(_ls_tracing).lower() in ("true", "1", "yes"):
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGSMITH_TRACING"] = "true"

_ls_proj = os.getenv("LANGCHAIN_PROJECT") or os.getenv("LANGSMITH_PROJECT") or "FrontWing"
_ls_proj = _ls_proj.strip("\"'")
os.environ["LANGCHAIN_PROJECT"] = _ls_proj
os.environ["LANGSMITH_PROJECT"] = _ls_proj

_ls_endpoint = os.getenv("LANGCHAIN_ENDPOINT") or os.getenv("LANGSMITH_ENDPOINT") or "https://api.smith.langchain.com"
os.environ["LANGCHAIN_ENDPOINT"] = _ls_endpoint
os.environ["LANGSMITH_ENDPOINT"] = _ls_endpoint


class Settings:
    """Enterprise configurations store for FrontWing AI services."""
    
    @property
    def GEMINI_API_KEY(self) -> str:
        return os.getenv("GEMINI_API_KEY", "")
        
    @property
    def GROQ_API_KEY(self) -> str:
        return os.getenv("GROQ_API_KEY", "")
        
    @property
    def DATABASE_URL(self) -> str:
        return os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/frontwing")
        
    @DATABASE_URL.setter
    def DATABASE_URL(self, val: str):
        os.environ["DATABASE_URL"] = val
        
    @property
    def REDIS_URL(self) -> str:
        return os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
    @REDIS_URL.setter
    def REDIS_URL(self, val: str):
        os.environ["REDIS_URL"] = val
        
    @property
    def OPENF1_BASE_URL(self) -> str:
        return os.getenv("OPENF1_BASE_URL", "https://api.openf1.org/v1")
        
    @property
    def ERGAST_BASE_URL(self) -> str:
        return os.getenv("ERGAST_BASE_URL", "https://ergast.com/api/f1")
        
    @property
    def LOG_LEVEL(self) -> str:
        return os.getenv("LOG_LEVEL", "INFO")
        
    @property
    def MODEL_PROVIDER(self) -> str:
        return os.getenv("MODEL_PROVIDER", "gemini")

    @property
    def GEMINI_MODEL(self) -> str:
        return os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    @property
    def GROQ_MODEL(self) -> str:
        return os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    @property
    def LLM_CACHE_ENABLED(self) -> bool:
        return os.getenv("LLM_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")

    @property
    def LANGCHAIN_TRACING_V2(self) -> bool:
        return os.getenv("LANGCHAIN_TRACING_V2", "false").lower() in ("true", "1", "yes")

    @property
    def LANGCHAIN_API_KEY(self) -> str:
        return os.getenv("LANGCHAIN_API_KEY", "")

    @property
    def LANGCHAIN_PROJECT(self) -> str:
        return os.getenv("LANGCHAIN_PROJECT", "FrontWing")

    @property
    def LANGCHAIN_ENDPOINT(self) -> str:
        return os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")

    def validate_or_raise(self) -> None:
        """Validates critical variables during app initialization."""
        critical_vars = {
            "DATABASE_URL": self.DATABASE_URL,
            "REDIS_URL": self.REDIS_URL
        }
        for name, value in critical_vars.items():
            if not value or not value.strip():
                raise ValueError(f"Required configuration variable '{name}' is missing or empty.")


# Global instance
settings = Settings()
