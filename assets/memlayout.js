/* Where does my variable live? Load after course.js.
 *
 *   <div class="widget memlayout"></div>
 *   <div class="widget memlayout" data-parts="startup"></div>     parts: quiz, map, startup (default: all three)
 *
 * 1. Sort C declarations into .text, .rodata, .data, .bss, stack and heap; each answer is explained.
 * 2. The memory map of the lesson 41 demo build (projects/0041-build-pipeline, from blink.map):
 *    flash holds the vector table, .text, .rodata and the load image of .data; RAM holds .data, .bss,
 *    the reserved heap and stack block, and the stack at the top.
 * 3. Step through the startup code: copy .data from 0x080004B8 to 0x20000000, zero .bss
 *    (0x20000008 to 0x20000028), then call main(). Turn the copy off to see what main() reads instead.
 */
(function () {
  "use strict";
  const SECTIONS = [".text", ".rodata", ".data", ".bss", "stack", "heap"];
  const ITEMS = [
    ["int main(void) { … }", "the machine code of main", ".text", "Code goes in .text, in flash. It is only read, never written, while the program runs."],
    ["const uint32_t kLookup[8] = { 0, 1, 4, 9, … };", "kLookup", ".rodata", "const with an initialiser: the values never change, so they stay in flash and cost no RAM. The demo's map file puts kLookup at 0x08000480, inside .rodata."],
    ["uint32_t g_initialised = 0x1234ABCD;", "g_initialised", ".data", "It can change, so it must run in RAM, but its starting value must survive power-off, so the value is stored in flash. The startup code copies it to RAM before main()."],
    ["uint32_t g_zeroed;", "g_zeroed", ".bss", "A global with no initialiser starts at zero. There is nothing to store in flash: the startup code clears all of .bss."],
    ["void count(void) { static int calls = 0; calls++; }", "calls", ".bss", "static gives a local a fixed address for the whole run, like a global. Its value is 0, and GCC puts zero-initialised objects in .bss, not .data."],
    ["int add(int a, int b) { int sum = a + b; return sum; }", "sum", "stack", "A local without static lives in the function's stack frame, or only in a register. It disappears when the function returns."],
    ["const char *msg = \"hello\";   /* a global */", "the pointer msg", ".data", "Only the characters are const, not the pointer: msg could be pointed elsewhere. It is a changeable global with a non-zero starting value (an address), so .data."],
    ["const char *msg = \"hello\";   /* a global */", "the characters \"hello\"", ".rodata", "A string literal is read-only data. The six bytes, with the terminating 0, sit in .rodata in flash."],
    ["uint8_t *buf = malloc(64);", "the 64 bytes buf points to", "heap", "malloc() hands out memory from the heap at run time. The pointer buf itself is a local on the stack."],
    ["static const uint8_t crc_table[256] = { … };", "crc_table", ".rodata", "static only limits who can see the name. const with an initialiser still means flash, in .rodata."],
    ["volatile uint32_t g_ticks;", "g_ticks", ".bss", "volatile changes how the compiler accesses the variable (lesson 46), not where it lives. No initialiser, so .bss."],
    ["uint8_t rx_buf[128] = { 0 };", "rx_buf", ".bss", "An initialiser of all zeros is the same as none: GCC puts the array in .bss, so the 128 bytes cost no flash."],
  ];
  // From projects/0041-build-pipeline/build/blink.map
  const FLASH = [["0x08000000", ".isr_vector", "268 B", "the vector table: initial SP, then the handler addresses"], ["0x0800010C", ".text", "752 B", "code; main() is at 0x08000270"],
    ["0x080003FC", ".rodata", "180 B", "const data; kLookup at 0x08000480"], ["0x080004B0", ".init_array, .fini_array", "8 B", "constructor and destructor pointers"],
    ["0x080004B8", ".data (load image)", "8 B", "the starting values of .data: _sidata"]];
  const RAM = [["0x20000000", ".data", "8 B", "g_initialised at 0x20000000, SystemCoreClock at 0x20000004"], ["0x20000008", ".bss", "32 B", "C library state, and g_zeroed at 0x20000024"],
    ["0x20000028", "heap and stack reserve", "1536 B", "._user_heap_stack: space the linker checks for"], ["0x20000628", "free", "18 904 B", "not used by this build"], ["0x20005000", "stack top", "", "the stack grows down from here"]];
  const WORDS = [["0x20000000", "g_initialised", ".data", 0x1234ABCD, "0x080004B8"], ["0x20000004", "SystemCoreClock", ".data", 8000000, "0x080004BC"],
    ["0x20000008", "completed.1 (crtbegin)", ".bss"], ["0x2000000C", "object.0 (crtbegin)", ".bss"], ["0x20000010", "object.0", ".bss"], ["0x20000014", "object.0", ".bss"],
    ["0x20000018", "object.0", ".bss"], ["0x2000001C", "object.0", ".bss"], ["0x20000020", "object.0", ".bss"], ["0x20000024", "g_zeroed", ".bss"]];
  const GARBAGE = [0x8F3A11C4, 0x0000E7F1, 0xDEADC0DE, 0x5A5A0F0F, 0x00000013, 0xFFFF7FFF, 0x3C3C3C3C, 0x91B0A2E4, 0x00FF00FF, 0x7E57AB1E];

  const CSS = `
  .memlayout .ml-btns{display:flex;flex-wrap:wrap;gap:.2rem}
  .memlayout .ml-btns button{font-family:var(--mono);font-size:.72rem;padding:.1rem .35rem;border:1px solid var(--rule);border-radius:3px;background:var(--bg);color:var(--fg);cursor:pointer}
  .memlayout .ml-btns button.right{background:var(--good);border-color:var(--good);color:#fff}
  .memlayout .ml-btns button.wrong{background:var(--bad-soft);border-color:var(--bad);text-decoration:line-through}
  .memlayout .ml-why{grid-column:1/-1;font-family:var(--sans);font-size:.84rem;margin:.1rem 0 .2rem}
  .memlayout .ml-why.ok{color:var(--good)} .memlayout .ml-why.no{color:var(--bad)}
  .memlayout .ml-dots{display:flex;flex-wrap:wrap;gap:.2rem;margin:.3rem 0}
  .memlayout .ml-dots button{width:1.7rem;height:1.7rem;padding:0;font-family:var(--sans);font-size:.72rem;border:1px solid var(--rule);border-radius:50%;background:var(--bg);color:var(--fg);cursor:pointer}
  .memlayout .ml-dots button.ok{background:var(--good);border-color:var(--good);color:#fff} .memlayout .ml-dots button.miss{background:var(--warn-soft);border-color:var(--warn)}
  .memlayout .ml-dots button.cur{outline:2px solid var(--accent);outline-offset:1px}
  .memlayout .ml-card{border:1px solid var(--rule);border-radius:6px;padding:.6rem .8rem;background:var(--code-bg)}
  .memlayout .ml-card code{display:block;font-size:.9rem;white-space:pre-wrap;margin-bottom:.2rem}
  .memlayout .ml-card .what{font-family:var(--sans);font-size:.88rem;margin-bottom:.4rem}
  .memlayout .ml-card .ml-btns button{font-size:.82rem;padding:.25rem .6rem}
  .memlayout .ml-score{font-family:var(--sans);font-size:.9rem;margin:.5rem 0;font-weight:600}
  .memlayout .ml-map{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:.6rem 0}
  @media(max-width:40rem){.memlayout .ml-map{grid-template-columns:1fr}}
  .memlayout .ml-col h5{margin:.2rem 0;font-family:var(--sans);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
  .memlayout .ml-blk{display:grid;grid-template-columns:6.3rem 1fr;gap:.4rem;border:1px solid var(--rule);border-radius:4px;padding:.3rem .45rem;margin:.18rem 0;font-size:.8rem;background:var(--code-bg)}
  .memlayout .ml-blk code{font-size:.75rem;color:var(--muted)}
  .memlayout .ml-blk b{font-family:var(--mono)} .memlayout .ml-blk small{display:block;font-family:var(--sans);color:var(--muted)}
  .memlayout .ml-blk.data{border-color:var(--accent);background:var(--accent-soft)} .memlayout .ml-blk.bss{border-color:#7048e8}
  .memlayout .ml-blk.free{opacity:.6}
  .memlayout .ml-ctl{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.4rem 0;font-family:var(--sans);font-size:.85rem}
  .memlayout table{font-size:.8rem;border-collapse:collapse;margin:.4rem 0}
  .memlayout td,.memlayout th{padding:.18rem .5rem;border-bottom:1px solid var(--rule);text-align:left}
  .memlayout td.v{font-family:var(--mono)} .memlayout td.v.garbage{color:var(--bad)} .memlayout td.v.fresh{background:var(--good-soft);font-weight:700}
  .memlayout .ml-step{font-family:var(--sans);font-size:.9rem;background:var(--code-bg);border-left:4px solid var(--accent);border-radius:4px;padding:.45rem .7rem;margin:.3rem 0}
  .memlayout .ml-out{font-family:var(--mono);font-size:.82rem;background:var(--code-bg);border-radius:4px;padding:.4rem .7rem;margin:.3rem 0}`;

  const hex = v => "0x" + (v >>> 0).toString(16).toUpperCase().padStart(8, "0");

  function mount(box) {
    const E = window.Course.el;
    const parts = (box.dataset.parts || "quiz,map,startup").split(",").map(x => x.trim());
    box.appendChild(E("h3", { text: box.dataset.title || "Where does each variable live?" }));
    const secQuiz = E("div"), secMap = E("div"), secStart = E("div");
    [["quiz", secQuiz], ["map", secMap], ["startup", secStart]].forEach(([k, el]) => { if (parts.includes(k)) box.appendChild(el); });
    // The quiz shows one declaration at a time; the dots jump between them and show what is done.
    secQuiz.appendChild(E("p", { class: "widget-hint", text: "Pick the section for each declaration. The explanation appears after your choice." }));
    const dots = E("div", { class: "ml-dots" }), card = E("div", { class: "ml-card" }), score = E("div", { class: "ml-score" });
    secQuiz.append(dots, card, score);
    const state = ITEMS.map(() => ({ done: false, miss: false, wrong: [] }));
    let cur = 0;
    function drawQuiz() {
      dots.innerHTML = "";
      ITEMS.forEach((_, i) => dots.appendChild(E("button", { type: "button", "aria-label": `declaration ${i + 1}`, class: (i === cur ? "cur " : "") + (state[i].done ? (state[i].miss ? "miss" : "ok") : ""), text: String(i + 1), onclick: () => { cur = i; drawQuiz(); } })));
      const [code, what, ans, why] = ITEMS[cur], S = state[cur];
      const btns = E("div", { class: "ml-btns" });
      SECTIONS.forEach(sec => btns.appendChild(E("button", { type: "button", text: sec, class: S.done && sec === ans ? "right" : S.wrong.includes(sec) ? "wrong" : "", onclick: () => {
        if (S.done) return;
        if (sec === ans) S.done = true; else { S.miss = true; if (!S.wrong.includes(sec)) S.wrong.push(sec); }
        drawQuiz();
      } })));
      const res = E("div", { class: "ml-why " + (S.done ? "ok" : S.wrong.length ? "no" : "") , text: S.done ? "✓ " + why : S.wrong.length ? `✗ Not ${S.wrong[S.wrong.length - 1]}. Try again.` : "" });
      const nav = E("div", { class: "ml-ctl" }, [
        E("button", { class: "btn secondary", type: "button", text: "◀ Previous", onclick: () => { cur = (cur + ITEMS.length - 1) % ITEMS.length; drawQuiz(); } }),
        E("button", { class: "btn" + (S.done ? "" : " secondary"), type: "button", text: "Next ▶", onclick: () => { cur = (cur + 1) % ITEMS.length; drawQuiz(); } })]);
      card.innerHTML = "";
      card.append(E("code", { text: code }), E("div", { class: "what", text: `${cur + 1} of ${ITEMS.length}. Where is ${what}?` }), btns, res, nav);
      const done = state.filter(x => x.done).length, first = state.filter(x => x.done && !x.miss).length;
      score.textContent = done ? `${done} of ${ITEMS.length} placed, ${first} at the first try.` : "";
    }
    drawQuiz();

    secMap.appendChild(E("h4", { text: "The demo build of lesson 41, from its map file" }));
    const col = (title, rows) => E("div", { class: "ml-col" }, [E("h5", { text: title }), ...rows.slice().reverse().map(([a, n, sz, note]) =>
      E("div", { class: "ml-blk" + (n.startsWith(".data") ? " data" : n === ".bss" ? " bss" : n === "free" ? " free" : "") }, [E("code", { text: a }), E("div", {}, [E("b", { text: n }), sz ? " " + sz : "", E("small", { text: note })])]))]);
    secMap.appendChild(E("div", { class: "ml-map" }, [col("Flash, from 0x08000000 (high addresses at the top)", FLASH), col("RAM, from 0x20000000 (20 kB)", RAM)]));
    secMap.appendChild(E("p", { class: "widget-hint", text: "The blue .data appears twice: its bytes are stored in flash at 0x080004B8 (the load address) and used in RAM at 0x20000000 (the run address). .bss has only a run address." }));

    secStart.appendChild(E("h4", { text: "Run the startup code, one step at a time" }));
    let step = 0, skipCopy = false;
    const stepBox = E("div", { class: "ml-step" }), tbl = E("div"), out = E("div", { class: "ml-out" });
    const skip = E("input", { type: "checkbox" }); skip.addEventListener("change", () => { skipCopy = skip.checked; step = 0; render(); });
    secStart.append(E("div", { class: "ml-ctl" }, [E("button", { class: "btn", type: "button", text: "Next step", onclick: () => { if (step < STEPS.length - 1) step++; render(); } }),
      E("button", { class: "btn secondary", type: "button", text: "Reset", onclick: () => { step = 0; render(); } }), E("label", {}, [skip, " a broken startup file that skips the .data copy"])]), stepBox, tbl, out);
    const STEPS = [
      "Reset. The core loads SP from address 0x08000000 (0x20005000) and PC from 0x08000004, the Reset_Handler. RAM holds whatever it held before: garbage, or random values after power-up.",
      "Copy .data: the loop reads the words from _sidata (0x080004B8) in flash and writes them from _sdata (0x20000000) up to _edata (0x20000008) in RAM.",
      "Zero .bss: the loop writes 0 to every word from _sbss (0x20000008) up to _ebss (0x20000028).",
      "Call SystemInit() and the constructors in .init_array, then main(). main() prints the value of g_initialised.",
    ];
    function render() {
      const vals = WORDS.map((w, i) => ({ v: GARBAGE[i], cls: "garbage" }));
      if (step >= 1 && !skipCopy) WORDS.forEach((w, i) => { if (w[2] === ".data") vals[i] = { v: w[3], cls: step === 1 ? "fresh" : "" }; });
      if (step >= 2) WORDS.forEach((w, i) => { if (w[2] === ".bss") vals[i] = { v: 0, cls: step === 2 ? "fresh" : "" }; });
      stepBox.innerHTML = `<b>Step ${step + 1} of ${STEPS.length}.</b> ` + (step === 1 && skipCopy ? "The broken startup file skips the copy, so the .data words keep their garbage." : STEPS[step]);
      tbl.innerHTML = "";
      const t = E("table");
      t.appendChild(E("tr", {}, ["RAM address", "what lives there", "section", "value"].map(h => E("th", { text: h }))));
      WORDS.forEach((w, i) => t.appendChild(E("tr", {}, [E("td", { class: "v", text: w[0] }), E("td", { text: w[1] }), E("td", { text: w[2] }),
        E("td", { class: "v " + vals[i].cls, text: hex(vals[i].v) + (w[1] === "SystemCoreClock" && vals[i].v === 8000000 ? " (8 000 000)" : "") })])));
      tbl.appendChild(t);
      out.textContent = step < 3 ? "(main has not run yet)" : `g_initialised value: ${hex(vals[0].v)}` + (vals[0].v === 0x1234ABCD ? "      ← the project's EXPECT line" : "      ← garbage: the program reads a value nobody wrote");
    }
    render();
  }
  function init() {
    if (!document.getElementById("memlayout-css")) { const s = document.createElement("style"); s.id = "memlayout-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.memlayout").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
