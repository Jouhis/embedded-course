// Paste this whole file into javascript_tool once per page load (after opening the
// diagram.json tab, so its editor model exists). It defines four helpers on window.
//
//   await __run(files, expect, maxSec)   load files, (re)start, wait for `expect` on serial
//   await __setDiagram(objOrString, ms)  replace diagram.json without running
//   __wires()                            the rendered wire paths ("d" strings, diagram coords)
//   await __pinPos(parts, ["id:PIN"])    exact coordinates of pins (one probe wire each)
//   __q([[label, files, secs, expect], ...])  queue runs; returns at once (no tool timeout)
//   await __wait(maxSec)                 results of the queue so far: {done, r: [...]}

window.__model = function (name) {
  return monaco.editor.getModels().find(m => m.uri.toString() === 'vfs:' + name);
};

window.__setDiagram = async function (obj, ms) {
  const m = window.__model('diagram.json');
  if (!m) throw new Error('open the diagram.json tab first, so its editor model exists');
  m.setValue(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1));
  await new Promise(r => setTimeout(r, ms || 700));
};

// files: {"main.c": "...", "diagram.json": "..."}. Only files that already exist as editor
// models are set; the result lists the others under `missing`.
// Returns {started, passed, secs, tail, missing}. `started` false means the new run never
// began (compile error, or the page is stuck): treat the result as unknown, not as a fail.
window.__run = async function (files, expect, maxSec) {
  const pre = () => (document.querySelector('[class*="serial-monitor_monitorContainer"] pre') || {}).textContent || '';
  const btn = re => [...document.querySelectorAll('button')].find(b => re.test(b.getAttribute('aria-label') || b.title || ''));
  // Stop first, so the old run cannot add text while we wait for the new one.
  const stop = btn(/Stop the simulation/);
  if (stop) { stop.click(); await new Promise(r => setTimeout(r, 800)); }
  const missing = [];
  for (const [k, v] of Object.entries(files)) {
    const m = window.__model(k);
    if (m) m.setValue(v); else missing.push(k);
  }
  // The monitor keeps the old text until the new simulation starts (after the cloud
  // compile, several seconds). Only text that differs from it belongs to this run.
  // Never clear the <pre> by hand: writing to it crashes the page.
  const old = pre();
  btn(/Start the simulation|Restart the simulation/).click();
  const t0 = Date.now();
  let started = false, text = '';
  while (!started && Date.now() - t0 < 60000) {
    await new Promise(r => setTimeout(r, 300));
    text = pre();
    if (text !== old) started = true;
  }
  const t1 = Date.now();
  while (started && Date.now() - t1 < (maxSec || 30) * 1000) {
    await new Promise(r => setTimeout(r, 500));
    text = pre();
    if (expect && text.includes(expect)) break;
  }
  return {started, passed: started && expect ? text.includes(expect) : null,
          secs: Math.round((Date.now() - t0) / 1000), tail: text.slice(-500), missing};
};

window.__wires = () => [...document.querySelectorAll('path[class*="outline"]')].map(p => p.getAttribute('d'));

// Pin coordinates for parts not yet in route.py's PINS table. Put the part at top 0,
// left 0 (and any "rotate") to get offsets. Each pin gets its own probe diagram with one
// wire, because the order of wires in the page does not follow the JSON.
window.__pinPos = async function (parts, pins) {
  const anchor = {type: 'wokwi-resistor', id: 'zz', top: 900, left: 900, attrs: {}};
  const out = {};
  for (const pin of pins) {
    await window.__setDiagram({version: 1, author: 'probe', editor: 'wokwi', parts: [...parts, anchor],
                               connections: [[pin, 'zz:1', 'green', []]], dependencies: {}});
    const s = (window.__wires()[0] || '').match(/^M([-\d.]+),([-\d.]+)/);
    out[pin] = s ? [+s[1], +s[2]] : null;
  }
  return out;
};

// Runs longer than the tool call's timeout: queue them, then poll with __wait.
window.__q = function (runs) {
  window.__R = {done: false, r: []};
  (async () => {
    for (const [lbl, f, s, exp] of runs) {
      const x = await window.__run(f, exp, s);
      window.__R.r.push({lbl, st: x.started, ok: x.passed, secs: x.secs, tail: x.tail.slice(-160)});
    }
    window.__R.done = true;
  })();
  return 'queued';
};
window.__wait = async function (maxSec) {
  const t = Date.now();
  while (!window.__R.done && Date.now() - t < (maxSec || 40) * 1000) await new Promise(r => setTimeout(r, 500));
  return JSON.stringify(window.__R);
};

'wokwi helpers installed';
