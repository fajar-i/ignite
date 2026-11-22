"""Static server kecil. Jalankan: python serve.py  -> buka http://localhost:5173"""
import http.server
import socketserver

PORT = 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".glb": "model/gltf-binary",
        ".woff2": "font/woff2",
        ".webp": "image/webp",
        ".otf": "font/otf",
        ".ttf": "font/ttf",
        ".gltf": "model/gltf+json",
        ".bin": "application/octet-stream",
        ".png": "image/png",
        ".jpg": "image/jpeg",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def start(port):
    # coba port berikutnya kalau sudah dipakai
    for p in range(port, port + 20):
        try:
            return socketserver.TCPServer(("", p), Handler), p
        except OSError:
            print(f"Port {p} sedang dipakai, coba {p + 1}...")
    raise SystemExit("Tidak ada port bebas.")


httpd, port = start(PORT)
with httpd:
    print(f"Serving on http://localhost:{port}  (Ctrl+C untuk stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
