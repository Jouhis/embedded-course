/* Race stepper: two contexts share memory, and you choose who runs the next instruction.
 * Load after course.js.
 *
 *   <div class="widget racestep" data-preset="cores"></div>     presets: cores (lesson 64), isr-flag (57), odr (47), volatile (46)
 *
 * A context is either a "core" (it steps one instruction per click) or an "isr" (it runs to the end in one
 * go, unless interrupts are masked: then it is pending and runs when they are restored). The guard option
 * rewrites the code with the lesson's fix: a hardware spinlock, a critical section, or a BSRR store.
 */
(function () {
  "use strict";
  const hx = (v, n) => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(n || 8, "0");
  const I = (t, f, x) => Object.assign({ t, f }, x || {});

  const PRESETS = {
    volatile: {
      title: "The wait loop, as the compiler wrote it",
      intro: "This is the code GCC 14 made from while (gflag == 0) { }. Step it, fire the interrupt that sets gflag, and keep stepping. Does the loop ever notice?",
      guard: "Declare the flag volatile (the compiler's code for extern volatile uint32_t vflag)",
      mem: () => ({ gflag: 0 }), fmt: { gflag: v => String(v) },
      a: { name: "main", kind: "core" }, b: { name: "ISR", kind: "isr", button: "Fire the interrupt" },
      hint: "Step main a few times, fire the interrupt, then keep stepping.",
      prog: (guard, who) => {
        if (who === "b") return [I("gflag = 1;", m => { m.gflag = 1; })];
        return guard ? [
          I("     ldr  r2, =vflag   @ address", (m, R) => { R.r2 = 0x20000004; }),
          I(".L8: ldr r3, [r2]     @ load", (m, R) => { R.r3 = m.gflag; }),
          I("     cmp  r3, #0", null),
          I("     beq  .L8          @ 0: load again", (m, R) => (R.r3 === 0 ? { jump: 1 } : null)),
          I("     bx   lr           @ return", null)]
          : [
          I("     ldr  r3, =gflag   @ the address", (m, R) => { R.r3 = 0x20000004; }),
          I("     ldr  r3, [r3]     @ load once", (m, R) => { R.r3 = m.gflag; }),
          I("     cbz  r3, .L3      @ 0: go to .L3", (m, R) => (R.r3 === 0 ? { jump: 4 } : null)),
          I("     bx   lr           @ return", () => ({ jump: 5 })),
          I(".L3: b    .L3          @ forever", () => ({ jump: 4 }))];
      },
      regs: (who, g) => (who === "a" ? (g ? ["r2", "r3"] : ["r3"]) : []), rfmt: v => (v > 255 ? hx(v) : String(v)),
      bad: ["a", "a", "a", "b", "a", "a", "a"],
      check: s => {
        if (s.done.a) return { cls: "ok", text: s.presses ? "The loop read gflag again after the interrupt, saw 1 and returned." : "The flag was already set, so the loop returned at once. Reset, and fire the interrupt while the loop is waiting." };
        if (s.presses && s.after >= 4) return { cls: "bad", text: s.guard ? "Keep stepping: the next load reads the new value." : "gflag is 1 in memory, but the loop is stuck at b .L3: it never loads the flag again. Without volatile, the compiler read it once and kept the copy in r3." };
        return null;
      }
    },
    cores: {
      title: "Two cores, one counter",
      intro: "Each core runs shared++, which the compiler turns into a load, an add and a store. Step the cores in any order. Can you make an increment disappear?",
      guard: "Take the hardware spinlock around shared++ (spin_lock_blocking / spin_unlock)",
      mem: () => ({ shared: 5 }), fmt: { shared: v => String(v) },
      a: { name: "core 0", kind: "core" }, b: { name: "core 1", kind: "core" },
      prog: (guard, who) => {
        const r = who === "a" ? "r3" : "r2";
        const body = [I(`ldr  ${r}, [shared]     @ load`, (m, R) => { R[r] = m.shared; }), I(`adds ${r}, ${r}, #1      @ add 1`, (m, R) => { R[r] = R[r] + 1; }), I(`str  ${r}, [shared]     @ store`, (m, R) => { m.shared = R[r]; })];
        return guard ? [I("spin_lock_blocking(lock);", null, { take: true }), ...body, I("spin_unlock(lock, saved);", null, { give: true })] : body;
      },
      regs: who => (who === "a" ? ["r3"] : ["r2"]),
      bad: ["a", "b", "a", "b", "a", "b"],
      check: s => {
        if (!s.done.a || !s.done.b) return null;
        return s.m.shared === 7 ? { cls: "ok", text: "shared is 7: both increments arrived. " + (s.guard ? "The second core spun on the lock until the first had stored, so the two read-add-store sequences could not overlap." : "This order happened to be safe: one core finished before the other loaded.") }
          : { cls: "bad", text: `shared is ${s.m.shared}, not 7. Both cores loaded 5 before either stored, so the second store overwrote the first increment. Nothing reports the loss.` };
      },
      many: true
    },
    "isr-flag": {
      title: "The flag and the count, read in three steps",
      intro: "Press 1 has happened and has not been reported: press_count is 1 and press_pending is true. Step main's report, and press the button (the ISR) at any point. Is press 2 always reported?",
      guard: "Wrap steps 1 to 3 in a critical section (save_and_disable_interrupts / restore_interrupts)",
      mem: () => ({ press_pending: 1, press_count: 1 }), fmt: { press_pending: v => (v ? "true" : "false"), press_count: v => String(v) },
      a: { name: "main loop", kind: "core" }, b: { name: "on_button (ISR)", kind: "isr", button: "Press the button" },
      prog: (guard, who) => {
        if (who === "b") return [I("press_count++;", m => { m.press_count++; }), I("press_pending = true;", m => { m.press_pending = 1; })];
        const body = [I("bool pending = press_pending;   // 1", (m, R) => { R.pending = m.press_pending; }), I("uint32_t total = press_count;   // 2", (m, R) => { R.total = m.press_count; }), I("press_pending = false;          // 3", m => { m.press_pending = 0; })];
        const print = I('if (pending) printf("presses=%u", total);', (m, R, s) => { if (R.pending) s.out.push("presses=" + R.total); });
        return guard ? [I("saved = save_and_disable_interrupts();", null, { mask: "on" }), ...body, I("restore_interrupts(saved);", null, { mask: "off" }), print] : [...body, print];
      },
      regs: who => (who === "a" ? ["pending", "total"] : []), rfmt: (v, r) => (r === "pending" ? (v ? "true" : "false") : String(v)),
      bad: ["a", "a", "b", "a", "a"],
      check: s => {
        if (!s.done.a) return null;
        const last = s.out.length ? +s.out[s.out.length - 1].split("=")[1] : 0;
        if (s.pending) return null;
        if (s.m.press_count > last && !s.m.press_pending) return { cls: "bad", text: `press_count is ${s.m.press_count}, but main printed presses=${last} and the flag is clear. Press ${s.m.press_count} will not be reported until another press sets the flag again. The ISR ran between step 2 and step 3.` };
        if (s.m.press_count > last) return { cls: "ok", text: `press_count is ${s.m.press_count} and the flag is still set, so the next pass of the loop reports it. ` + (s.guard && s.presses ? "The press came while interrupts were masked, so the ISR waited and ran at restore_interrupts()." : "") };
        return { cls: "ok", text: `main printed presses=${last}, and nothing is left unreported.` + (s.guard ? " Steps 1 to 3 ran as one unit." : s.presses ? "" : " Now try again and press the button between steps 2 and 3.") };
      }
    },
    odr: {
      title: "Read-modify-write on ODR, with an interrupt",
      intro: "main sets PC13 with GPIOC->ODR |= 1u << 13, which is a load, an OR and a store. An ISR sets PC5 in the same register. Fire the interrupt between main's load and its store.",
      guard: "Use BSRR: one store that sets only the pins it names",
      mem: () => ({ ODR: 0 }), fmt: { ODR: v => hx(v) },
      a: { name: "main", kind: "core" }, b: { name: "ISR: set PC5", kind: "isr", button: "Fire the interrupt" },
      prog: (guard, who) => {
        if (who === "b") return guard ? [I("GPIOC->BSRR = 1u << 5;", m => { m.ODR |= 0x20; })] : [I("GPIOC->ODR |= 1u << 5;", m => { m.ODR |= 0x20; })];
        return guard ? [I("GPIOC->BSRR = 1u << 13;  // one store", m => { m.ODR |= 0x2000; })]
          : [I("ldr r3, [ODR]          @ load 0x4001100C", (m, R) => { R.r3 = m.ODR; }), I("orr r3, r3, #0x2000   @ set bit 13 in the copy", (m, R) => { R.r3 = (R.r3 | 0x2000) >>> 0; }), I("str r3, [ODR]          @ store the copy", (m, R) => { m.ODR = R.r3; })];
      },
      regs: (who, g) => (who === "a" && !g ? ["r3"] : []), rfmt: v => hx(v),
      bad: ["a", "b", "a", "a"],
      check: s => {
        if (!s.done.a) return null;
        const has5 = !!(s.m.ODR & 0x20);
        if (!s.presses) return { cls: "ok", text: `ODR is ${hx(s.m.ODR)}: PC13 is set. With no interrupt, the read-modify-write is correct. Reset and fire the interrupt between the load and the store.` };
        return has5 ? { cls: "ok", text: `ODR is ${hx(s.m.ODR)}: both PC13 and PC5 are set.` + (s.guard ? " Neither side read ODR, so neither could write back a stale copy." : " This time the interrupt did not fall between the load and the store.") }
          : { cls: "bad", text: `ODR is ${hx(s.m.ODR)}: PC5 is low again. main loaded ODR before the ISR set bit 5, and stored its old copy back over it. Nothing reports the loss.` };
      }
    }
  };

  const CSS = `
  .racestep .rs-row{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;margin:.45rem 0;font-family:var(--sans);font-size:.85rem}
  .racestep label{display:flex;gap:.35rem;align-items:flex-start;max-width:100%}
  .racestep .btn{font-size:.78rem;padding:.2rem .6rem}
  .racestep .rs-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.6rem}
  .racestep .rs-cols.wide{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)}
  @media (max-width:560px){.racestep .rs-cols,.racestep .rs-cols.wide{grid-template-columns:minmax(0,1fr)}}
  .racestep .rs-ctx{border:1px solid var(--rule);border-radius:6px;padding:.45rem .55rem;background:var(--code-bg);min-width:0}
  .racestep .rs-ctx h4{margin:0 0 .3rem;font-size:.88rem;display:flex;justify-content:space-between;gap:.4rem;flex-wrap:wrap}
  .racestep .rs-ctx h4 span{font-weight:400;font-family:var(--sans);font-size:.75rem;color:var(--muted)}
  .racestep .rs-code{font-family:var(--mono);font-size:.74rem;overflow-x:auto;white-space:pre;margin:.2rem 0}
  .racestep .rs-code div{padding:.05rem .3rem;border-left:3px solid transparent}
  .racestep .rs-code div.done{color:var(--muted)} .racestep .rs-code div.next{border-left-color:var(--accent);background:var(--accent-soft);font-weight:700}
  .racestep .rs-code div.spin{border-left-color:var(--warn);background:var(--warn-soft)}
  .racestep .rs-regs{font-family:var(--mono);font-size:.78rem;margin:.25rem 0}
  .racestep .rs-mem{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0}
  .racestep .rs-mem div{border:2px solid var(--accent);border-radius:6px;padding:.25rem .6rem;font-family:var(--mono);font-size:.85rem}
  .racestep .rs-mem div.chg{background:var(--warn-soft)}
  .racestep .rs-mem div small{display:block;font-family:var(--sans);font-size:.7rem;color:var(--muted)}
  .racestep .rs-many{min-height:3.2rem;margin:0 0 .4rem}
  .racestep .rs-log{font-family:var(--mono);font-size:.74rem;height:9rem;box-sizing:border-box;overflow:auto;border:1px solid var(--rule);border-radius:4px;padding:.3rem .5rem;margin:.4rem 0}
  .racestep .rs-log .o{color:var(--good);font-weight:700}
  .racestep .rs-res{font-family:var(--sans);font-size:.9rem;min-height:3.95rem;box-sizing:border-box;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .racestep .rs-res.ok{background:var(--good-soft);border-left-color:var(--good)} .racestep .rs-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}`;

  // Many runs of the two-core counter: each core does some other work between increments.
  function manyRuns(n, guard, seed) {
    let x = seed >>> 0 || 1; const r = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    let shared = 0, lock = null; const c = [0, 1].map(() => ({ left: n, pc: 0, reg: 0, work: Math.floor(r() * 40) }));
    while (c[0].left || c[1].left) {
      const k = r() < 0.5 ? 0 : 1, o = c[k]; if (!o.left) continue;
      if (o.work > 0) { o.work--; continue; }
      if (guard && o.pc === 0) { if (lock !== null && lock !== k) continue; lock = k; }
      if (o.pc === 0) o.reg = shared; else if (o.pc === 1) o.reg++; else shared = o.reg;
      if (++o.pc === 3) { o.pc = 0; o.left--; o.work = Math.floor(r() * 40); if (guard) lock = null; }
    }
    return shared;
  }

  function mount(box) {
    const E = window.Course.el;
    const key = box.dataset.preset in PRESETS ? box.dataset.preset : "cores", P = PRESETS[key];
    let s;
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || P.title }));
    box.appendChild(E("p", { class: "widget-hint", text: P.intro }));
    const gChk = E("input", { type: "checkbox" });
    gChk.addEventListener("change", reset);
    box.appendChild(E("div", { class: "rs-row" }, [E("label", {}, [gChk, P.guard])]));
    const cols = E("div", { class: "rs-cols" + (P.b.kind === "isr" ? " wide" : "") }), mem = E("div", { class: "rs-mem" }), res = E("div", { class: "rs-res" }), logEl = E("div", { class: "rs-log", "aria-live": "polite" });
    const ctl = E("div", { class: "rs-row" }, [
      E("button", { class: "btn secondary", type: "button", text: "Reset", onclick: reset }),
      E("button", { class: "btn secondary", type: "button", text: "Show me a bad order", onclick: () => { reset(); P.bad.forEach(w => (w === "b" && P.b.kind === "isr" ? fire() : step(w))); render(); } })]);
    box.append(cols, E("h4", { text: "Shared memory", style: "margin:.6rem 0 0;font-size:.88rem" }), mem, ctl, res, logEl);
    if (P.many) {
      const out = E("div", { class: "widget-hint rs-many", text: "Not run yet: press the button to run both cores 100,000 times." });
      box.appendChild(E("div", { class: "rs-row" }, [E("button", { class: "btn", type: "button", text: "Run 100 000 increments on each core", onclick: () => {
        const seed = (Date.now() & 0xffff) + 1, v = manyRuns(100000, gChk.checked, seed);
        out.textContent = `Total ${v.toLocaleString("en-US")} of 200,000` + (v === 200000 ? ": none lost." : `: ${(200000 - v).toLocaleString("en-US")} increments lost.`) + " (A model: each core does a random amount of other work between increments.)";
      } })]));
      box.appendChild(out);
    }

    function reset() {
      const g = gChk.checked;
      s = { guard: g, m: P.mem(), R: { a: {}, b: {} }, pc: { a: 0, b: 0 }, prog: { a: P.prog(g, "a"), b: P.prog(g, "b") }, lock: null, masked: false, pending: 0, presses: 0, after: 0, ran: { a: new Set(), b: new Set() }, done: { a: false, b: P.b.kind === "isr" }, out: [], log: [], spin: null, chg: null };
      render();
    }
    const log = (t, o) => s.log.push([t, o]);
    function exec(who, ins) {
      let ret = null;
      if (ins.mask === "on") { s.masked = true; log(`${P[who].name}: interrupts masked`); }
      if (ins.mask === "off") { s.masked = false; log(`${P[who].name}: interrupts restored`); }
      const before = JSON.stringify(s.m), nOut = s.out.length;
      if (ins.f) ret = ins.f(s.m, s.R[who], s);
      if (JSON.stringify(s.m) !== before) s.chg = Object.keys(s.m).find(k => JSON.parse(before)[k] !== s.m[k]);
      if (s.out.length > nOut) log(`${P[who].name} prints ${s.out[s.out.length - 1]}`, true);
      return ret;
    }
    function step(who) {
      const prog = s.prog[who];
      if (s.pc[who] >= prog.length) return;
      const ins = prog[s.pc[who]];
      s.chg = null; s.spin = null;
      if (ins.take) {
        if (s.lock && s.lock !== who) { s.spin = who; log(`${P[who].name} spins: the lock is held by ${P[s.lock].name}`); return; }
        s.lock = who; log(`${P[who].name} takes the lock`);
      }
      if (ins.give) { s.lock = null; log(`${P[who].name} releases the lock`); }
      if (!ins.take && !ins.give && !ins.mask) log(`${P[who].name}: ${ins.t.split(/\s+(@|\/\/)/)[0].trim()}`);
      s.ran[who].add(s.pc[who]);
      const ret = exec(who, ins);
      s.pc[who] = ret && ret.jump !== undefined ? ret.jump : s.pc[who] + 1;
      if (who === "a" && s.presses) s.after++;
      if (s.pc[who] >= prog.length) s.done[who] = true;
      if (!s.masked) while (s.pending) { s.pending--; runIsr(true); }
    }
    function runIsr(late) {
      s.chg = null;
      log(`${P.b.name} runs${late ? " (it was pending)" : ""}`);
      s.prog.b.forEach(ins => exec("b", ins));
    }
    function fire() {
      s.presses++;
      if (s.masked) { s.pending++; log(`interrupt arrives, but interrupts are masked: it is pending`); }
      else runIsr(false);
    }
    function ctx(who) {
      const C = P[who], prog = s.prog[who], pc = s.pc[who];
      const code = E("div", { class: "rs-code" });
      prog.forEach((ins, i) => code.appendChild(E("div", { class: C.kind === "isr" ? "" : i === pc ? (s.spin === who ? "next spin" : "next") : s.ran[who].has(i) ? "done" : "", text: ins.t })));
      const regs = P.regs(who, s.guard).map(r => `${r} = ${r in s.R[who] ? (P.rfmt || String)(s.R[who][r], r) : "?"}`).join("   ");
      let btn;
      if (C.kind === "isr") btn = E("button", { class: "btn", type: "button", text: C.button + (s.pending ? " (pending)" : ""), onclick: () => { fire(); render(); } });
      else { btn = E("button", { class: "btn", type: "button", text: pc >= prog.length ? "finished" : `Step ${C.name}`, onclick: () => { step(who); render(); } }); if (pc >= prog.length) btn.disabled = true; }
      const tag = C.kind === "isr" ? (s.masked ? "masked" : "runs to the end when it fires") : s.lock === who ? "holds the lock" : "";
      return E("div", { class: "rs-ctx" }, [E("h4", {}, [C.name, E("span", { text: tag })]), code, regs ? E("div", { class: "rs-regs", text: regs }) : E("span"), btn]);
    }
    function render() {
      cols.innerHTML = ""; cols.append(ctx("a"), ctx("b"));
      mem.innerHTML = "";
      Object.keys(s.m).forEach(k => mem.appendChild(E("div", { class: s.chg === k ? "chg" : "" }, [E("small", { text: k }), P.fmt[k](s.m[k])])));
      const r = P.check(s);
      res.className = "rs-res" + (r ? " " + r.cls : "");
      res.textContent = r ? r.text : P.hint || "Step the code and choose when the other side runs. The result appears when the code has finished.";
      logEl.innerHTML = s.log.length ? s.log.map(([t, o]) => `<div class="${o ? "o" : ""}">${t.replace(/</g, "&lt;")}</div>`).join("") : "<div>Nothing has run yet.</div>";
      logEl.scrollTop = logEl.scrollHeight;
    }
    reset();
  }
  window.RaceStep = { PRESETS, manyRuns };
  function init() {
    if (!document.getElementById("racestep-css")) { const st = document.createElement("style"); st.id = "racestep-css"; st.textContent = CSS; document.head.appendChild(st); }
    document.querySelectorAll(".widget.racestep").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
