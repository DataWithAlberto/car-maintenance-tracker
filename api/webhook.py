"""
Vercel Serverless Function — /api/webhook

GET  → verificación del webhook de Dropbox (challenge)
POST → notificación de cambio: detecta y procesa CSVs nuevos
"""
import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        """Dropbox envía GET con ?challenge=xxx para verificar el endpoint.
        Responde inmediatamente — no necesita ninguna variable de entorno."""
        query     = parse_qs(urlparse(self.path).query)
        challenge = query.get("challenge", [""])[0]
        self._send(200, challenge.encode(), "text/plain")

    def do_POST(self):
        """Dropbox notifica un cambio en la carpeta vigilada."""
        # Importaciones lazy: solo se ejecutan en POST, no al cargar el módulo
        from _dropbox_client import download_csv, list_new_files
        from _db import find_or_create_viaje, get_cursor, insert_telemetria, save_cursor
        from _parser import parse_csv

        watch_folder = os.environ.get("DROPBOX_WATCH_FOLDER", "/OBDLink")
        vehicle_id   = os.environ["DEFAULT_VEHICLE_ID"]

        try:
            cursor                = get_cursor()
            new_files, new_cursor = list_new_files(cursor, watch_folder)
            save_cursor(new_cursor)

            results = [_process_file(p, vehicle_id) for p in new_files]
            self._send(200, json.dumps({"processed": results}).encode())

        except Exception as exc:
            self._send(500, json.dumps({"error": str(exc)}).encode())

    # ------------------------------------------------------------------ #

    def _send(self, code: int, body: bytes, content_type: str = "application/json"):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass  # silenciar logs de BaseHTTPRequestHandler


def _process_file(dropbox_path: str, vehicle_id: str) -> dict:
    from _dropbox_client import download_csv
    from _db import find_or_create_viaje, insert_telemetria
    from _parser import parse_csv

    buf            = download_csv(dropbox_path)
    points, meta   = parse_csv(buf)

    if not points:
        return {"path": dropbox_path, "status": "skipped", "reason": "sin puntos válidos"}

    viaje_id, created = find_or_create_viaje(dropbox_path, vehicle_id)

    if not created:
        return {"path": dropbox_path, "status": "already_processed", "viaje_id": viaje_id}

    inserted = insert_telemetria(viaje_id, points)
    return {
        "path":              dropbox_path,
        "status":            "ok",
        "viaje_id":          viaje_id,
        "puntos_insertados": inserted,
        "meta":              meta,
    }
