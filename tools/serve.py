"""Serve the course on http://localhost so progress is shared by every page.

  python tools/serve.py [port]        (default port 8000; opens the course in your browser)

Opening index.html directly as a file works too, but some browsers (Firefox, and Chrome with some
settings) give every file:// page its own storage, so "Mark complete" on a lesson would not show
on the index. Over http all pages share one origin. Progress stays in the browser for that address:
always use the same port, and use Export / Import on the index to back it up or move it.
Stop the server with Ctrl+C.
"""
import functools
import http.server
import socket
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Ask the browser to revalidate every file, so edits to the CSS, JS or a lesson show on a
    normal refresh. Without this, browsers reuse cached files based on Last-Modified alone."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


class SingleServer(http.server.ThreadingHTTPServer):
    # Python's servers set SO_REUSEADDR, which on Windows lets a second server bind the same port
    # silently; the browser then talks to whichever one answers, often an old one. Refuse instead.
    allow_reuse_address = sys.platform != "win32"

    def server_bind(self):
        if sys.platform == "win32":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def main(argv):
    port = int(argv[0]) if argv else 8000
    url = f"http://localhost:{port}/index.html"
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    try:
        # Bind to localhost only: the course is for you, not your network.
        server = SingleServer(("127.0.0.1", port), handler)
    except OSError:
        print(f"The course server is already running on port {port}. Opening {url}")
        webbrowser.open(url)
        return 0
    print(f"Course at {url}  (Ctrl+C to stop)")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
