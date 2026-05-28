"""
FocusHub — Dropbox Telemetry Ingestor
======================================
Servidor FastAPI que actúa como endpoint para el webhook de Dropbox.

Flujo:
  1. Dropbox GET /webhook?challenge=xxx  →  respondemos con el mismo challenge
     (paso de verificación al registrar el webhook).
  2. Dropbox POST /webhook              →  notificación de cambio en la cuenta.
     Usamos el cursor almacenado para listar solo los CSVs nuevos,
     los descargamos en memoria, los parseamos e insertamos en Supabase.

Arranque local:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import PlainTextResponse

import dropbox_client
import db
import parser as csv_parser

# --------------------------------------------------------------------------- #
# Config                                                                        #
# --------------------------------------------------------------------------- #
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

WATCH_FOLDER = os.environ.get("DROPBOX_WATCH_FOLDER", "/OBDLink")
VEHICLE_ID = os.environ["DEFAULT_VEHICLE_ID"]

# Cursor de Dropbox persiste en disco para sobrevivir reinicios del proceso.
CURSOR_FILE = Path(__file__).parent / ".dropbox_cursor"


def _load_cursor() -> str | None:
    if CURSOR_FILE.exists():
        return CURSOR_FILE.read_text().strip() or None
    return None


def _save_cursor(cursor: str) -> None:
    CURSOR_FILE.write_text(cursor)


# --------------------------------------------------------------------------- #
# App                                                                           #
# --------------------------------------------------------------------------- #
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Ingestor arrancado. Carpeta vigilada: %s", WATCH_FOLDER)
    # Inicializa el cursor si es la primera vez (listing completo, sin procesar)
    if _load_cursor() is None:
        log.info("Primera ejecución: inicializando cursor de Dropbox...")
        _, cursor = dropbox_client.list_new_files(None, WATCH_FOLDER)
        _save_cursor(cursor)
        log.info("Cursor inicializado. Los próximos CSVs subidos serán procesados.")
    yield


app = FastAPI(title="FocusHub Dropbox Ingestor", lifespan=lifespan)


# --------------------------------------------------------------------------- #
# Webhook endpoints                                                             #
# --------------------------------------------------------------------------- #

@app.get("/webhook", response_class=PlainTextResponse)
async def webhook_verify(challenge: str) -> str:
    """Paso de verificación de Dropbox: devuelve el challenge tal cual."""
    log.info("Webhook verificado por Dropbox.")
    return challenge


@app.post("/webhook")
async def webhook_notify(request: Request) -> Response:
    """
    Dropbox llama aquí cuando hay cambios en la carpeta vigilada.
    Debe responder 200 en < 10 s; el procesado real es rápido porque
    los CSVs de telemetría suelen ser < 5 MB.
    """
    cursor = _load_cursor()
    new_files, new_cursor = dropbox_client.list_new_files(cursor, WATCH_FOLDER)
    _save_cursor(new_cursor)

    if not new_files:
        return Response(status_code=200)

    log.info("Nuevos CSVs detectados: %s", new_files)

    results = []
    for path in new_files:
        result = _process_file(path)
        results.append(result)
        log.info("Procesado %s → %s", path, result)

    return Response(
        content=json.dumps({"processed": results}),
        media_type="application/json",
        status_code=200,
    )


# --------------------------------------------------------------------------- #
# Endpoint manual (útil para backfill / testing)                               #
# --------------------------------------------------------------------------- #

@app.post("/process")
async def process_file_manual(path: str) -> dict:
    """
    Procesa un CSV concreto de Dropbox bajo demanda.
    Ejemplo: POST /process?path=/OBDLink/2024-01-15.csv
    """
    return _process_file(path)


# --------------------------------------------------------------------------- #
# Lógica central                                                                #
# --------------------------------------------------------------------------- #

def _process_file(dropbox_path: str) -> dict:
    try:
        # 1. Descargar CSV en memoria
        buf = dropbox_client.download_csv(dropbox_path)

        # 2. Parsear
        points, meta = csv_parser.parse_csv(buf)
        if not points:
            return {"path": dropbox_path, "status": "skipped", "reason": "sin puntos válidos"}

        # 3. Crear o recuperar el viaje en Supabase (idempotente)
        viaje_id, created = db.find_or_create_viaje(
            dropbox_path=dropbox_path,
            vehicle_id=VEHICLE_ID,
        )

        if not created:
            return {"path": dropbox_path, "status": "already_processed", "viaje_id": viaje_id}

        # 4. Insertar telemetría
        inserted = db.insert_telemetria(viaje_id, points)

        return {
            "path": dropbox_path,
            "status": "ok",
            "viaje_id": viaje_id,
            "puntos_insertados": inserted,
            "meta": meta,
        }

    except Exception as exc:
        log.exception("Error procesando %s", dropbox_path)
        raise HTTPException(status_code=500, detail=str(exc))


# --------------------------------------------------------------------------- #
# Health check                                                                  #
# --------------------------------------------------------------------------- #

@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "watch_folder": WATCH_FOLDER}
