"""Skills router — taxonomy endpoints."""

import json
import os

from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])

# Load taxonomy.json once at startup
TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "..", "taxonomy.json")
_taxonomy_cache: dict | None = None


def _load_taxonomy() -> dict:
    """Load and cache the taxonomy JSON file."""
    global _taxonomy_cache
    if _taxonomy_cache is not None:
        return _taxonomy_cache

    if not os.path.exists(TAXONOMY_PATH):
        # Try alternate location
        alt_path = os.path.join(os.path.dirname(__file__), "..", "data", "taxonomy.json")
        if os.path.exists(alt_path):
            path = alt_path
        else:
            return {}
    else:
        path = TAXONOMY_PATH

    with open(path, "r", encoding="utf-8") as f:
        _taxonomy_cache = json.load(f)
    return _taxonomy_cache


@router.get("/taxonomy")
async def get_taxonomy(depth: int = 2, domain: str | None = None):
    """Return the full taxonomy tree, optionally filtered by domain."""
    taxonomy = _load_taxonomy()

    if domain:
        # Filter by domain key
        filtered = {}
        for key, value in taxonomy.items():
            if domain.lower() in key.lower():
                filtered[key] = value
        return filtered

    return taxonomy


@router.get("/taxonomy/search")
async def search_taxonomy(q: str = Query(..., min_length=1), limit: int = 10):
    """Search taxonomy for skills matching the query string (case-insensitive)."""
    taxonomy = _load_taxonomy()
    query_lower = q.lower()
    results = []

    def _search_recursive(data, parent_path=""):
        """Recursively search through taxonomy tree."""
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{parent_path} > {key}" if parent_path else key

                # Check if key matches
                if query_lower in key.lower():
                    results.append({
                        "canonical": key,
                        "taxonomy_path": current_path,
                        "aliases": value.get("aliases", []) if isinstance(value, dict) else [],
                    })

                # Check aliases if value is a dict with aliases
                if isinstance(value, dict):
                    aliases = value.get("aliases", [])
                    if isinstance(aliases, list):
                        for alias in aliases:
                            if isinstance(alias, str) and query_lower in alias.lower():
                                if not any(r["canonical"] == key for r in results):
                                    results.append({
                                        "canonical": key,
                                        "taxonomy_path": current_path,
                                        "aliases": aliases,
                                    })
                                break

                    # Recurse into children
                    _search_recursive(value, current_path)

                elif isinstance(value, list):
                    # value is a list of aliases/items
                    for item in value:
                        if isinstance(item, str) and query_lower in item.lower():
                            if not any(r["canonical"] == key for r in results):
                                results.append({
                                    "canonical": key,
                                    "taxonomy_path": current_path,
                                    "aliases": value,
                                })
                            break

        if len(results) >= limit:
            return

    _search_recursive(taxonomy)
    return {"results": results[:limit]}
