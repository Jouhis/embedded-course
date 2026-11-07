/* Clock tree configurator for lesson 40. Load after course.js.
 *
 *   <div class="widget clocktree" data-chip="stm32f103"></div>     or data-chip="rp2040"
 *
 * The learner sets the sources, the PLL and the dividers, and every stage shows its frequency. Values out of
 * range are flagged with the limit and where it comes from.
 *   STM32F103: HSI 8 MHz or HSE (4-16 MHz) → PLL (HSI/2 or HSE, optional HSE/2; ×2..×16, field + 2) →
 *     SW mux → AHB prescaler → HCLK → APB1 (max 36 MHz) and APB2 (max 72 MHz). SYSCLK max 72 MHz
 *     (RCC_MAX_FREQUENCY in stm32f103xb.h). Flash latency: 0 up to 24 MHz, 1 up to 48, 2 up to 72 (RM0008,
 *     FLASH_ACR). The register fields are shown as the values a program writes.
 *   RP2040: XOSC 12 MHz → REFDIV → ×FBDIV (VCO 750-1600 MHz, datasheet 2.18.1) → POSTDIV1 → POSTDIV2 →
 *     clk_sys (nominal 125 MHz, max 133 MHz, datasheet 2.15.3.1).
 */
(function () {
  "use strict";

  const CSS = `
  .clocktree .ct-top{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.5rem 0}
  .clocktree select,.clocktree input{font-family:var(--mono);font-size:.85rem;padding:.2rem .3rem;background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:4px}
  .clocktree input{width:4.5rem}
  .clocktree .ct-flow{display:flex;flex-wrap:wrap;align-items:stretch;gap:.3rem;margin:.6rem 0}
  .clocktree .st{border:1px solid var(--rule);border-radius:6px;padding:.4rem .55rem;background:var(--code-bg);min-width:7rem;display:flex;flex-direction:column;gap:.25rem}
  .clocktree .st h5{margin:0;font-family:var(--sans);font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
  .clocktree .st .f{font-family:var(--mono);font-weight:700;font-size:.95rem}
  .clocktree .st.bad{border-color:var(--bad);background:var(--bad-soft)} .clocktree .st.bad .f{color:var(--bad)}
  .clocktree .st.out{border-color:var(--good);background:var(--good-soft)}
  .clocktree .st.off{opacity:.45}
  .clocktree .st label{font-family:var(--sans);font-size:.78rem;display:flex;gap:.3rem;align-items:center}
  .clocktree .arr{align-self:center;color:var(--muted);font-size:1.1rem}
  .clocktree .ct-branch{display:flex;flex-wrap:wrap;gap:.3rem;margin-left:1rem}
  .clocktree .ct-notes{font-family:var(--sans);font-size:.86rem;margin:.4rem 0}
  .clocktree .ct-notes li{margin:.2rem 0}
  .clocktree .ct-notes .bad{color:var(--bad);font-weight:600} .clocktree .ct-notes .ok{color:var(--good)}
  .clocktree .ct-reg{font-family:var(--mono);font-size:.8rem;background:var(--code-bg);border-radius:4px;padding:.5rem .7rem;margin:.4rem 0;white-space:pre;overflow-x:auto}
  @media(max-width:40rem){.clocktree .arr{display:none}.clocktree .ct-branch{margin-left:0}.clocktree .st{flex:1 1 100%}}
  .clocktree .ct-presets{display:flex;flex-wrap:wrap;gap:.3rem}
  .clocktree .ct-presets .btn{font-size:.75rem;padding:.15rem .5rem}`;

  const MHz = f => (f >= 1e6 ? String(+(f / 1e6).toFixed(3)) + " MHz" : String(+(f / 1e3).toFixed(1)) + " kHz");
  const hex = x => "0x" + (x >>> 0).toString(16).toUpperCase().padStart(8, "0");

  function injectCss() {
    if (document.getElementById("clocktree-css")) return;
    const s = document.createElement("style");
    s.id = "clocktree-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount(box) {
    const E = window.Course.el;
    let chip = box.dataset.chip === "rp2040" ? "rp2040" : "stm32f103";
    const st = {   // STM32F103: reset state
      hse: 8, pllsrc: "hsi2", xtpre: false, mulField: 0, sw: "hsi", hpre: 1, ppre1: 1, ppre2: 1, latency: 0,
    };
    const rp = { xosc: 12, refdiv: 1, fbdiv: 100, pd1: 6, pd2: 2 };
    box.appendChild(E("h3", { text: box.dataset.title || "Clock tree configurator" }));
    const chipSel = E("select", { "aria-label": "Chip" }, [["stm32f103", "STM32F103 (Blue Pill)"], ["rp2040", "RP2040 (Pico)"]]
      .map(([v, t]) => { const o = E("option", { value: v, text: t }); if (v === chip) o.selected = true; return o; }));
    chipSel.addEventListener("change", () => { chip = chipSel.value; render(); });
    const presets = E("div", { class: "ct-presets" });
    box.appendChild(E("div", { class: "ct-top" }, [chipSel, presets]));
    const flow = E("div"), notes = E("ul", { class: "ct-notes" }), reg = E("div", { class: "ct-reg" });
    box.append(flow, E("h4", { text: "Checks" }), notes, E("h4", { text: "What the program writes" }), reg);

    const sel = (opts, value, onChange, label) => {
      const s = E("select", { "aria-label": label }, opts.map(([v, t]) => { const o = E("option", { value: String(v), text: t }); if (String(v) === String(value)) o.selected = true; return o; }));
      s.addEventListener("change", () => { onChange(s.value); render(); });
      return s;
    };
    const num = (value, min, max, onChange, label) => {
      const i = E("input", { type: "number", min, max, value, "aria-label": label });
      i.addEventListener("change", () => { const v = +i.value; if (Number.isFinite(v)) onChange(v); render(); });
      return i;
    };
    const stage = (title, f, kids, cls) => E("div", { class: "st" + (cls ? " " + cls : "") }, [E("h5", { text: title }), ...(kids || []), E("div", { class: "f", text: f === null ? "–" : MHz(f) })]);
    const arrow = () => E("span", { class: "arr", text: "→" });
    const lab = (t, c) => E("label", {}, [t, c]);

    function renderStm() {
      presets.innerHTML = "";
      [["Reset: HSI 8 MHz", { pllsrc: "hsi2", xtpre: false, mulField: 0, sw: "hsi", hpre: 1, ppre1: 1, ppre2: 1, latency: 0 }],
       ["Worked example: HSE ×9 = 72 MHz", { pllsrc: "hse", xtpre: false, mulField: 7, sw: "pll", hpre: 1, ppre1: 2, ppre2: 1, latency: 2 }],
       ["Mistake: wait states left at 0", { pllsrc: "hse", xtpre: false, mulField: 7, sw: "pll", hpre: 1, ppre1: 2, ppre2: 1, latency: 0 }],
       ["HSI/2 ×16 = 64 MHz (no crystal)", { pllsrc: "hsi2", xtpre: false, mulField: 14, sw: "pll", hpre: 1, ppre1: 2, ppre2: 1, latency: 2 }]]
        .forEach(([t, p]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { Object.assign(st, p); render(); } })));

      const hsi = 8e6, hse = st.hse * 1e6;
      const factor = Math.min(st.mulField + 2, 16);
      const pllIn = st.pllsrc === "hsi2" ? hsi / 2 : st.xtpre ? hse / 2 : hse;
      const pll = pllIn * factor;
      const sys = st.sw === "hsi" ? hsi : st.sw === "hse" ? hse : pll;
      const hclk = sys / st.hpre, p1 = hclk / st.ppre1, p2 = hclk / st.ppre2;
      const needLat = sys <= 24e6 ? 0 : sys <= 48e6 ? 1 : 2;
      const usesPll = st.sw === "pll", usesHse = st.sw === "hse" || (usesPll && st.pllsrc === "hse");
      const bad = { hse: usesHse && (hse < 4e6 || hse > 16e6), sys: sys > 72e6, p1: p1 > 36e6, p2: p2 > 72e6, lat: st.latency < needLat };

      flow.innerHTML = "";
      const row1 = E("div", { class: "ct-flow" }, [
        E("div", { style: "display:flex;flex-direction:column;gap:.3rem" }, [
          stage("HSI (internal RC)", hsi, [], st.sw === "hsi" || (usesPll && st.pllsrc === "hsi2") ? "" : "off"),
          stage("HSE (crystal)", hse, [lab("MHz", num(st.hse, 4, 16, v => { st.hse = v; }, "HSE MHz"))], (bad.hse ? "bad" : usesHse ? "" : "off")),
        ]),
        arrow(),
        stage("PLL input", pllIn, [lab("PLLSRC", sel([["hsi2", "HSI ÷ 2"], ["hse", "HSE"]], st.pllsrc, v => { st.pllsrc = v; }, "PLLSRC")),
          lab("PLLXTPRE", sel([[0, "HSE ÷ 1"], [1, "HSE ÷ 2"]], st.xtpre ? 1 : 0, v => { st.xtpre = v === "1"; }, "PLLXTPRE"))], usesPll ? "" : "off"),
        arrow(),
        stage("PLL", pll, [lab("PLLMUL", sel([...Array(16).keys()].map(k => [k, `field ${k} → ×${Math.min(k + 2, 16)}`]), st.mulField, v => { st.mulField = +v; }, "PLLMUL"))], usesPll ? "" : "off"),
        arrow(),
        stage("SYSCLK (SW)", sys, [sel([["hsi", "HSI"], ["hse", "HSE"], ["pll", "PLL"]], st.sw, v => { st.sw = v; }, "SW")], bad.sys ? "bad" : "out"),
        arrow(),
        stage("HCLK (AHB, core)", hclk, [lab("HPRE ÷", sel([1, 2, 4, 8, 16, 64, 128, 256, 512].map(d => [d, String(d)]), st.hpre, v => { st.hpre = +v; }, "AHB prescaler"))], bad.sys ? "bad" : ""),
      ]);
      const row2 = E("div", { class: "ct-flow ct-branch" }, [
        E("span", { class: "arr", text: "↳" }),
        stage("PCLK1 (APB1, max 36)", p1, [lab("PPRE1 ÷", sel([1, 2, 4, 8, 16].map(d => [d, String(d)]), st.ppre1, v => { st.ppre1 = +v; }, "APB1 prescaler"))], bad.p1 ? "bad" : ""),
        stage("PCLK2 (APB2, max 72)", p2, [lab("PPRE2 ÷", sel([1, 2, 4, 8, 16].map(d => [d, String(d)]), st.ppre2, v => { st.ppre2 = +v; }, "APB2 prescaler"))], bad.p2 ? "bad" : ""),
        stage("Flash wait states", null, [lab("LATENCY", sel([[0, "0"], [1, "1"], [2, "2"]], st.latency, v => { st.latency = +v; }, "Flash latency"))], bad.lat ? "bad" : ""),
      ]);
      flow.append(row1, row2);

      const li = (ok, t) => `<li class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${t}</li>`;
      const n = [];
      n.push(li(!bad.sys, `SYSCLK ${MHz(sys)}: the limit is 72 MHz (RCC_MAX_FREQUENCY).`));
      if (usesHse) n.push(li(!bad.hse, `HSE ${MHz(hse)}: the crystal must be 4 to 16 MHz (RCC_HSE_MIN, RCC_HSE_MAX).`));
      n.push(li(!bad.p1, `PCLK1 ${MHz(p1)}: APB1 runs at most 36 MHz, so above 36 MHz HCLK it needs PPRE1 ≥ 2.`));
      n.push(li(!bad.p2, `PCLK2 ${MHz(p2)}: APB2 may run at the full 72 MHz.`));
      n.push(li(!bad.lat, `Flash: ${MHz(sys)} needs LATENCY ${needLat} (0 up to 24 MHz, 1 up to 48 MHz, 2 up to 72 MHz). ` +
        (bad.lat ? "With too few wait states the core reads flash faster than it can answer and runs garbage. Raise LATENCY before you switch the clock." : "Set it before raising the clock.")));
      if (usesPll && factor * pllIn !== pll) n.push(li(false, "inconsistent PLL"));
      if (usesPll) n.push(`<li>The timers on APB1 run at ${MHz(st.ppre1 === 1 ? p1 : 2 * p1)}: when the APB1 prescaler is not 1, the timer clock is twice PCLK1.</li>`);
      notes.innerHTML = n.join("");

      const cfgr = ((st.pllsrc === "hse" ? 1 : 0) << 16) | ((st.xtpre ? 1 : 0) << 17) | (st.mulField << 18) | ({ hsi: 0, hse: 1, pll: 2 }[st.sw]) |
        ({ 1: 0, 2: 8, 4: 9, 8: 10, 16: 11, 64: 12, 128: 13, 256: 14, 512: 15 }[st.hpre] << 4) | ({ 1: 0, 2: 4, 4: 5, 8: 6, 16: 7 }[st.ppre1] << 8) | ({ 1: 0, 2: 4, 4: 5, 8: 6, 16: 7 }[st.ppre2] << 11);
      reg.textContent =
        `FLASH->ACR  LATENCY = ${st.latency}                          (first, before the faster clock)\n` +
        `RCC->CFGR   PLLSRC   (bit 16)     = ${st.pllsrc === "hse" ? 1 : 0}\n` +
        `            PLLXTPRE (bit 17)     = ${st.xtpre ? 1 : 0}\n` +
        `            PLLMUL   (bits 21-18) = ${st.mulField}  → ×${factor}   mask ${hex(st.mulField << 18)}\n` +
        `            PPRE2 / PPRE1 / HPRE as chosen, SW (bits 1-0) = ${({ hsi: 0, hse: 1, pll: 2 }[st.sw])}\n` +
        `            CFGR = ${hex(cfgr)}\n` +
        (usesPll ? `then: RCC->CR |= PLLON, wait for PLLRDY, write SW, wait until SWS reads ${hex(8)}\n` : "") +
        `SystemCoreClockUpdate();  // SystemCoreClock = ${sys}`;
    }

    function renderRp() {
      presets.innerHTML = "";
      [["SDK default: 125 MHz", { fbdiv: 125, pd1: 6, pd2: 2, refdiv: 1 }], ["Datasheet example: 100 MHz", { fbdiv: 100, pd1: 6, pd2: 2, refdiv: 1 }],
       ["Mistake: VCO out of range", { fbdiv: 140, pd1: 7, pd2: 2, refdiv: 1 }], ["Too fast: 150 MHz", { fbdiv: 125, pd1: 5, pd2: 2, refdiv: 1 }]]
        .forEach(([t, p]) => presets.appendChild(E("button", { class: "btn secondary", type: "button", text: t, onclick: () => { Object.assign(rp, p); render(); } })));
      const ref = rp.xosc * 1e6 / rp.refdiv, vco = ref * rp.fbdiv, out = vco / rp.pd1 / rp.pd2;
      const badV = vco < 750e6 || vco > 1600e6, badF = rp.fbdiv < 16 || rp.fbdiv > 320, badO = out > 133e6;
      flow.innerHTML = "";
      flow.appendChild(E("div", { class: "ct-flow" }, [
        stage("XOSC (crystal)", rp.xosc * 1e6, [E("small", { text: "12 MHz on the Pico" })]), arrow(),
        stage("Reference", ref, [lab("REFDIV ÷", num(rp.refdiv, 1, 63, v => { rp.refdiv = Math.max(1, Math.round(v)); }, "REFDIV"))]), arrow(),
        stage("VCO", vco, [lab("FBDIV ×", num(rp.fbdiv, 16, 320, v => { rp.fbdiv = Math.round(v); }, "FBDIV"))], badV || badF ? "bad" : ""), arrow(),
        stage("÷ POSTDIV1", vco / rp.pd1, [sel([1, 2, 3, 4, 5, 6, 7].map(d => [d, String(d)]), rp.pd1, v => { rp.pd1 = +v; }, "POSTDIV1")], ""), arrow(),
        stage("÷ POSTDIV2 → clk_sys", out, [sel([1, 2, 3, 4, 5, 6, 7].map(d => [d, String(d)]), rp.pd2, v => { rp.pd2 = +v; }, "POSTDIV2")], badO ? "bad" : "out"),
      ]));
      const li = (ok, t) => `<li class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${t}</li>`;
      notes.innerHTML = [
        li(!badV, `VCO ${MHz(vco)}: it must stay between 750 and 1600 MHz (datasheet 2.18.1). With a 12 MHz reference that means FBDIV 63 to 133.`),
        li(!badF, `FBDIV ${rp.fbdiv}: the register field allows 16 to 320.`),
        li(!badO, `clk_sys ${MHz(out)}: nominal 125 MHz, at most 133 MHz across process, voltage and temperature (datasheet 2.15.3.1).`),
        `<li>The VCO (${MHz(vco)}) is an internal stage. The core runs at the output after both post-dividers, ${MHz(out)}.</li>`,
        rp.pd2 > rp.pd1 ? `<li>The datasheet suggests POSTDIV1 ≥ POSTDIV2 for lower power; swapping them gives the same frequency.</li>` : "",
      ].join("");
      reg.textContent = `XOSC on, wait for XOSC_STABLE\nPLL_SYS: REFDIV = ${rp.refdiv}, FBDIV = ${rp.fbdiv}, POSTDIV1 = ${rp.pd1}, POSTDIV2 = ${rp.pd2}\n` +
        `        ${rp.xosc} MHz ÷ ${rp.refdiv} × ${rp.fbdiv} = ${MHz(vco)}, ÷ ${rp.pd1} ÷ ${rp.pd2} = ${MHz(out)}\n` +
        `In the SDK: set_sys_clock_pll(${vco}, ${rp.pd1}, ${rp.pd2});`;
    }

    function render() { if (chip === "rp2040") renderRp(); else renderStm(); }
    render();
  }

  function init() { injectCss(); document.querySelectorAll(".widget.clocktree").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
