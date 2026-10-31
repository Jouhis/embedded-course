/* Embedded course: circuit calculators (Ohm's law, power, voltage divider, LED resistor).
 *
 * Declare a calculator in a lesson, after course.js has loaded:
 *
 *    <div class="widget calc" data-calc="ohms"></div>
 *
 * data-calc values:
 *   "ohms"     Give any two of V, I, R. The third is computed.
 *   "power"    Like "ohms", and also shows P = V × I = I² × R = V² ÷ R.
 *   "divider"  Vout = Vin × R2 ÷ (R1 + R2). Optional load in parallel with R2 shows the loaded output.
 *   "led"      R = (Vsupply − Vf) ÷ I, rounded UP to the next E12 value, so the current stays at or below the target.
 *
 * Inputs accept SI prefixes and units, as in quizzes: 4k7, 10m, 330, 2.2k, 0.25.
 * Use a calculator as a CHECK after you have worked the number by hand. Do not use it instead.
 *
 * Needs course.js (for Course.parseNumber) and course.css (.widget, .btn, .q-input-row).
 * Vanilla JS, no dependencies, works from file://.
 */
(function () {
  "use strict";

  // E12 preferred values (IEC 60063), one decade. Resistors are sold in these steps.
  const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

  // ---------- Pure maths (no DOM), so the numbers are easy to check ----------

  /* Parse a field; NaN when the field is empty. */
  function num(raw) {
    if (raw === undefined || String(raw).trim() === "") return NaN;
    return window.Course ? window.Course.parseNumber(raw) : parseFloat(raw);
  }

  /* Fill in the missing one of V, I, R from the other two. Unknown values stay NaN. */
  function solveOhm(V, I, R) {
    if (isNaN(V) && !isNaN(I) && !isNaN(R)) V = I * R;
    if (isNaN(I) && !isNaN(V) && !isNaN(R)) I = V / R;
    if (isNaN(R) && !isNaN(V) && !isNaN(I)) R = V / I;
    return { V: V, I: I, R: R };
  }

  /* Smallest E12 value that is >= r, so a resistor chosen from it never draws more than the target current. */
  function e12Up(r) {
    if (!(r > 0) || !isFinite(r)) return NaN;
    const decade = Math.pow(10, Math.floor(Math.log10(r)));
    for (let d = decade; d <= decade * 10; d *= 10) {
      for (const v of E12) {
        if (v * d >= r * (1 - 1e-9)) return +(v * d).toPrecision(6);
      }
    }
    return NaN;
  }

  /* Format with an SI prefix: 0.0106 A -> "10.6 mA". */
  function fmt(x, unit) {
    if (!isFinite(x)) return "–";
    if (x === 0) return "0 " + unit;
    const a = Math.abs(x);
    const steps = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"]];
    for (const [scale, prefix] of steps) {
      if (a >= scale) return +(x / scale).toPrecision(4) + " " + prefix + unit;
    }
    return +(x / 1e-6).toPrecision(4) + " µ" + unit;
  }

  function divider(Vin, R1, R2, Rload) {
    const unloaded = Vin * R2 / (R1 + R2);
    if (isNaN(Rload)) return { unloaded: unloaded, loaded: NaN };
    const Rbottom = (R2 * Rload) / (R2 + Rload);   // R2 in parallel with the load
    return { unloaded: unloaded, loaded: Vin * Rbottom / (R1 + Rbottom) };
  }

  function ledResistor(Vs, Vf, I) {
    const exact = (Vs - Vf) / I;
    const std = e12Up(exact);
    const actual = (Vs - Vf) / std;
    return { exact: exact, std: std, actual: actual, power: actual * actual * std };
  }

  // ---------- DOM ----------

  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach(c => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function field(label, id, placeholder) {
    const input = h("input", { type: "text", autocomplete: "off", spellcheck: "false", placeholder: placeholder, "data-field": id });
    return h("div", { class: "q-input-row" }, [h("span", { text: label, style: "min-width:9rem" }), input]);
  }

  function readFields(root) {
    const out = {};
    root.querySelectorAll("input[data-field]").forEach(i => { out[i.dataset.field] = num(i.value); });
    return out;
  }

  function output(root, lines) {
    const box = root.querySelector(".calc-out");
    box.innerHTML = "";
    lines.forEach(([label, value]) => box.appendChild(h("div", { text: label + ": " + value })));
  }

  const BUILDERS = {
    ohms: {
      title: "Ohm's law calculator",
      hint: "Fill in any two. The third is computed.",
      rows: [field("Voltage V", "V", "e.g. 5 or 3.3"), field("Current I", "I", "e.g. 50m"), field("Resistance R", "R", "e.g. 100 or 4k7")],
      calc(v) {
        const s = solveOhm(v.V, v.I, v.R);
        return [["Voltage", fmt(s.V, "V")], ["Current", fmt(s.I, "A")], ["Resistance", fmt(s.R, "Ω")]];
      },
    },
    power: {
      title: "Power calculator",
      hint: "Fill in any two of V, I, R. Power is P = V × I = I² × R = V² ÷ R.",
      rows: [field("Voltage V", "V", "e.g. 5"), field("Current I", "I", "e.g. 50m"), field("Resistance R", "R", "e.g. 100")],
      calc(v) {
        const s = solveOhm(v.V, v.I, v.R);
        const P = s.V * s.I;
        return [["Voltage", fmt(s.V, "V")], ["Current", fmt(s.I, "A")], ["Resistance", fmt(s.R, "Ω")],
          ["Power P = V × I", fmt(P, "W")], ["Check: I² × R", fmt(s.I * s.I * s.R, "W")]];
      },
    },
    divider: {
      title: "Voltage divider calculator",
      hint: "Leave the load empty for an unloaded divider.",
      rows: [field("Supply Vin", "Vin", "e.g. 10"), field("Top R1", "R1", "e.g. 10k"),
        field("Bottom R2", "R2", "e.g. 10k"), field("Load (optional)", "Rload", "e.g. 10k")],
      calc(v) {
        const d = divider(v.Vin, v.R1, v.R2, v.Rload);
        const lines = [["Vout, unloaded", fmt(d.unloaded, "V")]];
        if (!isNaN(d.loaded)) lines.push(["Vout, with load", fmt(d.loaded, "V")]);
        return lines;
      },
    },
    led: {
      title: "LED resistor calculator",
      hint: "Target current is the current you want the LED to draw, for example 4m.",
      rows: [field("Supply Vs", "Vs", "e.g. 3.3"), field("LED Vf", "Vf", "e.g. 2.0"), field("Target I", "I", "e.g. 4m")],
      calc(v) {
        if (!(v.Vs > v.Vf)) return [["Result", "The supply must be higher than Vf"]];
        const r = ledResistor(v.Vs, v.Vf, v.I);
        return [["Exact R = (Vs − Vf) ÷ I", fmt(r.exact, "Ω")],
          ["Nearest E12 value, rounded up", fmt(r.std, "Ω")],
          ["Current with that value", fmt(r.actual, "A")],
          ["Resistor power", fmt(r.power, "W")]];
      },
    },
  };

  function build(root) {
    const kind = root.dataset.calc;
    const spec = BUILDERS[kind];
    if (!spec) { root.textContent = "Unknown calculator: " + kind; return; }
    root.appendChild(h("h3", { text: spec.title }));
    root.appendChild(h("p", { text: spec.hint }));
    spec.rows.forEach(r => root.appendChild(r));
    const button = h("button", { class: "btn", type: "button", text: "Calculate" });
    root.appendChild(h("div", { class: "q-input-row" }, [button]));
    root.appendChild(h("div", { class: "calc-out", "aria-live": "polite" }));
    const run = () => output(root, spec.calc(readFields(root)));
    button.addEventListener("click", run);
    root.querySelectorAll("input[data-field]").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") run(); }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".widget.calc[data-calc]").forEach(build);
  });

  window.CircuitCalc = { solveOhm, e12Up, fmt, divider, ledResistor, E12 };
})();
