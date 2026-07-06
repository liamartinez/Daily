#!/usr/bin/env python3
"""Threaded dev server (plain http.server hangs when Chrome keeps connections alive)."""
import http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with ThreadingHTTPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"Serving Sing Whale at http://localhost:{PORT}")
    httpd.serve_forever()
