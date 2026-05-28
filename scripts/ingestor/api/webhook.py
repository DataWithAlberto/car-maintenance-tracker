"""
Vercel Serverless Function — /webhook
GET  → verificación del webhook de Dropbox (challenge)
POST → notificación de cambio: descarga y procesa CSVs nuevos
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Importar módulos del directorio padre
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import db
import dropbox_client
import parser as csv_parser

WATCH_FOLDER = os.environ.get("DROPBOX_WATCH_FOLDER", "/OBDLink")
VEHICLE_ID   = os.environ["DEFAULT_VEHICLE_ID"]


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        """Dropbox manda GET con ?challenge=xxx para verificar el endpoint."""
        query = parse_qs(urlparse(self.path).query)
        challenge = query.get("challenge", [""])[0]
        self._respond(200, challenge.encode(), "text/plain")

    def do_POST(self):
        """Dropbox notifica que hay cambios; procesamos los CSVs nuevos."""
        try:
            cursor = db.get_cursor()
            new_files, new_cursor = dropbox_client.list_new_files(cursor, WATCH_FOLDER)
            db.save_cursor(new_cursor)

            results = [_process_file(p) for p in new_files]
            self._respond(200, json.dumps({"processed": results}).encode())

        except Exception as exc:
            self._respond(500, json.dumps({"error": str(exc)}).encode())

    # ------------------------------------------------------------------ #

    def _respond(self, code: int, body: bytes, content_type: str = "application/json"):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass  # silenciar logs de BaseHTTPRequestHandler


def _process_file(dropbox_path: str) -> dict:
    buf = dropbox_client.download_csv(dropbox_path)
    points, meta = csv_parser.parse_csv(buf)

    if not points:
        return {"path": dropbox_path, "status": "skipped", "reason": "sin puntos válidos"}

    viaje_id, created = db.find_or_create_viaje(
        dropbox_path=dropbox_path,
        vehicle_id=VEHICLE_ID,
    )

    if not created:
        return {"path": dropbox_path, "status": "already_processed", "viaje_id": viaje_id}

    inserted = db.insert_telemetria(viaje_id, points)
    return {
        "path": dropbox_path,
        "status": "ok",
        "viaje_id": viaje_id,
        "puntos_insertados": inserted,
        "meta": meta,
    }
