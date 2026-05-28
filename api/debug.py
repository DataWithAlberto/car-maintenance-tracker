"""Endpoint temporal de debug: comprueba qué env vars está viendo Vercel."""
import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        # Solo muestra si la variable existe y su longitud, NO el valor (es secreto)
        body = json.dumps({
            "SUPABASE_URL":           {"set": "SUPABASE_URL" in os.environ,        "len": len(os.environ.get("SUPABASE_URL", ""))},
            "SUPABASE_SERVICE_KEY":   {"set": "SUPABASE_SERVICE_KEY" in os.environ, "len": len(os.environ.get("SUPABASE_SERVICE_KEY", ""))},
            "DROPBOX_APP_KEY":        {"set": "DROPBOX_APP_KEY" in os.environ,      "len": len(os.environ.get("DROPBOX_APP_KEY", ""))},
            "DROPBOX_APP_SECRET":     {"set": "DROPBOX_APP_SECRET" in os.environ,   "len": len(os.environ.get("DROPBOX_APP_SECRET", ""))},
            "DROPBOX_REFRESH_TOKEN":  {"set": "DROPBOX_REFRESH_TOKEN" in os.environ,"len": len(os.environ.get("DROPBOX_REFRESH_TOKEN", ""))},
            "DROPBOX_WATCH_FOLDER":   {"set": "DROPBOX_WATCH_FOLDER" in os.environ, "len": len(os.environ.get("DROPBOX_WATCH_FOLDER", ""))},
            "DEFAULT_VEHICLE_ID":     {"set": "DEFAULT_VEHICLE_ID" in os.environ,   "len": len(os.environ.get("DEFAULT_VEHICLE_ID", ""))},
        }, indent=2).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass
