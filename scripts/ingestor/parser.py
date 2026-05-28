"""
Parsea el CSV que genera la app OBDLink.

Formato típico de OBDLink / OBD Fusion:
  - Primera fila: cabeceras con nombres de PID  (p.ej. "Engine RPM(rpm)", "GPS Latitude(deg)")
  - Columna de tiempo: "Time (sec)" en segundos flotantes desde el inicio del viaje
    → se convierte a milisegundos internamente.
  - Las columnas que no estén presentes en un CSV concreto se omiten sin error.
"""
import csv
import io
import re
from dataclasses import dataclass, field
from typing import Optional


# --------------------------------------------------------------------------- #
# Mapeo flexible de nombres de columna → campo interno                        #
# --------------------------------------------------------------------------- #
# Cada entrada: (campo_interno, [patrones regex case-insensitive])
COLUMN_MAP = [
    ("timestamp_ms",   [r"time.*sec", r"time.*offset", r"elapsed"]),
    ("latitude",       [r"gps.*lat", r"latitude"]),
    ("longitude",      [r"gps.*lon", r"longitude"]),
    ("rpm",            [r"engine.*rpm", r"rpm"]),
    ("velocidad",      [r"vehicle.*speed", r"speed.*obd", r"gps.*speed"]),
    ("carga_motor",    [r"engine.*load", r"calculated.*load"]),
    ("temp_refrigerante", [r"coolant.*temp", r"engine.*coolant"]),
    ("presion_admision",  [r"intake.*manifold", r"map\b"]),
    ("temp_admision",     [r"intake.*air.*temp"]),
    ("flujo_maf",         [r"\bmaf\b", r"mass.*air.*flow"]),
    ("posicion_acelerador", [r"throttle.*pos", r"absolute.*throttle"]),
]


def _detect_columns(headers: list[str]) -> dict[str, int]:
    """Relaciona cada campo interno con el índice de columna en el CSV."""
    mapping: dict[str, int] = {}
    for field_name, patterns in COLUMN_MAP:
        for idx, header in enumerate(headers):
            if any(re.search(p, header, re.IGNORECASE) for p in patterns):
                mapping[field_name] = idx
                break
    return mapping


@dataclass
class TelemetriaPoint:
    timestamp_ms: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rpm: Optional[int] = None
    velocidad: Optional[float] = None
    carga_motor: Optional[float] = None
    temp_refrigerante: Optional[float] = None
    presion_admision: Optional[float] = None
    temp_admision: Optional[float] = None
    flujo_maf: Optional[float] = None
    posicion_acelerador: Optional[float] = None


def _safe_float(val: str) -> Optional[float]:
    try:
        return float(val.strip()) if val.strip() not in ("", "-", "N/A") else None
    except ValueError:
        return None


def _safe_int(val: str) -> Optional[int]:
    f = _safe_float(val)
    return int(round(f)) if f is not None else None


def parse_csv(buf: io.StringIO) -> tuple[list[TelemetriaPoint], dict]:
    """
    Parsea el buffer CSV.

    Devuelve (puntos, metadata).
    metadata incluye: total_filas, filas_validas, columnas_detectadas.
    """
    reader = csv.reader(buf)
    headers = next(reader)
    col_idx = _detect_columns(headers)

    if "timestamp_ms" not in col_idx:
        raise ValueError(
            "No se encontró la columna de tiempo en el CSV. "
            f"Cabeceras disponibles: {headers}"
        )

    points: list[TelemetriaPoint] = []
    total = 0

    for row in reader:
        total += 1
        if not any(row):
            continue

        raw_time = row[col_idx["timestamp_ms"]]
        t_float = _safe_float(raw_time)
        if t_float is None:
            continue

        # OBDLink exporta tiempo en segundos; convertimos a ms
        ts_ms = int(t_float * 1000)

        def get(field_name: str):
            idx = col_idx.get(field_name)
            return row[idx] if idx is not None and idx < len(row) else ""

        point = TelemetriaPoint(
            timestamp_ms=ts_ms,
            latitude=_safe_float(get("latitude")),
            longitude=_safe_float(get("longitude")),
            rpm=_safe_int(get("rpm")),
            velocidad=_safe_float(get("velocidad")),
            carga_motor=_safe_float(get("carga_motor")),
            temp_refrigerante=_safe_float(get("temp_refrigerante")),
            presion_admision=_safe_float(get("presion_admision")),
            temp_admision=_safe_float(get("temp_admision")),
            flujo_maf=_safe_float(get("flujo_maf")),
            posicion_acelerador=_safe_float(get("posicion_acelerador")),
        )
        points.append(point)

    meta = {
        "total_filas": total,
        "filas_validas": len(points),
        "columnas_detectadas": list(col_idx.keys()),
    }
    return points, meta
