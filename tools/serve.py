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
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(argv):
    port = int(argv[0]) if argv else 8000
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    # Bind to localhost only: the course is for you, not your network.
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    url = f"http://localhost:{port}/index.html"
    print(f"Course at {url}  (Ctrl+C to stop)")
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
