import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from ..core.logger import logger

class BaseCollector(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def collect(self, *args, **kwargs) -> Any:
        """Fetch raw data from external source."""
        pass

    @abstractmethod
    def validate(self, data: Any) -> bool:
        """Validate format, schema, and completeness of fetched data."""
        pass

    @abstractmethod
    def process_and_save(self, data: Any) -> Any:
        """Normalize data, remove duplicates, and commit to DB."""
        pass

    def run_with_retry(self, action, max_retries: int = 3, initial_delay: float = 1.0, *args, **kwargs):
        """Executes collector operations using exponential backoff retry logic."""
        retries = 0
        delay = initial_delay
        while retries < max_retries:
            try:
                start_time = time.time()
                result = action(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(f"[{self.name}] Action executed successfully in {duration:.2f}s")
                return result
            except Exception as e:
                retries += 1
                logger.warning(
                    f"[{self.name}] Execution failed (Attempt {retries}/{max_retries}): {e}. "
                    f"Retrying in {delay}s..."
                )
                if retries >= max_retries:
                    logger.error(f"[{self.name}] Max retries ({max_retries}) reached. Execution failed.")
                    raise e
                time.sleep(delay)
                delay *= 2  # Exponential backoff

    def deduplicate_records(self, new_records: List[Dict[str, Any]], existing_keys: set, unique_field: str) -> List[Dict[str, Any]]:
        """Filters out records whose unique key value matches previously processed records."""
        unique_records = []
        for record in new_records:
            val = record.get(unique_field)
            if val is not None and val not in existing_keys:
                unique_records.append(record)
                existing_keys.add(val)
        logger.info(f"[{self.name}] Deduplication complete. Output: {len(unique_records)}/{len(new_records)} unique records.")
        return unique_records
