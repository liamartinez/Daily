#!/usr/bin/env python3
"""Threaded static server (plain http.server hangs when Chrome holds keep-alive connections)."""
import http.server
import socketserver
import sys


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
    server = ThreadingHTTPServer(('', port), NoCacheHandler)
    print(f'serving on http://localhost:{port}')
    server.serve_forever()
