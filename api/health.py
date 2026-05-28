"""Vercel Serverless Function — /api/health"""
import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        body = json.dumps({
            "status":       "ok",
            "watch_folder": os.environ.get("DROPBOX_WATCH_FOLDER", "/OBDLink"),
        }).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass
