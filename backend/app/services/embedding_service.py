import json
import numpy as np
from typing import List, Union

class EmbeddingService:
    @classmethod
    def generate_embedding(cls, text: str) -> List[float]:
        """
        Generates a vector embedding for the given text.
        For production, use a library like 'sentence-transformers'.
        Here we use a deterministic pseudo-random approach for the structure.
        """
        import random
        # Seed based on content to make it consistent for the same text
        seed = sum(ord(c) for c in (text or "")[:100]) if text else 42
        random.seed(seed)
        return [random.uniform(-1, 1) for _ in range(384)]

    @staticmethod
    def calculate_cosine_similarity(vec1: Union[List[float], str], vec2: Union[List[float], str]) -> float:
        """
        Calculates cosine similarity between two vectors.
        """
        if isinstance(vec1, str):
            try:
                vec1 = json.loads(vec1)
            except Exception:
                return 0.0
        if isinstance(vec2, str):
            try:
                vec2 = json.loads(vec2)
            except Exception:
                return 0.0

        if not vec1 or not vec2:
            return 0.0

        v1 = np.array(vec1, dtype=float)
        v2 = np.array(vec2, dtype=float)
        
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(np.dot(v1, v2) / (norm1 * norm2))
