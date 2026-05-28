"""
Operaciones contra Supabase con service_role key (bypassa RLS).
Incluye persistencia del cursor de Dropbox para entornos serverless.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dataclasses import asdict
from datetime import datetime, timezone

from supabase import create_client, Client

from _parser import TelemetriaPoint

_BATCH_SIZE = 500


def get_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


# ── Cursor de Dropbox ──────────────────────────────────────────────────────

def get_cursor() -> str | None:
    result = (
        get_client()
        .table("ingestor_config")
        .select("value")
        .eq("key", "dropbox_cursor")
        .maybe_single()
        .execute()
    )
    return result.data["value"] if result.data else None


def save_cursor(cursor: str) -> None:
    get_client().table("ingestor_config").upsert({
        "key": "dropbox_cursor",
        "value": cursor,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()


# ── Viajes ─────────────────────────────────────────────────────────────────

def find_or_create_viaje(dropbox_path: str, vehicle_id: str) -> tuple[str, bool]:
    """Devuelve (viaje_id, created). Idempotente por dropbox_path."""
    existing = (
        get_client()
        .table("viajes_telemetria")
        .select("id")
        .eq("dropbox_path", dropbox_path)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return existing.data["id"], False

    nombre = dropbox_path.split("/")[-1].replace(".csv", "")
    result = (
        get_client()
        .table("viajes_telemetria")
        .insert({
            "vehicle_id": vehicle_id,
            "nombre": nombre,
            "fecha": datetime.now(timezone.utc).isoformat(),
            "dropbox_path": dropbox_path,
        })
        .execute()
    )
    return result.data[0]["id"], True


# ── Telemetría ─────────────────────────────────────────────────────────────

def insert_telemetria(viaje_id: str, points: list[TelemetriaPoint]) -> int:
    rows = [
        {"viaje_id": viaje_id, **{k: v for k, v in asdict(p).items() if v is not None}}
        for p in points
    ]
    inserted = 0
    for i in range(0, len(rows), _BATCH_SIZE):
        get_client().table("telemetria_puntos").insert(rows[i:i + _BATCH_SIZE]).execute()
        inserted += len(rows[i:i + _BATCH_SIZE])
    return inserted
