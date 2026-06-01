# Pinecone Memory Core — Setup & Usage

This document explains how to enable the Memory Core using Pinecone for persistent vector storage, how the backend integrates with it, and example code to save and query memories with embeddings.

## Goals
- Persist agent memories (plant analyses, recommendations, chat history) in a vector DB for semantic search and retrieval.
- Keep backward compatibility: if Pinecone is not configured, the system falls back to the in-memory store.

## Required environment variables
- `PINECONE_API_KEY` — your Pinecone API key (keep secret)
- `PINECONE_ENV` — Pinecone environment (region), e.g. `us-west1-gcp`
- `PINECONE_INDEX_NAME` — optional, defaults to `kebunkita-memory`
- `PINECONE_DIM` — optional vector dimension (default `1536`) used when no embedding is provided

Add these to your deployment secrets or local `.env` (do NOT commit real keys).

## Install
From the `backend/` folder install the new requirement:

```bash
pip install -r backend/requirements.txt
# If you plan to use OpenAI embeddings, also install openai:
pip install openai
```

## How it works (implementation notes)
- `backend/tools/memory_tools.py` now exposes a `memory_store` object.
- If `PINECONE_API_KEY` + `PINECONE_ENV` are present at startup, `memory_store` will be a `PineconeMemoryStore` that creates/uses the named index.
- If Pinecone is not configured or initialization fails, `memory_store` falls back to the in-memory `MemoryStore` (no external dependency).
- `PineconeMemoryStore.save(user_id, agent_name, payload, embed_fn=None)` stores an item. If `embed_fn` is provided it will be used to create a semantic vector for the item's text; otherwise a zero-vector placeholder is stored.
- `PineconeMemoryStore.get(user_id, top_k=10, query=None, embed_query_fn=None)` will perform a semantic query when `query` + `embed_query_fn` are provided; otherwise it returns items filtered by `user_id` (best-effort using a zero-vector query plus metadata filter).

## Example: saving a memory with OpenAI embeddings
1. Export `OPENAI_API_KEY` in env.
2. Use this simple embed helper (example uses the OpenAI HTTP API):

```python
import os
import openai
from backend.tools.memory_tools import memory_store

openai.api_key = os.environ["OPENAI_API_KEY"]

def openai_embed(text: str) -> list[float]:
    resp = openai.Embedding.create(model="text-embedding-3-small", input=text)
    return resp["data"][0]["embedding"]

# Save a memory (agent code example)
user_id = "user:alice"
agent_name = "plant_health"
payload = {"text": "Leaves showing brown spots and wilting", "meta": {"image_id": "img-123"}}
memory_store.save(user_id, agent_name, payload, embed_fn=openai_embed)
```

## Example: semantic query

```python
def openai_embed_query(q: str) -> list[float]:
    return openai.Embedding.create(model="text-embedding-3-small", input=q)["data"][0]["embedding"]

results = memory_store.get(user_id, top_k=5, query="brown spots on leaves", embed_query_fn=openai_embed_query)
for r in results:
    print(r)
```

## Migration / data model
- Each Pinecone entry stores `metadata` with `user_id`, `agent_name`, and `payload` (arbitrary JSON). The `payload` should contain the human-readable `text` or `content` field to be embedded.
- For historical migration from the in-memory store, export the in-memory entries and `upsert` them into Pinecone via a small script that calls `memory_store.save(..., embed_fn=...)`.

## Testing locally
- Start the FastAPI backend locally with `.env` configured with Pinecone keys.
- Use the `/api/agents/plant-health` endpoint to create a plant analysis; the agent code already calls `memory_store.save(...)` so items will be persisted if Pinecone is active.

## Notes & next steps
- For production, provide a dedicated embeddings service (OpenAI, Hugging Face Inference, local embedding model) and pass an embed function to `memory_store.save` and `memory_store.get` for meaningful semantic search.
- Add monitoring and periodic reindexing if you migrate embedding models (vectors will need to be recomputed).
- Consider adding TTL / retention policy implemented as background job to remove old entries.

If you'd like, I can now:
- Implement an example migration script that reads the current in-memory store and upserts entries to Pinecone using OpenAI embeddings.
- Add a small admin endpoint to trigger re-embedding of all memories with a new model.
