/* Memory map explorer for lessons 37 and 38. Load after course.js.
 *
 *   <div class="widget memmap" data-chip="stm32f103" data-address="0x40011010" data-title="..."></div>
 *
 * data-chip: "stm32f103" or "rp2040" (the learner can switch). Type any address, or click a region or a
 * register, and the widget splits the address into region, peripheral block, base and offset, and names the
 * register when it is in the table below. A drill asks for the address of a named register.
 *
 * Every number here comes from lesson 38 and its sources: the RP2040 datasheet (sections 2.2.1, 2.3.1.7,
 * 2.15.7, 2.19.6), the Pico SDK's addressmap.h, stm32f103xb.h and RM0008 (Table 3, section 9.2), and
 * core_cm3.h for the system control space. Keep them in step with the lesson.
 */
(function () {
  "use strict";

  const CHIPS = {
    stm32f103: {
      name: "STM32F103 (Blue Pill)",
      regions: [
        { name: "Code: flash", start: 0x08000000, end: 0x0801FFFF, note: "128 kB of flash on the F103xB (FLASH_BASE)" },
        { name: "System memory", start: 0x1FFFF000, end: 0x1FFFF7FF, note: "ST's built-in bootloader" },
        { name: "SRAM", start: 0x20000000, end: 0x20004FFF, note: "20 kB (SRAM_BASE)" },
        { name: "SRAM bit-band alias", start: 0x22000000, end: 0x23FFFFFF, note: "one word per SRAM bit (bit-banding, a Cortex-M3 feature; the RP2040 has none)", bitband: 0x20000000 },
        { name: "Peripherals", start: 0x40000000, end: 0x40023FFF, note: "PERIPH_BASE: APB1 from 0x40000000, APB2 from 0x40010000, AHB from 0x40018000" },
        { name: "Peripheral bit-band alias", start: 0x42000000, end: 0x43FFFFFF, note: "one word per peripheral bit (bit-banding, a Cortex-M3 feature; the RP2040 has none)", bitband: 0x40000000 },
        { name: "Cortex-M3 private peripherals", start: 0xE0000000, end: 0xE00FFFFF, note: "SysTick, NVIC and the system control block" },
      ],
      blocks: [
        { name: "TIM2", base: 0x40000000, bus: "APB1", regs: [["CR1", 0x00], ["CR2", 0x04], ["DIER", 0x0C], ["SR", 0x10], ["CNT", 0x24], ["PSC", 0x28], ["ARR", 0x2C]] },
        { name: "USART2", base: 0x40004400, bus: "APB1", regs: USART() },
        { name: "I2C1", base: 0x40005400, bus: "APB1", regs: [["CR1", 0x00], ["CR2", 0x04], ["OAR1", 0x08], ["DR", 0x10], ["SR1", 0x14], ["SR2", 0x18], ["CCR", 0x1C]] },
        { name: "AFIO", base: 0x40010000, bus: "APB2", regs: [["EVCR", 0x00], ["MAPR", 0x04], ["EXTICR1", 0x08]] },
        { name: "EXTI", base: 0x40010400, bus: "APB2", regs: [["IMR", 0x00], ["EMR", 0x04], ["RTSR", 0x08], ["FTSR", 0x0C], ["SWIER", 0x10], ["PR", 0x14]] },
        { name: "GPIOA", base: 0x40010800, bus: "APB2", regs: GPIO() },
        { name: "GPIOB", base: 0x40010C00, bus: "APB2", regs: GPIO() },
        { name: "GPIOC", base: 0x40011000, bus: "APB2", regs: GPIO() },
        { name: "ADC1", base: 0x40012400, bus: "APB2", regs: [["SR", 0x00], ["CR1", 0x04], ["CR2", 0x08], ["DR", 0x4C]] },
        { name: "USART1", base: 0x40013800, bus: "APB2", regs: USART() },
        { name: "DMA1", base: 0x40020000, bus: "AHB", regs: [["ISR", 0x00], ["IFCR", 0x04], ["CCR1", 0x08], ["CNDTR1", 0x0C], ["CPAR1", 0x10], ["CMAR1", 0x14]] },
        { name: "RCC", base: 0x40021000, bus: "AHB", regs: [["CR", 0x00], ["CFGR", 0x04], ["CIR", 0x08], ["APB2RSTR", 0x0C], ["APB1RSTR", 0x10], ["AHBENR", 0x14], ["APB2ENR", 0x18], ["APB1ENR", 0x1C], ["BDCR", 0x20], ["CSR", 0x24]] },
        { name: "FLASH (interface)", base: 0x40022000, bus: "AHB", regs: [["ACR", 0x00], ["KEYR", 0x04], ["SR", 0x0C], ["CR", 0x10]] },
        { name: "SysTick", base: 0xE000E010, bus: "PPB", size: 0x10, regs: [["CTRL", 0x0], ["LOAD", 0x4], ["VAL", 0x8], ["CALIB", 0xC]] },
        { name: "NVIC", base: 0xE000E100, bus: "PPB", size: 0x400, regs: [["ISER0", 0x000], ["ISER1", 0x004], ["ICER0", 0x080], ["ISPR0", 0x100], ["ICPR0", 0x180], ["IPR0", 0x300]] },
        { name: "SCB", base: 0xE000ED00, bus: "PPB", size: 0x90, regs: [["CPUID", 0x00], ["ICSR", 0x04], ["VTOR", 0x08], ["AIRCR", 0x0C], ["SCR", 0x10], ["CCR", 0x14], ["SHCSR", 0x24], ["CFSR", 0x28], ["HFSR", 0x2C], ["MMFAR", 0x34], ["BFAR", 0x38]] },
      ],
      blockSize: 0x400,
      presets: [["GPIOC->BSRR", 0x40011010], ["RCC->APB2ENR", 0x40021018], ["USART1->DR", 0x40013804], ["SCB->CFSR", 0xE000ED28], ["a word in SRAM", 0x20000100], ["bit-band: PC13 of ODR", 0x422201B4]],
    },
    rp2040: {
      name: "RP2040 (Pico)",
      regions: [
        { name: "ROM", start: 0x00000000, end: 0x00003FFF, note: "16 kB bootrom" },
        { name: "XIP: flash window", start: 0x10000000, end: 0x1FFFFFFF, note: "flash through the XIP cache (lesson 36), with its aliases" },
        { name: "SRAM", start: 0x20000000, end: 0x20041FFF, note: "264 kB in six banks" },
        { name: "APB peripherals", start: 0x40000000, end: 0x4FFFFFFF, note: "clocks, GPIO bank, UARTs, timers; each block has a 16 kB slot with its atomic aliases" },
        { name: "AHB-Lite peripherals", start: 0x50000000, end: 0x5FFFFFFF, note: "DMA, USB, PIO" },
        { name: "SIO (single-cycle IO)", start: 0xD0000000, end: 0xDFFFFFFF, note: "on the cores' IO ports, not behind the APB bridge" },
        { name: "Cortex-M0+ private peripherals", start: 0xE0000000, end: 0xEFFFFFFF, note: "NVIC, SysTick and the system control block" },
      ],
      blocks: [
        { name: "CLOCKS", base: 0x40008000, bus: "APB", alias: true, regs: [["CLK_REF_CTRL", 0x30], ["CLK_SYS_CTRL", 0x3C], ["CLK_PERI_CTRL", 0x48]] },
        { name: "RESETS", base: 0x4000C000, bus: "APB", alias: true, regs: [["RESET", 0x0], ["WDSEL", 0x4], ["RESET_DONE", 0x8]] },
        { name: "IO_BANK0", base: 0x40014000, bus: "APB", alias: true, regs: [["GPIO0_STATUS", 0x000], ["GPIO0_CTRL", 0x004], ["GPIO25_STATUS", 0x0C8], ["GPIO25_CTRL", 0x0CC]] },
        { name: "PADS_BANK0", base: 0x4001C000, bus: "APB", alias: true, regs: [["VOLTAGE_SELECT", 0x00], ["GPIO0", 0x04], ["GPIO25", 0x68]] },
        { name: "UART0", base: 0x40034000, bus: "APB", alias: true, regs: [["UARTDR", 0x000], ["UARTFR", 0x018], ["UARTIBRD", 0x024], ["UARTFBRD", 0x028], ["UARTLCR_H", 0x02C], ["UARTCR", 0x030]] },
        { name: "TIMER", base: 0x40054000, bus: "APB", alias: true, regs: [["TIMEHR", 0x08], ["TIMELR", 0x0C], ["TIMERAWH", 0x24], ["TIMERAWL", 0x28]] },
        { name: "DMA", base: 0x50000000, bus: "AHB-Lite", alias: true, regs: [["CH0_READ_ADDR", 0x000], ["CH0_WRITE_ADDR", 0x004], ["CH0_TRANS_COUNT", 0x008], ["CH0_CTRL_TRIG", 0x00C]] },
        { name: "PIO0", base: 0x50200000, bus: "AHB-Lite", alias: true, regs: [["CTRL", 0x000], ["FSTAT", 0x004], ["TXF0", 0x010], ["RXF0", 0x020]] },
        { name: "SIO", base: 0xD0000000, bus: "IOPORT", size: 0x180, regs: [["CPUID", 0x000], ["GPIO_IN", 0x004], ["GPIO_OUT", 0x010], ["GPIO_OUT_SET", 0x014], ["GPIO_OUT_CLR", 0x018], ["GPIO_OUT_XOR", 0x01C], ["GPIO_OE", 0x020], ["GPIO_OE_SET", 0x024], ["GPIO_OE_CLR", 0x028]] },
        { name: "SysTick", base: 0xE000E010, bus: "PPB", size: 0x10, regs: [["SYST_CSR", 0x0], ["SYST_RVR", 0x4], ["SYST_CVR", 0x8], ["SYST_CALIB", 0xC]] },
        { name: "NVIC", base: 0xE000E100, bus: "PPB", size: 0x400, regs: [["NVIC_ISER", 0x000], ["NVIC_ICER", 0x080], ["NVIC_ISPR", 0x100], ["NVIC_ICPR", 0x180], ["NVIC_IPR0", 0x300]] },
        { name: "SCB", base: 0xE000ED00, bus: "PPB", size: 0x40, regs: [["CPUID", 0x00], ["ICSR", 0x04], ["VTOR", 0x08], ["AIRCR", 0x0C], ["SCR", 0x10], ["CCR", 0x14], ["SHPR2", 0x1C], ["SHPR3", 0x20]] },
      ],
      blockSize: 0x4000,
      presets: [["SIO GPIO_OUT_CLR", 0xD0000018], ["IO_BANK0 GPIO25_CTRL", 0x400140CC], ["the same, atomic SET alias", 0x400160CC], ["UART0 UARTDR", 0x40034000], ["XIP flash", 0x10000100], ["SCB->VTOR", 0xE000ED08]],
    },
  };
  function GPIO() { return [["CRL", 0x00], ["CRH", 0x04], ["IDR", 0x08], ["ODR", 0x0C], ["BSRR", 0x10], ["BRR", 0x14], ["LCKR", 0x18]]; }
  function USART() { return [["SR", 0x00], ["DR", 0x04], ["BRR", 0x08], ["CR1", 0x0C], ["CR2", 0x10], ["CR3", 0x14], ["GTPR", 0x18]]; }
  const ALIAS = ["normal", "XOR (atomic toggle) alias", "SET (atomic set) alias", "CLR (atomic clear) alias"];

  const CSS = `
  .memmap .mm-top{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.5rem 0}
  .memmap select,.memmap input{font:inherit;font-size:.9rem;padding:.3rem .4rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px}
  .memmap input{font-family:var(--mono);width:9.5rem}
  .memmap .mm-grid{display:grid;grid-template-columns:minmax(13rem,17rem) 1fr;gap:1rem;margin-top:.5rem}
  @media(max-width:40rem){.memmap .mm-grid{grid-template-columns:1fr}}
  .memmap .mm-map{display:flex;flex-direction:column-reverse;gap:2px}
  .memmap .mm-reg{display:flex;justify-content:space-between;gap:.5rem;padding:.35rem .5rem;border-radius:4px;border:1px solid var(--rule);background:var(--code-bg);cursor:pointer;font-size:.8rem;font-family:var(--sans);text-align:left;color:var(--fg)}
  .memmap .mm-reg code{font-size:.72rem;color:var(--muted);white-space:nowrap}
  .memmap .mm-reg.on{border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 4px 0 0 var(--accent)}
  .memmap .mm-gap{font-size:.65rem;color:var(--muted);text-align:center;font-family:var(--mono)}
  .memmap .mm-sum{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;font-family:var(--mono);margin:.25rem 0 .75rem}
  .memmap .mm-sum span.box{border:1px solid var(--rule);border-radius:4px;padding:.25rem .5rem;text-align:center}
  .memmap .mm-sum span.box small{display:block;font-family:var(--sans);font-size:.65rem;color:var(--muted)}
  .memmap .mm-sum .base{border-color:var(--warn);background:var(--warn-soft)} .memmap .mm-sum .off{border-color:var(--accent);background:var(--accent-soft)}
  .memmap .mm-sum .res{border-color:var(--good);background:var(--good-soft);font-weight:700}
  .memmap .mm-path{font-family:var(--sans);font-size:.88rem;margin:.2rem 0 .6rem}
  .memmap .mm-path b{color:var(--accent)}
  .memmap .mm-regs{display:flex;flex-wrap:wrap;gap:.25rem;margin:.3rem 0 .6rem}
  .memmap .mm-regs button{font-family:var(--mono);font-size:.72rem;padding:.15rem .4rem;border:1px solid var(--rule);border-radius:3px;background:var(--bg);color:var(--fg);cursor:pointer}
  .memmap .mm-regs button.on{background:var(--accent);color:var(--bg);border-color:var(--accent)}
  .memmap .mm-presets{display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0}
  .memmap .mm-presets .btn{font-size:.75rem;padding:.15rem .5rem}
  .memmap .mm-warn{font-family:var(--sans);font-size:.85rem;color:var(--bad)}
  .memmap .mm-drill{border-top:1px solid var(--rule);margin-top:.75rem;padding-top:.5rem}
  .memmap .mm-drill .task{font-family:var(--mono);margin:.3rem 0}`;

  const hex = (x, w = 8) => "0x" + (x >>> 0).toString(16).toUpperCase().padStart(w, "0");
  const short = x => "0x" + (x >>> 0).toString(16).toUpperCase();

  function injectCss() {
    if (document.getElementById("memmap-css")) return;
    const s = document.createElement("style");
    s.id = "memmap-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* Decode an address on a chip: { region, block, reg, offset, alias, bitband } (missing parts undefined). */
  function decode(chip, a) {
    a = a >>> 0;
    const out = { addr: a };
    out.region = chip.regions.find(r => a >= r.start && a <= r.end);
    if (out.region && out.region.bitband !== undefined) {
      const off = a - out.region.start;
      out.bitband = { target: out.region.bitband + (off >>> 5 & ~3), bit: (off >>> 2) & 31 };
      return out;
    }
    for (const b of chip.blocks) {
      const size = b.size || chip.blockSize;
      if (a >= b.base && a < b.base + size) {
        out.block = b;
        let off = a - b.base;
        if (b.alias) { out.alias = off >>> 12; off &= 0xFFF; }
        out.offset = off;
        const r = b.regs.find(([, o]) => o === off);
        if (r) out.reg = r[0];
        break;
      }
    }
    return out;
  }

  function mount(box) {
    const E = window.Course.el;
    let chipKey = box.dataset.chip in CHIPS ? box.dataset.chip : "stm32f103";
    let addr = parseInt(box.dataset.address || "0", 16) >>> 0;
    box.appendChild(E("h3", { text: box.dataset.title || "Memory map explorer" }));
    const chipSel = E("select", { "aria-label": "Chip" }, Object.entries(CHIPS).map(([k, c]) => {
      const o = E("option", { value: k, text: c.name }); if (k === chipKey) o.selected = true; return o; }));
    const input = E("input", { type: "text", spellcheck: "false", "aria-label": "Address", value: hex(addr) });
    const go = E("button", { class: "btn", type: "button", text: "Decode" });
    box.appendChild(E("div", { class: "mm-top" }, [chipSel, input, go]));
    const presets = E("div", { class: "mm-presets" });
    box.appendChild(presets);
    const map = E("div", { class: "mm-map" });
    const detail = E("div");
    box.appendChild(E("div", { class: "mm-grid" }, [E("div", {}, [E("h4", { text: "Address space (not to scale, low at the bottom)" }), map]), detail]));
    const drill = E("div", { class: "mm-drill" });
    box.appendChild(drill);

    function setAddr(a) { addr = a >>> 0; input.value = hex(addr); render(); }
    function parse() {
      const t = input.value.trim().replace(/[_\s]/g, "");
      const v = /^0x[0-9a-f]+$/i.test(t) ? parseInt(t, 16) : /^\d+$/.test(t) ? parseInt(t, 10) : NaN;
      if (!isNaN(v) && v <= 0xFFFFFFFF) setAddr(v);
    }
    go.addEventListener("click", parse);
    input.addEventListener("keydown", e => { if (e.key === "Enter") parse(); });
    chipSel.addEventListener("change", () => { chipKey = chipSel.value; setAddr(CHIPS[chipKey].presets[0][1]); newTask(); });

    function render() {
      const chip = CHIPS[chipKey], d = decode(chip, addr);
      presets.innerHTML = "";
      chip.presets.forEach(([label, a]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: label, onclick: () => setAddr(a) })));
      map.innerHTML = "";
      chip.regions.forEach((r, i) => {
        if (i) map.appendChild(E("div", { class: "mm-gap", text: "⋮" }));
        map.appendChild(E("button", { class: "mm-reg" + (d.region === r ? " on" : ""), type: "button", onclick: () => setAddr(r.start) },
          [E("span", { text: r.name }), E("code", { text: hex(r.start) })]));
      });

      detail.innerHTML = "";
      detail.appendChild(E("h4", { text: "What is at " + hex(addr) }));
      if (!d.region) {
        detail.appendChild(E("p", { class: "mm-warn", text: "Nothing is mapped here on this chip. A load or store to this address is a bus fault (lesson 39)." }));
        return renderDrill();
      }
      const path = [`<b>${d.region.name}</b> (${hex(d.region.start)} to ${hex(d.region.end)}): ${d.region.note}.`];
      if (d.bitband) {
        path.push(`This is a bit-band alias: the word at ${hex(addr)} reads and writes <b>bit ${d.bitband.bit}</b> of the word at <b>${hex(d.bitband.target)}</b> on its own.`);
        path.push(`alias = ${hex(d.region.start)} + (${short(d.bitband.target - d.region.bitband)} × 32) + (${d.bitband.bit} × 4)`);
        const t = decode(chip, d.bitband.target);
        if (t.block) path.push(`That word is ${t.block.name}${t.reg ? "->" + t.reg : " + " + short(t.offset)}.`);
      } else if (d.block) {
        path.push(`Bus: <b>${d.block.bus}</b>. Peripheral block: <b>${d.block.name}</b>, base ${hex(d.block.base)}.`);
        if (d.alias) path.push(`Offset bits 13 and 12 are ${d.alias.toString(2).padStart(2, "0")}: this is the <b>${ALIAS[d.alias]}</b> of the register at ${hex(d.block.base + d.offset)} (lesson 37).`);
      } else if (d.region.name.startsWith("Peripherals") || d.region.name.startsWith("APB") || d.region.name.startsWith("AHB")) {
        path.push("No block in this explorer's table starts here. The datasheet's memory map lists every block.");
      }
      detail.appendChild(E("div", { class: "mm-path", html: path.map(p => `<p>${p}</p>`).join("") }));
      if (d.block) {
        const sum = E("div", { class: "mm-sum" }, [
          E("span", { class: "box base" }, [hex(d.block.base), E("small", { text: d.block.name + " base" })]), "+",
          ...(d.alias ? [E("span", { class: "box" }, [short(d.alias << 12), E("small", { text: "alias" })]), "+"] : []),
          E("span", { class: "box off" }, [short(d.offset), E("small", { text: d.reg ? d.reg + " offset" : "offset" })]), "=",
          E("span", { class: "box res" }, [hex(addr), E("small", { text: d.reg ? `${d.block.name}->${d.reg}` : "no register in the table at this offset" })]),
        ]);
        detail.appendChild(sum);
        detail.appendChild(E("h4", { text: `Registers of ${d.block.name} in this table (click one)` }));
        detail.appendChild(E("div", { class: "mm-regs" }, d.block.regs.map(([n, o]) =>
          E("button", { type: "button", class: d.reg === n ? "on" : "", text: `${n} +${short(o)}`, onclick: () => setAddr(d.block.base + (d.alias << 12 || 0) + o) }))));
        if (addr % 4) detail.appendChild(E("p", { class: "mm-warn", text: "This address is not a multiple of 4. Peripheral registers are 32-bit words: use the word address." }));
      }
      renderDrill();
    }

    // ---- drill: give the address of a named register
    let task = null;
    function newTask() {
      const chip = CHIPS[chipKey];
      const b = chip.blocks[Math.floor(Math.random() * chip.blocks.length)];
      const [n, o] = b.regs[Math.floor(Math.random() * b.regs.length)];
      task = { label: `${b.name}->${n}`, base: b.base, off: o, a: b.base + o, done: false };
      renderDrill();
    }
    function renderDrill() {
      if (!task) return;
      drill.innerHTML = "";
      drill.appendChild(E("h4", { text: "Your turn: find the address" }));
      const inp = E("input", { type: "text", spellcheck: "false", placeholder: "0x…", "aria-label": "Your address" });
      const fb = E("div", { class: "q-feedback" });
      const check = () => {
        const t = inp.value.trim();
        const v = /^0x[0-9a-f]+$/i.test(t) ? parseInt(t, 16) >>> 0 : NaN;
        if (isNaN(v)) return;
        const ok = v === task.a;
        fb.className = "q-feedback show " + (ok ? "good" : "bad");
        fb.textContent = ok ? `Correct: ${hex(task.base)} + ${short(task.off)} = ${hex(task.a)}.`
          : `Not quite. Find ${task.label.split("->")[0]} in the map first: the base is ${hex(task.base)}, then add the offset of ${task.label.split("->")[1]}.`;
      };
      inp.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
      drill.append(E("div", { class: "task", text: `What is the address of ${task.label}?` }),
        E("div", { class: "q-input-row" }, [inp, E("button", { class: "btn", type: "button", text: "Check", onclick: check }),
          E("button", { class: "btn secondary", type: "button", text: "Another", onclick: newTask })]), fb);
    }

    render();
    newTask();
  }

  window.MemMap = { CHIPS, decode };
  function init() { injectCss(); document.querySelectorAll(".widget.memmap").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
