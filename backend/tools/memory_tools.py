from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable, List, Optional
import os
from uuid import uuid4


class MemoryStore:
    """In-memory fallback memory store."""

    def __init__(self) -> None:
        self._store: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def save(self, user_id: str, agent_name: str, payload: dict[str, Any], **_kwargs) -> dict[str, Any]:
        entry = {"agent_name": agent_name, "payload": payload}
        self._store[user_id].append(entry)
        return entry

    def get(self, user_id: str, **_kwargs) -> list[dict[str, Any]]:
        return list(self._store.get(user_id, []))


class PineconeMemoryStore:
    """Pinecone-backed memory store.

    Notes:
    - To enable semantic search, provide an `embed_fn(text)->list[float]` when saving or querying.
    - If no `embed_fn` is provided, items are stored with a zero-vector placeholder of configured dimension.
    """

    def __init__(self) -> None:
        try:
            import pinecone
        except Exception:
            raise

        api_key = os.environ.get("PINECONE_API_KEY")
        env = os.environ.get("PINECONE_ENV")
        index_name = os.environ.get("PINECONE_INDEX_NAME", "kebunkita-memory")
        dim = int(os.environ.get("PINECONE_DIM", "1536"))

        if not api_key or not env:
            raise RuntimeError("PINECONE_API_KEY and PINECONE_ENV must be set to use PineconeMemoryStore")

        pinecone.init(api_key=api_key, environment=env)
        self._pinecone = pinecone
        self._index_name = index_name
        self._dim = dim

        if index_name not in pinecone.list_indexes():
            pinecone.create_index(index_name, dimension=self._dim)

        self._index = pinecone.Index(index_name)

    def save(
        self,
        user_id: str,
        agent_name: str,
        payload: dict[str, Any],
        embed_fn: Optional[Callable[[str], List[float]]] = None,
    ) -> dict[str, Any]:
        text = payload.get("text") or payload.get("content") or str(payload)
        if embed_fn is not None:
            vector = embed_fn(text)
        else:
            vector = [0.0] * self._dim

        uid = f"{user_id}:{agent_name}:{uuid4().hex}"
        metadata = {"user_id": user_id, "agent_name": agent_name, "payload": payload}

        # Pinecone upsert expects iterable of (id, vector, metadata)
        self._index.upsert([(uid, vector, metadata)])
        return {**metadata, "id": uid}

    def get(
        self,
        user_id: str,
        top_k: int = 10,
        query: Optional[str] = None,
        embed_query_fn: Optional[Callable[[str], List[float]]] = None,
    ) -> list[dict[str, Any]]:
        # If a query is provided and embed function exists, perform vector query
        if query and embed_query_fn:
            vector = embed_query_fn(query)
            resp = self._index.query(vector=vector, top_k=top_k, include_metadata=True)
            return [m["metadata"] for m in resp.get("matches", [])]

        # Otherwise fetch by metadata filter user_id
        zero_vec = [0.0] * self._dim
        resp = self._index.query(vector=zero_vec, filter={"user_id": user_id}, top_k=top_k, include_metadata=True)
        return [m["metadata"] for m in resp.get("matches", [])]


def _create_memory_store() -> MemoryStore | PineconeMemoryStore:
    api_key = os.environ.get("PINECONE_API_KEY")
    if api_key:
        try:
            return PineconeMemoryStore()
        except Exception:
            # Fall back to in-memory store if Pinecone cannot be initialized
            return MemoryStore()
    return MemoryStore()


memory_store = _create_memory_store()