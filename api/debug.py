"""Endpoint temporal de debug: comprueba qué env vars está viendo Vercel."""
import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        def fp(val: str) -> str:
            """Fingerprint seguro: primeros 4 + últimos 4 + longitud."""
            return f"{val[:4]}...{val[-4:]} (len={len(val)})" if val else "(vacío)"

        appkey = os.environ.get("DROPBOX_APP_KEY", "")
        secret = os.environ.get("DROPBOX_APP_SECRET", "")
        token  = os.environ.get("DROPBOX_REFRESH_TOKEN", "")

        env_info = {
            "DROPBOX_APP_KEY":       fp(appkey),
            "DROPBOX_APP_SECRET":    fp(secret),
            "DROPBOX_REFRESH_TOKEN": fp(token),
            "DROPBOX_WATCH_FOLDER":  repr(os.environ.get("DROPBOX_WATCH_FOLDER", "")),
            "SUPABASE_URL":          fp(os.environ.get("SUPABASE_URL", "")),
            "DEFAULT_VEHICLE_ID":    fp(os.environ.get("DEFAULT_VEHICLE_ID", "")),
        }

        # Test de conexión real a Dropbox dentro del entorno de Vercel
        dropbox_test = {}
        try:
            import dropbox
            dbx = dropbox.Dropbox(
                oauth2_refresh_token=token,
                app_key=appkey,
                app_secret=secret,
            )
            acc = dbx.users_get_current_account()
            dropbox_test = {"ok": True, "account": acc.email}
        except Exception as exc:
            dropbox_test = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

        body = json.dumps({"env": env_info, "dropbox_test": dropbox_test}, indent=2).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass
