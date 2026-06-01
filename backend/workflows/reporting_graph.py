from __future__ import annotations


def build_reporting_graph() -> dict:
    return {
        "nodes": ["plant_health", "smart_farming", "community_exchange", "decision_support"],
        "edges": [("plant_health", "decision_support"), ("smart_farming", "decision_support")],
    }