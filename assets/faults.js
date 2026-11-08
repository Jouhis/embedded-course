/* Fault widgets for lesson 39. Load after course.js.
 *
 * 1. Fault status decoder (Cortex-M3): click bits or type CFSR and HFSR; it decodes them in the order a
 *    fault handler should, HFSR first, then the three CFSR groups, and says which address register to trust.
 *      <div class="widget faultdecode" data-hfsr="0x40000000" data-cfsr="0x00008200"></div>
 *    Bit names and positions: core_cm3.h; meanings: PM0056 Rev 7, sections 4.4.10 and 4.4.11.
 *
 * 2. MPU checker (RP2040, Cortex-M0+, 8 regions): edit the regions, then try an access. It shows which
 *    regions match, that the highest-numbered match wins, and what the core does: on the M0+ every MPU
 *    violation is a HardFault (RP2040 datasheet, section 2.4.6.1).
 *      <div class="widget mpusim"></div>
 */
(function () {
  "use strict";

  const CFSR_BITS = {
    0: ["IACCVIOL", "MemManage", "instruction access violation: the core fetched from a region that forbids it (for example execute-never). MMFAR is not written."],
    1: ["DACCVIOL", "MemManage", "data access violation: a load or store broke a region's permission. MMFAR holds the address if MMARVALID is set."],
    3: ["MUNSTKERR", "MemManage", "the unstacking at an exception return hit a protection violation."],
    4: ["MSTKERR", "MemManage", "the stacking at exception entry hit a protection violation, often a stack that ran into a guard region."],
    7: ["MMARVALID", "MemManage", "MMFAR holds the address of the faulting access."],
    8: ["IBUSERR", "BusFault", "instruction bus error: the fetch of an instruction failed."],
    9: ["PRECISERR", "BusFault", "precise data bus error: the stacked PC points at the faulting instruction, and BFAR holds the address if BFARVALID is set."],
    10: ["IMPRECISERR", "BusFault", "imprecise data bus error: the stacked PC is not the faulting instruction (a buffered write failed later), and BFAR is not written."],
    11: ["UNSTKERR", "BusFault", "the unstacking at an exception return caused a bus error."],
    12: ["STKERR", "BusFault", "the stacking at exception entry caused a bus error, often a stack pointer outside RAM."],
    15: ["BFARVALID", "BusFault", "BFAR holds the address of the faulting access."],
    16: ["UNDEFINSTR", "UsageFault", "the core tried to execute an undefined instruction."],
    17: ["INVSTATE", "UsageFault", "invalid state: the core tried to execute with the Thumb bit clear, typically a branch to an even address such as a bad function pointer."],
    18: ["INVPC", "UsageFault", "invalid PC load at an exception return: a bad EXC_RETURN value."],
    19: ["NOCP", "UsageFault", "no coprocessor: the instruction needs a coprocessor that is not there."],
    24: ["UNALIGNED", "UsageFault", "an unaligned access that the core does not allow (or any unaligned access when UNALIGN_TRP is set)."],
    25: ["DIVBYZERO", "UsageFault", "a divide by zero, when DIV_0_TRP is set (otherwise the result is 0 and nothing faults)."],
  };
  const HFSR_BITS = {
    1: ["VECTTBL", "a bus fault while reading the vector table during exception processing."],
    30: ["FORCED", "a configurable fault was escalated to HardFault: the real cause is in CFSR."],
    31: ["DEBUGEVT", "a debug event caused the HardFault (only with a debugger)."],
  };
  const GROUPS = [["MemManage", 0, 7, "MMFSR"], ["BusFault", 8, 15, "BFSR"], ["UsageFault", 16, 31, "UFSR"]];
  const PRESETS = [
    ["Worked example: escalated bus error", 0x40000000, 0x00008200],
    ["Worked example: unaligned access", 0x00000000, 0x01000000],
    ["Bad function pointer", 0x40000000, 0x00020000],
    ["Stack pointer ran out of RAM", 0x40000000, 0x00001000],
    ["Write to a guarded region (part with an MPU)", 0x40000000, 0x00000082],
    ["Divide by zero, trap enabled", 0x00000000, 0x02000000],
  ];

  const CSS = `
  .faultdecode .fd-in{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:center;margin:.5rem 0}
  .faultdecode .fd-in label{font-family:var(--sans);font-size:.85rem}
  .faultdecode input,.mpusim input,.mpusim select{font-family:var(--mono);font-size:.85rem;padding:.25rem .4rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px}
  .faultdecode input{width:8.5rem}
  .faultdecode .fd-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0 .6rem}
  .faultdecode .fd-presets .btn,.mpusim .mp-presets .btn{font-size:.75rem;padding:.15rem .5rem}
  .faultdecode .fd-reg{margin:.4rem 0 .6rem}
  .faultdecode .fd-bits{display:flex;flex-wrap:wrap;gap:1px}
  .faultdecode .fd-bit{display:flex;flex-direction:column;align-items:center}
  .faultdecode .fd-bit button{width:1.05rem;height:1.7rem;padding:0;font-family:var(--mono);font-size:.75rem;border:1px solid var(--rule);border-radius:3px;cursor:pointer;color:var(--fg);background:var(--bg)}
  .faultdecode .fd-bit.named button{border-color:var(--g)}
  .faultdecode .fd-bit button.one{background:var(--g);color:#fff;border-color:var(--g)}
  .faultdecode .fd-bit small{font-family:var(--mono);font-size:.55rem;color:var(--muted)}
  .faultdecode .fd-bit.gap{margin-left:.45rem}
  .faultdecode .gMM{--g:#c2255c} .faultdecode .gBF{--g:#d9480f} .faultdecode .gUF{--g:#7048e8} .faultdecode .gHF{--g:var(--bad)}
  .faultdecode .fd-legend{display:flex;flex-wrap:wrap;gap:.2rem 1rem;font-family:var(--sans);font-size:.72rem;color:var(--muted);margin:.25rem 0}
  .faultdecode .fd-legend span::before{content:"";display:inline-block;width:.7rem;height:.7rem;border-radius:2px;background:var(--g);margin-right:.3rem;vertical-align:-1px}
  .faultdecode ol.fd-out{font-family:var(--sans);font-size:.88rem;margin:.4rem 0 0;padding-left:1.4rem}
  .faultdecode ol.fd-out li{margin:.3rem 0}
  .faultdecode .tag{display:inline-block;font-family:var(--mono);font-size:.75rem;font-weight:700;color:#fff;background:var(--g);border-radius:3px;padding:0 .3rem;margin-right:.3rem}
  .mpusim table{font-size:.8rem;border-collapse:collapse;margin:.4rem 0}
  .mpusim th,.mpusim td{padding:.2rem .35rem;border-bottom:1px solid var(--rule);text-align:left}
  .mpusim td input[type=text]{width:6.8rem}
  .mpusim tr.match td{background:var(--warn-soft)} .mpusim tr.mp-win td{background:var(--accent-soft)} .mpusim tr.mp-win td:first-child{font-weight:700;box-shadow:inset 4px 0 0 var(--accent)}
  .mpusim td small{display:block;font-family:var(--sans);font-size:.7rem;color:var(--muted);margin-top:.15rem;max-width:14rem}
  .mpusim tr.bad td input{border-color:var(--bad)}
  .mpusim .mp-try{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.6rem 0 .3rem}
  .mpusim .mp-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0}
  .mpusim .mp-res{font-family:var(--sans);font-size:.9rem;padding:.6rem .8rem;border-radius:4px;margin:.5rem 0;min-height:8.7rem;box-sizing:border-box}
  .mpusim .mp-res.ok{background:var(--good-soft);border-left:4px solid var(--good)}
  .mpusim .mp-res.fault{background:var(--bad-soft);border-left:4px solid var(--bad)}
  .mpusim .mp-opts{font-family:var(--sans);font-size:.85rem;display:flex;flex-wrap:wrap;gap:.3rem 1.2rem;margin:.3rem 0}
  .mpusim .mp-scroll{overflow-x:auto}`;

  const hex = (x, w = 8) => "0x" + (x >>> 0).toString(16).toUpperCase().padStart(w, "0");
  const parseHex = t => { t = String(t).trim().replace(/[_\s]/g, ""); return /^(0x)?[0-9a-f]{1,8}$/i.test(t) ? parseInt(t.replace(/^0x/i, ""), 16) >>> 0 : NaN; };

  function injectCss() {
    if (document.getElementById("faults-css")) return;
    const s = document.createElement("style");
    s.id = "faults-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------------ fault status decoder
  function mountDecoder(box) {
    const E = window.Course.el;
    let hfsr = parseHex(box.dataset.hfsr || "0x40000000"), cfsr = parseHex(box.dataset.cfsr || "0x00008200");
    box.appendChild(E("h3", { text: box.dataset.title || "Decode the fault status registers" }));
    const hIn = E("input", { type: "text", spellcheck: "false", "aria-label": "HFSR" });
    const cIn = E("input", { type: "text", spellcheck: "false", "aria-label": "CFSR" });
    const apply = () => { const h = parseHex(hIn.value), c = parseHex(cIn.value); if (!isNaN(h)) hfsr = h; if (!isNaN(c)) cfsr = c; render(); };
    [hIn, cIn].forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") apply(); }));
    box.appendChild(E("div", { class: "fd-in" }, [E("label", {}, ["HFSR ", hIn]), E("label", {}, ["CFSR ", cIn]),
      E("button", { class: "btn", type: "button", text: "Decode", onclick: apply })]));
    box.appendChild(E("div", { class: "fd-presets" }, PRESETS.map(([t, h, c]) =>
      E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { hfsr = h; cfsr = c; render(); } }))));
    const regs = E("div"), out = E("ol", { class: "fd-out" });
    box.append(regs, E("div", { class: "fd-legend", html: '<span class="gHF">HardFault (HFSR)</span><span class="gMM">MemManage</span><span class="gBF">BusFault</span><span class="gUF">UsageFault</span>' }),
      E("h4", { text: "Decoded, in the order a handler reads them" }), out);

    function bitRow(name, value, named, groupOf, onFlip) {
      const row = E("div", { class: "fd-bits" });
      for (let b = 31; b >= 0; b--) {
        const one = (value >>> b) & 1, n = named[b], g = groupOf(b);
        const btn = E("button", { type: "button", class: one ? "one" : "", text: String(one), title: n ? `bit ${b}: ${n[0]}` : `bit ${b} (reserved)` });
        btn.addEventListener("click", () => onFlip(b));
        row.appendChild(E("div", { class: `fd-bit g${g}` + (n ? " named" : "") + (b % 8 === 7 && b !== 31 ? " gap" : "") }, [btn, E("small", { text: String(b) })]));
      }
      return E("div", { class: "fd-reg" }, [E("h4", { text: `${name} = ${hex(value)}` }), row]);
    }
    const groupOf = b => (b < 8 ? "MM" : b < 16 ? "BF" : "UF");

    function render() {
      hIn.value = hex(hfsr); cIn.value = hex(cfsr);
      regs.innerHTML = "";
      regs.appendChild(bitRow("HFSR", hfsr, HFSR_BITS, () => "HF", b => { hfsr = (hfsr ^ (1 << b)) >>> 0; render(); }));
      regs.appendChild(bitRow("CFSR", cfsr, CFSR_BITS, groupOf, b => { cfsr = (cfsr ^ (1 << b)) >>> 0; render(); }));
      const steps = [];
      // 1. HFSR
      const hb = Object.keys(HFSR_BITS).map(Number).filter(b => (hfsr >>> b) & 1);
      if (!hfsr) steps.push("HFSR is 0: the HardFault handler did not run, or this is a configurable fault taken by its own handler. Go straight to CFSR.");
      else steps.push(`HFSR = ${hex(hfsr)}: ` + (hb.length ? hb.map(b => `<span class="tag gHF">${HFSR_BITS[b][0]}</span>bit ${b}, ${HFSR_BITS[b][1]}`).join(" ") : "only reserved bits are set, which a real core does not do."));
      // 2. CFSR groups
      GROUPS.forEach(([g, lo, hi, short]) => {
        const field = (cfsr >>> lo) & ((1 << (hi - lo + 1)) - 1);
        const set = [];
        for (let b = lo; b <= hi; b++) if ((cfsr >>> b) & 1) set.push(b);
        const cls = "g" + groupOf(lo);
        if (!set.length) { steps.push(`${g} group (${short}, bits ${lo} to ${hi}) is 0: no ${g} fault.`); return; }
        steps.push(`${g} group (${short}, bits ${lo} to ${hi}) = ${hex(field, 2)}: ` + set.map(b => CFSR_BITS[b]
          ? `<div><span class="tag ${cls}">${CFSR_BITS[b][0]}</span>bit ${b}${b >= 16 ? ` (bit ${b - 16} of the UFSR)` : b >= 8 ? ` (bit ${b - 8} of the BFSR)` : ""}: ${CFSR_BITS[b][2]}</div>`
          : `<div>bit ${b} is reserved: check the value you copied.</div>`).join(""));
      });
      // 3. Which address to trust
      const addr = [];
      if ((cfsr >>> 15) & 1) addr.push("BFARVALID is set, so read <b>BFAR</b> (0xE000ED38): it holds the faulting data address.");
      else if (cfsr & 0xFF00) addr.push("BFARVALID is clear, so do not trust BFAR.");
      if ((cfsr >>> 7) & 1) addr.push("MMARVALID is set, so read <b>MMFAR</b> (0xE000ED34).");
      else if (cfsr & 0xFF) addr.push("MMARVALID is clear, so do not trust MMFAR.");
      if (cfsr) addr.push("Find the instruction from the <b>stacked PC</b> in the exception frame (lesson 34)" + ((cfsr >>> 10) & 1 ? ", but for an imprecise bus error it points past the store that failed." : "."));
      if (addr.length) steps.push(addr.join(" "));
      if (!cfsr && !hfsr) steps.length = 0, steps.push("Both registers are 0: no fault is recorded.");
      out.innerHTML = steps.map(s => `<li>${s}</li>`).join("");
    }
    render();
  }

  // ------------------------------------------------------------------ MPU checker (Armv6-M MPU, as on the RP2040)
  const SIZES = []; for (let k = 8; k <= 32; k++) SIZES.push(k);   // 2^k bytes: 256 B up to 4 GB
  const sizeName = k => (k >= 30 ? `${2 ** (k - 30)} GB` : k >= 20 ? `${2 ** (k - 20)} MB` : k >= 10 ? `${2 ** (k - 10)} kB` : `${2 ** k} B`);
  const AP = { none: "no access", priv: "privileged only", ro: "read-only", rw: "read/write" };

  function mountMpu(box) {
    const E = window.Course.el;
    const regions = [
      { on: true, base: 0x10000000, size: 21, ap: "ro", xn: false, name: "flash (XIP): code and constants" },
      { on: true, base: 0x20000000, size: 19, ap: "rw", xn: true, name: "SRAM: data, no code" },
      { on: true, base: 0x40000000, size: 28, ap: "priv", xn: true, name: "APB peripherals: drivers only" },
      { on: true, base: 0x20041000, size: 8, ap: "none", xn: true, name: "stack guard: the 256 B below the stack" },
    ];
    while (regions.length < 8) regions.push({ on: false, base: 0, size: 8, ap: "rw", xn: false, name: "" });
    let mpuOn = true, privdef = false;
    let test = { addr: 0x10001000, kind: "write", priv: true };

    box.appendChild(E("h3", { text: box.dataset.title || "The MPU, one access at a time (RP2040)" }));
    const opts = E("div", { class: "mp-opts" });
    const tableWrap = E("div", { class: "mp-scroll" });
    const tryRow = E("div", { class: "mp-try" });
    const presets = E("div", { class: "mp-presets" });
    const res = E("div", { class: "mp-res" });
    box.append(opts, tableWrap, E("h4", { text: "Try an access" }), tryRow, presets, res);

    const check = (label, get, set) => { const c = E("input", { type: "checkbox" }); c.checked = get(); c.addEventListener("change", () => { set(c.checked); render(); }); return E("label", {}, [c, " " + label]); };
    opts.append(check("MPU enabled", () => mpuOn, v => { mpuOn = v; }),
      check("PRIVDEFENA: privileged code may use the default map where no region matches", () => privdef, v => { privdef = v; }));

    const addrIn = E("input", { type: "text", spellcheck: "false", "aria-label": "Address", value: hex(test.addr) });
    const kindSel = E("select", { "aria-label": "Access" }, [["read", "read (load)"], ["write", "write (store)"], ["exec", "execute (fetch)"]].map(([v, t]) => E("option", { value: v, text: t })));
    const privSel = E("select", { "aria-label": "Privilege" }, [["1", "privileged (handler, kernel)"], ["0", "unprivileged (a task)"]].map(([v, t]) => E("option", { value: v, text: t })));
    const run = () => { const a = parseHex(addrIn.value); if (!isNaN(a)) test.addr = a; test.kind = kindSel.value; test.priv = privSel.value === "1"; render(); };
    [kindSel, privSel].forEach(s => s.addEventListener("change", run));
    addrIn.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
    tryRow.append(addrIn, kindSel, privSel, E("button", { class: "btn", type: "button", text: "Check", onclick: run }));
    [["write to flash", 0x10001000, "write", true], ["run code from SRAM", 0x20000400, "exec", true], ["a task writes a GPIO register", 0x40014004, "write", false],
     ["the driver does the same", 0x40014004, "write", true], ["push into the stack guard", 0x20041080, "write", true], ["read the SIO (no region)", 0xD0000004, "read", true]]
      .forEach(([t, a, k, p]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t,
        onclick: () => { test = { addr: a, kind: k, priv: p }; addrIn.value = hex(a); kindSel.value = k; privSel.value = p ? "1" : "0"; render(); } })));
    kindSel.value = test.kind; privSel.value = "1";

    function allowed(r, kind, priv) {
      if (kind === "exec" && r.xn) return [false, "the region is execute-never (XN)"];
      if (r.ap === "none") return [false, "the region allows no access"];
      if (r.ap === "priv" && !priv) return [false, "the region is for privileged code only"];
      if (r.ap === "ro" && kind === "write") return [false, "the region is read-only"];
      return [true, ""];
    }

    function render() {
      tableWrap.innerHTML = "";
      const t = E("table");
      t.appendChild(E("tr", {}, ["#", "on", "base (what it is for)", "size", "access", "XN"].map(h => E("th", { text: h }))));
      const matches = [];
      regions.forEach((r, i) => {
        const end = r.base + 2 ** r.size - 1;
        const aligned = r.base % 2 ** r.size === 0;
        const hit = r.on && aligned && test.addr >= r.base && test.addr <= end;
        if (hit) matches.push(i);
        const tr = E("tr", { class: (hit ? "match" : "") + (r.on && !aligned ? " bad" : "") });
        const on = E("input", { type: "checkbox" }); on.checked = r.on; on.addEventListener("change", () => { r.on = on.checked; render(); });
        const base = E("input", { type: "text", spellcheck: "false", value: hex(r.base), title: aligned ? "" : "The base must be a multiple of the size" });
        base.addEventListener("change", () => { const v = parseHex(base.value); if (!isNaN(v)) r.base = v; render(); });
        const size = E("select", {}, SIZES.map(k => { const o = E("option", { value: k, text: sizeName(k) }); if (k === r.size) o.selected = true; return o; }));
        size.addEventListener("change", () => { r.size = +size.value; render(); });
        const ap = E("select", {}, Object.entries(AP).map(([k, v]) => { const o = E("option", { value: k, text: v }); if (k === r.ap) o.selected = true; return o; }));
        ap.addEventListener("change", () => { r.ap = ap.value; render(); });
        const xn = E("input", { type: "checkbox" }); xn.checked = r.xn; xn.addEventListener("change", () => { r.xn = xn.checked; render(); });
        const note = E("small", { text: r.on && !aligned ? "⚠ the base is not a multiple of the size, so the region is ignored" : r.name });
        [[String(i)], [on], [base, note], [size], [ap], [xn]].forEach(c => tr.appendChild(E("td", {}, c)));
        t.appendChild(tr);
      });
      tableWrap.appendChild(t);

      const what = { read: "read from", write: "write to", exec: "execute code at" }[test.kind];
      const who = test.priv ? "Privileged code" : "An unprivileged task";
      let ok, why;
      if (!mpuOn) { ok = true; why = "The MPU is disabled, so every access uses the default memory map."; }
      else if (!matches.length) {
        if (privdef && test.priv) { ok = true; why = "No region matches, but PRIVDEFENA lets privileged code use the default map."; }
        else { ok = false; why = `No enabled region covers ${hex(test.addr)}` + (privdef ? ", and PRIVDEFENA only helps privileged code." : ", and PRIVDEFENA is off, so an address outside every region is forbidden."); }
      } else {
        const win = matches[matches.length - 1];
        t.querySelectorAll("tr")[win + 1].classList.add("mp-win");
        const [a, reason] = allowed(regions[win], test.kind, test.priv);
        ok = a;
        why = (matches.length > 1 ? `Regions ${matches.join(" and ")} both cover it; the highest number wins, so region ${win} decides. ` : `Region ${win} covers it. `) +
          (a ? `Its rule allows this ${test.kind === "exec" ? "fetch" : test.kind}.` : `It is refused: ${reason}.`);
      }
      res.className = "mp-res " + (ok ? "ok" : "fault");
      res.innerHTML = `<b>${who} tries to ${what} ${hex(test.addr)}.</b> ${why} ` + (ok ? "<b>The access goes ahead.</b>"
        : `<b>HardFault.</b> The RP2040's Cortex-M0+ has no MemManage exception, so every MPU violation is a HardFault (datasheet section 2.4.6.1). On a Cortex-M3 with an MPU the same access would be a MemManage fault with ${test.kind === "exec" ? "IACCVIOL" : "DACCVIOL and MMARVALID set, and MMFAR = " + hex(test.addr)}.`);
    }
    render();
  }

  window.Faults = { CFSR_BITS, HFSR_BITS };
  function init() {
    injectCss();
    document.querySelectorAll(".widget.faultdecode").forEach(mountDecoder);
    document.querySelectorAll(".widget.mpusim").forEach(mountMpu);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
