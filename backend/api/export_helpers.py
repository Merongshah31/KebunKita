from __future__ import annotations


def build_export_summary(title: str, items: list[str]) -> dict:
    return {"title": title, "items": items, "count": len(items)}