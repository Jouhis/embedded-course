/* The bootloader's slot check (lesson 104). Load after course.js.
 *
 *   <div class="widget bootcheck"></div>
 *
 * The checks of slot_is_valid() in projects/0104-bootloader-and-app/solution/main.c, in its order:
 * magic 0x41505031 ("APP1"), vector offset 0x200, image_end inside the 48 KiB slot and past the vector
 * table, the initial SP in (0x20000000, 0x20005000], bit 0 of the reset handler set (Thumb), and the reset
 * handler inside the image. The first failure stops the check and the bootloader stays put.
 * The lesson's values: SP 0x20005000, reset 0x08004201. image_end 0x08006000 is an example.
 */
(function () {
  "use strict";
  const BASE = 0x08004000, SLOT = 48 * 1024, OFF = 0x200, RAM = 0x20000000, RAMSZ = 20 * 1024, MAGIC = 0x41505031;
  const hx = v => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const GOOD = { magic: MAGIC, version: 0x00010000, end: 0x08006000, off: OFF, sp: 0x20005000, reset: 0x08004201 };
  const PRESETS = [
    ["The lesson's image", {}],
    ["Erased flash", { magic: 0xFFFFFFFF, version: 0xFFFFFFFF, end: 0xFFFFFFFF, off: 0xFFFFFFFF, sp: 0xFFFFFFFF, reset: 0xFFFFFFFF }],
    ["Even reset address", { reset: 0x08004200 }],
    ["Vector offset 0x100", { off: 0x100 }],
    ["Stack above RAM", { sp: 0x20005004 }],
    ["Reset handler in the bootloader", { reset: 0x08000135 }],
    ["Image longer than the slot", { end: 0x08010004 }]];
  const FIELDS = [["magic", "header word 0: magic"], ["version", "header word 1: version"], ["end", "header word 2: image_end"], ["off", "header word 3: vector_offset"], ["sp", "vector word 0: initial SP"], ["reset", "vector word 1: reset handler"]];
  const CHECKS = [
    ["h->magic == APP_IMAGE_MAGIC", v => v.magic === MAGIC, v => (v.magic === MAGIC ? `${hx(v.magic)} is "APP1": the slot holds an image` : `${hx(v.magic)} is not 0x41505031, "APP1"`) + (v.magic === 0xFFFFFFFF ? ": erased flash reads as all ones" : "")],
    ["h->vector_offset == 0x200", v => v.off === OFF, v => v.off === OFF ? "the vector table is 512 bytes in, at 0x08004200" : `${hx(v.off)}: VTOR needs a 512-byte boundary, and the bootloader expects exactly 0x200`],
    ["first < image_end <= slot end", v => v.end > BASE + OFF && v.end <= BASE + SLOT, v => `${hx(v.end)} must be above ${hx(BASE + OFF)} and at most ${hx(BASE + SLOT)}, the end of the 48 KiB slot`],
    ["RAM base < SP <= RAM top", v => v.sp > RAM && v.sp <= RAM + RAMSZ, v => `${hx(v.sp)} must be above 0x20000000 and at most 0x20005000; the stack starts at the top and grows down`],
    ["(reset & 1) != 0", v => (v.reset & 1) === 1, v => (v.reset & 1) ? `bit 0 of ${hx(v.reset)} is 1: a Thumb address` : `bit 0 of ${hx(v.reset)} is 0: a branch there would leave Thumb state and fault`],
    ["BASE <= reset < image_end", v => v.reset >= BASE && v.reset < v.end, v => `${hx(v.reset)} must lie from ${hx(BASE)} up to image_end ${hx(v.end)}`]];
  const CSS = `
  .bootcheck .bc-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.45rem 0;font-family:var(--sans);font-size:.85rem}
  .bootcheck .btn{font-size:.75rem;padding:.15rem .5rem}
  .bootcheck .bc-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:.35rem .8rem;margin:.5rem 0}
  .bootcheck .bc-fields label{display:flex;justify-content:space-between;gap:.4rem;align-items:center;font-family:var(--sans);font-size:.8rem}
  .bootcheck input{font-family:var(--mono);font-size:.82rem;width:7.5rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px;padding:.2rem .3rem}
  .bootcheck input.chg{border-color:var(--warn);background:var(--warn-soft)}
  .bootcheck ol{list-style:none;padding:0;margin:.5rem 0}
  .bootcheck li{display:grid;grid-template-columns:1.6rem minmax(0,1fr);gap:.3rem;padding:.3rem .4rem;border-radius:4px;margin:.15rem 0;font-family:var(--sans);font-size:.84rem}
  .bootcheck li code{font-family:var(--mono);font-size:.8rem;font-weight:700}
  .bootcheck li.ok{background:var(--good-soft)} .bootcheck li.bad{background:var(--bad-soft)} .bootcheck li.skip{color:var(--muted)}
  .bootcheck li .ic{font-weight:700;text-align:center}
  .bootcheck .bc-uart{font-family:var(--mono);font-size:.82rem;background:#111;color:#d0f0c0;border-radius:4px;padding:.4rem .6rem;white-space:pre;overflow-x:auto}`;

  function mount(box) {
    const E = window.Course.el;
    const st = Object.assign({}, GOOD);
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "Does the bootloader trust this slot?" }));
    box.appendChild(E("p", { class: "widget-hint", text: "These are the words the bootloader reads from the slot at 0x08004000 and from the vector table at 0x08004200. Load a broken image, or change a word, and see which check stops it." }));
    const pre = E("div", { class: "bc-row" });
    PRESETS.forEach(([t, p]) => pre.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { Object.assign(st, GOOD, p); render(); } })));
    const fields = E("div", { class: "bc-fields" }), list = E("ol"), uart = E("div", { class: "bc-uart", "aria-live": "polite" });
    const inputs = {};
    FIELDS.forEach(([k, label]) => { const i = E("input", { "aria-label": label }); i.addEventListener("change", () => { const v = parseInt(i.value.trim().replace(/^0x/i, ""), 16); if (Number.isFinite(v)) st[k] = v >>> 0; render(); }); inputs[k] = i; fields.appendChild(E("label", {}, [label, i])); });
    box.append(pre, fields, E("div", { class: "bc-row", text: "slot_is_valid(), in its order:" }), list, uart);
    function render() {
      Object.entries(inputs).forEach(([k, i]) => { i.value = hx(st[k]); i.classList.toggle("chg", st[k] !== GOOD[k]); });
      list.innerHTML = ""; let failed = -1;
      CHECKS.forEach(([code, test, why], n) => {
        const ran = failed < 0, ok = ran && test(st); if (ran && !ok) failed = n;
        list.appendChild(E("li", { class: !ran ? "skip" : ok ? "ok" : "bad" }, [E("span", { class: "ic", text: !ran ? "–" : ok ? "✓" : "✗" }), E("span", { html: `<code>${code}</code><br>${ran ? why(st) : "not checked: an earlier check failed"}` })]));
      });
      uart.textContent = "BOOT: checking application slot\n" + (failed < 0 ? `BOOT: image valid, jumping\n(VTOR = 0x08004200, MSP = ${hx(st.sp)}, branch to ${hx(st.reset)})` : "BOOT: no valid image, staying in the bootloader");
    }
    render();
  }
  function init() {
    if (!document.getElementById("bootcheck-css")) { const s = document.createElement("style"); s.id = "bootcheck-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.bootcheck").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
