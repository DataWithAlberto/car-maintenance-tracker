"""
Operaciones contra Supabase usando la service_role key (bypassa RLS).

Patrón upsert: si el mismo archivo Dropbox ya fue procesado antes
(control por dropbox_path), se omite sin lanzar error.
"""
import os
from datetime import datetime, timezone
from dataclasses import asdict

from supabase import create_client, Client

from parser import TelemetriaPoint


def get_client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def find_or_create_viaje(
    dropbox_path: str,
    vehicle_id: str,
    nombre: str | None = None,
) -> tuple[str, bool]:
    """
    Devuelve (viaje_id, created).
    Si ya existe un viaje para este dropbox_path, lo reutiliza (idempotencia).
    """
    supabase = get_client()

    existing = (
        supabase.table("viajes_telemetria")
        .select("id")
        .eq("dropbox_path", dropbox_path)
        .maybe_single()
        .execute()
    )

    if existing.data:
        return existing.data["id"], False

    # Nombre legible: usa el nombre del fichero si no se provee uno
    display_name = nombre or dropbox_path.split("/")[-1].replace(".csv", "")
    now = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("viajes_telemetria")
        .insert({
            "vehicle_id": vehicle_id,
            "nombre": display_name,
            "fecha": now,
            "dropbox_path": dropbox_path,
        })
        .execute()
    )
    return result.data[0]["id"], True


# Tamaño de lote para inserción masiva. Supabase acepta ~1000 filas/request.
_BATCH_SIZE = 500


def get_cursor() -> str | None:
    """Lee el cursor de Dropbox guardado en Supabase."""
    supabase = get_client()
    result = (
        supabase.table("ingestor_config")
        .select("value")
        .eq("key", "dropbox_cursor")
        .maybe_single()
        .execute()
    )
    return result.data["value"] if result.data else None


def save_cursor(cursor: str) -> None:
    """Persiste el cursor de Dropbox en Supabase (upsert)."""
    supabase = get_client()
    supabase.table("ingestor_config").upsert({
        "key": "dropbox_cursor",
        "value": cursor,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()


def insert_telemetria(viaje_id: str, points: list[TelemetriaPoint]) -> int:
    """
    Inserta los puntos de telemetría en lotes y devuelve el total insertado.
    """
    supabase = get_client()
    inserted = 0

    rows = [
        {
            "viaje_id": viaje_id,
            **{k: v for k, v in asdict(p).items() if v is not None},
        }
        for p in points
    ]

    for i in range(0, len(rows), _BATCH_SIZE):
        batch = rows[i : i + _BATCH_SIZE]
        supabase.table("telemetria_puntos").insert(batch).execute()
        inserted += len(batch)

    return inserted
