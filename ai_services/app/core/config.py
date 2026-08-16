import os
from dotenv import load_dotenv

# Automatically load configuration
load_dotenv(override=True)


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
        return os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/frontwing")
        
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

    def validate_or_raise(self) -> None:
        """Validates critical variables during app initialization."""
        # Logs warning or raises if crucial params are completely blank
        critical_vars = {
            "DATABASE_URL": self.DATABASE_URL,
            "REDIS_URL": self.REDIS_URL
        }
        for name, value in critical_vars.items():
            if not value or not value.strip():
                raise ValueError(f"Required configuration variable '{name}' is missing or empty.")


# Global instance
settings = Settings()
