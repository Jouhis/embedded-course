"""Render a Look inside demo page in headless Edge: screenshot it, run scripted actions, report errors.

Usage (from the repo root, run with python -I):
  python -I .claude/skills/look-inside-demo/scripts/shoot.py inside/elevator.html --out <dir> [options]

Options:
  --do JS        JavaScript run after load. `D` is the first widget's box._demo, `W(ms)` waits (wall ms,
                 which headless Edge runs in virtual time), `log(...)` writes to the report. Async is fine.
  --ms N         virtual time budget in ms (default 9000). Must cover every W() in --do plus settling.
  --labels M     call D.setLabels(M) first: all | auto | off (default all, to check callout placement)
  --size WxH     window size (default 1300x1150)
  --name NAME    screenshot file name without .png (default: the page name)
  --no-shot      only run --do and print the report

Headless Edge does not run requestAnimationFrame, so the page gets a setTimeout stand-in (16 ms).
The page is copied to a temp file with its ../ links made absolute; the repo is not touched.
Prints: the screenshot path, any JS errors, and the log() lines.
"""
import argparse, os, pathlib, re, subprocess, sys, tempfile, html

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page")
    ap.add_argument("--out", required=True)
    ap.add_argument("--do", default="")
    ap.add_argument("--ms", type=int, default=9000)
    ap.add_argument("--labels", default="all")
    ap.add_argument("--size", default="1300x1150")
    ap.add_argument("--name")
    ap.add_argument("--no-shot", action="store_true")
    a = ap.parse_args()

    page = pathlib.Path(a.page).resolve()
    root = page.parent.parent
    src = page.read_text(encoding="utf-8")
    base = root.as_uri() + "/"
    src = src.replace('="../', '="' + base)
    pre = """<script>
window.requestAnimationFrame = f => setTimeout(() => f(performance.now()), 16);
window.__log = []; window.__err = [];
window.onerror = (m, s, l, c, e) => { __err.push(m + " @" + l + (e && e.stack ? " " + e.stack.split("\\n")[1] : "")); };
</script>"""
    post = """<pre id="__out" style="display:none"></pre><script>
const log = (...x) => { __log.push(x.join(" ")); flush(); };
function flush() { document.getElementById("__out").textContent = JSON.stringify({ log: __log, err: __err }); }
const W = ms => new Promise(r => setTimeout(r, ms));
window.addEventListener("load", async () => {
  const box = document.querySelector(".widget"); const D = box && box._demo;
  try { if (D && D.setLabels) D.setLabels(%s);
    %s
  } catch (e) { __err.push("do: " + e.stack); }
  flush();
});
setInterval(flush, 200);
</script>""" % (repr(a.labels), a.do)
    src = src.replace("<head>", "<head>" + pre, 1).replace("</body>", post + "</body>", 1)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="shoot-")) / page.name
    tmp.write_text(src, encoding="utf-8")
    url = tmp.as_uri()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    w, h = a.size.split("x")
    common = [EDGE, "--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--hide-scrollbars",
              f"--window-size={w},{h}", f"--virtual-time-budget={a.ms}"]
    if not a.no_shot:
        shot = out / ((a.name or page.stem) + ".png")
        subprocess.run(common + [f"--screenshot={shot}", url], capture_output=True, timeout=600)
        print("screenshot:", shot)
    dom = subprocess.run(common + ["--dump-dom", url], capture_output=True, timeout=600).stdout.decode("utf-8", "replace")
    m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', dom, re.S)
    import json
    rep = json.loads(html.unescape(m.group(1))) if m and m.group(1).strip() else {"log": [], "err": ["no report: page did not load or --ms too short"]}
    for e in rep["err"]:
        print("ERROR:", e)
    for l in rep["log"]:
        print("log:", l)
    if not rep["err"]:
        print("no JS errors")

if __name__ == "__main__":
    main()
