// Run firmware built on this machine (STM32, FreeRTOS, Zephyr, Rust, Pico 2, multi-file
// Pico labs) in the browser editor. Paste after browser-helpers.js, once per page load
// (open the diagram.json tab first).
//
// Wokwi's "Upload Firmware and Start Simulation" opens a native file picker. This file
// catches that hidden <input type=file> and adds a stand-in, #__fw ("firmware stand-in"),
// whose ref (from `find`) stays the same for the whole page load. Upload two files to it
// with file_upload: the project's diagram.json and its firmware (.hex/.elf/.uf2/.bin).
// The stand-in stops the simulation, loads the diagram, then hands the firmware to Wokwi.
// One browser_batch call per run:
//
//   file_upload  ref=<stand-in>  paths=[<dir>/diagram.json, <dir>/build/blink.hex]
//   javascript_tool  await __fwWait('EXPECT TEXT', secs)
//
// __fwWait returns {started, passed, secs, tail}. As with __run, `started: false` is
// unknown, not a fail (but a starter that prints nothing at all also shows started: false).
// Never `await` the uploadFirmware action: it resolves only after a file is chosen, and
// the tool call hangs.
//
// Custom chips (mystery.chip.c, mystery.chip.json): the page has to hold them as project
// files so it compiles the chip. A second stand-in, #__up ("project file stand-in"), feeds
// Wokwi's "Upload file(s)..." item in the file-tab dropdown: open the dropdown next to the
// file tabs, click "Upload file(s)...", then file_upload the chip files to #__up. They stay
// in the page until it reloads, so this is done once per page load.

window.__serial = () => (document.querySelector('[class*="serial-monitor_monitorContainer"] pre') || {}).textContent || '';

(function () {
  const orig = HTMLInputElement.prototype.click;
  if (!window.__fwHooked) {
    HTMLInputElement.prototype.click = function () {
      if (this.type === 'file') { window.__fwTarget = this; return; }
      return orig.call(this);
    };
    window.__fwHooked = true;
  }
  if (!document.getElementById('__up')) {
    const up = document.createElement('input');
    up.type = 'file';
    up.multiple = true;
    up.id = '__up';
    up.setAttribute('aria-label', 'project file stand-in');
    up.style.cssText = 'position:fixed;left:130px;bottom:0;width:120px;height:20px;z-index:99999;opacity:0.3';
    document.body.appendChild(up);
    up.addEventListener('change', () => {
      const t = window.__fwTarget;  // set by clicking "Upload file(s)..." first
      if (!t || !up.files.length) return;
      const dt = new DataTransfer();
      for (const f of up.files) dt.items.add(f);
      t.files = dt.files;
      t.dispatchEvent(new Event('change', {bubbles: true}));
      window.__fwTarget = null;
      up.value = '';
    });
  }
  if (document.getElementById('__fw')) return;
  const fw = document.createElement('input');
  fw.type = 'file';
  fw.multiple = true;
  fw.id = '__fw';
  fw.setAttribute('aria-label', 'firmware stand-in');
  fw.style.cssText = 'position:fixed;left:0;bottom:0;width:120px;height:20px;z-index:99999;opacity:0.3';
  document.body.appendChild(fw);
  fw.addEventListener('change', async () => {
    window.__fwDone = false;
    const files = [...fw.files];
    const diag = files.find(f => f.name === 'diagram.json');
    const firm = files.find(f => f.name !== 'diagram.json');
    const btn = re => [...document.querySelectorAll('button')].find(b => re.test(b.getAttribute('aria-label') || b.title || ''));
    const stop = btn(/Stop the simulation/);
    if (stop) { stop.click(); await new Promise(r => setTimeout(r, 800)); }
    window.__fwError = null;
    if (diag) {
      try { await window.__setDiagram(await diag.text()); }
      catch (e) { window.__fwError = String(e.message || e); fw.value = ''; window.__fwDone = true; return; }
    }
    window.__fwOld = window.__serial();
    window.__fwT0 = Date.now();
    if (firm) {
      window.__fwTarget = null;
      const ed = monaco.editor.getEditors()[0];
      ed.getSupportedActions().find(a => /uploadFirmware$/.test(a.id)).run();  // no await
      for (let i = 0; i < 20 && !window.__fwTarget; i++) await new Promise(r => setTimeout(r, 100));
      const t = window.__fwTarget;
      const dt = new DataTransfer();
      dt.items.add(firm);
      t.files = dt.files;
      t.dispatchEvent(new Event('change', {bubbles: true}));
    }
    fw.value = '';
    window.__fwDone = true;
  });
})();

window.__fwWait = async function (expect, maxSec) {
  for (let i = 0; i < 50 && !window.__fwDone; i++) await new Promise(r => setTimeout(r, 100));
  if (window.__fwError) return {started: false, passed: null, secs: 0, tail: '', error: window.__fwError};
  const t0 = Date.now();
  let started = false, text = '';
  while (Date.now() - t0 < (maxSec || 20) * 1000) {
    await new Promise(r => setTimeout(r, 400));
    text = window.__serial();
    if (text !== window.__fwOld) started = true;
    if (started && expect && text.includes(expect)) break;
  }
  return {started, passed: started && expect ? text.includes(expect) : null,
          secs: Math.round((Date.now() - window.__fwT0) / 1000), tail: text.slice(-300)};
};

'firmware helpers installed';
