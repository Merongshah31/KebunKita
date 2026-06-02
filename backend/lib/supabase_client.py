from __future__ import annotations

import json
import mimetypes
import os
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


class SupabaseError(RuntimeError):
    pass


@dataclass(frozen=True)
class SupabaseClientConfig:
    url: str | None = None
    anon_key: str | None = None
    service_role_key: str | None = None

    @classmethod
    def from_env(cls) -> "SupabaseClientConfig":
        return cls(
            url=os.getenv("SUPABASE_URL"),
            anon_key=os.getenv("SUPABASE_KEY"),
            service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        )


class SupabaseClient:
    def __init__(self, config: SupabaseClientConfig | None = None) -> None:
        self.config = config or SupabaseClientConfig.from_env()

    def _refresh_from_env(self) -> None:
        if not self.config.url or not self.key:
            self.config = SupabaseClientConfig.from_env()

    @property
    def key(self) -> str | None:
        return self.config.service_role_key or self.config.anon_key

    def is_configured(self) -> bool:
        self._refresh_from_env()
        return bool(self.config.url and self.key)

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        if not self.is_configured():
            raise SupabaseError("Supabase is not configured")
        headers = {
            "apikey": self.key or "",
            "Authorization": f"Bearer {self.key}",
        }
        if extra:
            headers.update(extra)
        return headers

    def _request(
        self,
        method: str,
        path: str,
        body: Any | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        if not self.config.url:
            raise SupabaseError("SUPABASE_URL is not configured")

        url = f"{self.config.url.rstrip('/')}{path}"
        data: bytes | None = None
        request_headers = self._headers(headers)

        if body is not None:
            if isinstance(body, bytes):
                data = body
            else:
                data = json.dumps(body).encode("utf-8")
                request_headers.setdefault("Content-Type", "application/json")

        request = Request(url=url, data=data, headers=request_headers, method=method)

        try:
            with urlopen(request, timeout=30) as response:
                raw = response.read()
                if not raw:
                    return None
                content_type = response.headers.get("Content-Type", "")
                if "application/json" in content_type:
                    return json.loads(raw.decode("utf-8"))
                return raw
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise SupabaseError(f"Supabase {method} {path} failed: {exc.code} {detail}") from exc
        except URLError as exc:
            raise SupabaseError(f"Supabase {method} {path} failed: {exc.reason}") from exc

    def health(self) -> dict[str, Any]:
        if not self.is_configured():
            return {"configured": False, "ok": False}
        try:
            self.select("users", limit=1)
            return {"configured": True, "ok": True}
        except SupabaseError as exc:
            return {"configured": True, "ok": False, "error": str(exc)}

    def select(
        self,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        columns: str = "*",
        limit: int | None = None,
        order: str | None = None,
    ) -> list[dict[str, Any]]:
        query: dict[str, str] = {"select": columns}
        for key, value in (filters or {}).items():
            query[key] = f"eq.{value}"
        if limit is not None:
            query["limit"] = str(limit)
        if order:
            query["order"] = order
        path = f"/rest/v1/{quote(table)}?{urlencode(query)}"
        result = self._request("GET", path)
        return result or []

    def insert(self, table: str, payload: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
        return self._request(
            "POST",
            f"/rest/v1/{quote(table)}",
            payload,
            {"Prefer": "return=representation"},
        ) or []

    def update(self, table: str, filters: dict[str, Any], payload: dict[str, Any]) -> list[dict[str, Any]]:
        query = urlencode({key: f"eq.{value}" for key, value in filters.items()})
        return self._request(
            "PATCH",
            f"/rest/v1/{quote(table)}?{query}",
            payload,
            {"Prefer": "return=representation"},
        ) or []

    def delete(self, table: str, filters: dict[str, Any]) -> list[dict[str, Any]]:
        query = urlencode({key: f"eq.{value}" for key, value in filters.items()})
        return self._request(
            "DELETE",
            f"/rest/v1/{quote(table)}?{query}",
            headers={"Prefer": "return=representation"},
        ) or []

    def upsert(
        self,
        table: str,
        payload: dict[str, Any] | list[dict[str, Any]],
        *,
        on_conflict: str | None = None,
    ) -> list[dict[str, Any]]:
        path = f"/rest/v1/{quote(table)}"
        if on_conflict:
            path = f"{path}?{urlencode({'on_conflict': on_conflict})}"
        return self._request(
            "POST",
            path,
            payload,
            {"Prefer": "resolution=merge-duplicates,return=representation"},
        ) or []

    def upload_file(
        self,
        bucket: str,
        object_path: str,
        content: bytes,
        *,
        content_type: str | None = None,
        upsert: bool = True,
    ) -> dict[str, Any]:
        guessed_type = content_type or mimetypes.guess_type(object_path)[0] or "application/octet-stream"
        safe_path = "/".join(quote(part) for part in object_path.strip("/").split("/"))
        result = self._request(
            "POST",
            f"/storage/v1/object/{quote(bucket)}/{safe_path}",
            content,
            {
                "Content-Type": guessed_type,
                "x-upsert": "true" if upsert else "false",
            },
        )
        return {
            "result": result,
            "path": object_path,
            "public_url": self.public_url(bucket, object_path),
        }

    def public_url(self, bucket: str, object_path: str) -> str:
        if not self.config.url:
            raise SupabaseError("SUPABASE_URL is not configured")
        safe_path = "/".join(quote(part) for part in object_path.strip("/").split("/"))
        return f"{self.config.url.rstrip('/')}/storage/v1/object/public/{quote(bucket)}/{safe_path}"


supabase_client = SupabaseClient()
