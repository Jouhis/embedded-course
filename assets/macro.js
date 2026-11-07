/* Macro expansion, step by step (lesson 50). Load after course.js.
 *
 *   <div class="widget macroexp"></div>
 *
 * Pick a definition of SQUARE, an argument and a use. The widget pastes the argument's tokens into the
 * replacement list, as the preprocessor does, then shows how the compiler groups the text by precedence
 * and what it computes. The lesson's case: #define SQUARE(x) x * x and SQUARE(2 + 1) give 2 + 1 * 2 + 1 = 5.
 * An argument with a side effect used twice in one expression is undefined behaviour, so no value is shown.
 */
(function () {
  "use strict";
  const DEFS = [
    { id: "bare", text: "#define SQUARE(x)  x * x", body: "x * x" },
    { id: "inner", text: "#define SQUARE(x)  (x) * (x)", body: "(x) * (x)" },
    { id: "full", text: "#define SQUARE(x)  ((x) * (x))", body: "((x) * (x))" },
    { id: "fn", text: "static inline int square(int x) { return x * x; }", fn: true }];
  const ARGS = ["2 + 1", "3", "i++"];
  const USES = [["SQUARE(@)", "a = SQUARE(@);"], ["100 / SQUARE(@)", "a = 100 / SQUARE(@);"]];

  // a tiny C expression parser: + - * / and parentheses, integers, with C precedence and truncating division
  function parse(src) {
    const toks = src.match(/\d+|[()+\-*/]/g) || []; let p = 0;
    const peek = () => toks[p], next = () => toks[p++];
    function primary() { const t = next(); if (t === "(") { const e = expr(); next(); return { paren: true, e }; } return { n: +t }; }
    function term() { let l = primary(); while (peek() === "*" || peek() === "/") { const op = next(); l = { op, l, r: primary() }; } return l; }
    function expr() { let l = term(); while (peek() === "+" || peek() === "-") { const op = next(); l = { op, l, r: term() }; } return l; }
    return expr();
  }
  const ev = a => a.paren ? ev(a.e) : a.op ? (a.op === "+" ? ev(a.l) + ev(a.r) : a.op === "-" ? ev(a.l) - ev(a.r) : a.op === "*" ? ev(a.l) * ev(a.r) : Math.trunc(ev(a.l) / ev(a.r))) : a.n;
  const show = a => a.paren ? show(a.e) : a.op ? `(${show(a.l)} ${a.op} ${show(a.r)})` : String(a.n);
  const strip = s => (s.startsWith("(") ? s.slice(1, -1) : s);

  const CSS = `
  .macroexp .mx-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin:.45rem 0;font-family:var(--sans);font-size:.85rem}
  .macroexp .mx-row > span{min-width:6.5rem;color:var(--muted)}
  .macroexp .mx-opt{font-family:var(--mono);font-size:.78rem;padding:.25rem .5rem;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--fg);cursor:pointer;text-align:left}
  .macroexp .mx-opt.on{border-color:var(--accent);background:var(--accent-soft);font-weight:700}
  .macroexp ol{margin:.6rem 0;padding-left:1.4rem;font-family:var(--sans);font-size:.88rem}
  .macroexp ol li{margin:.35rem 0}
  .macroexp code.big{display:block;font-family:var(--mono);font-size:.95rem;background:var(--code-bg);border-radius:4px;padding:.3rem .5rem;margin:.2rem 0;overflow-x:auto;white-space:pre}
  .macroexp mark{background:var(--warn-soft);color:inherit;border-bottom:2px solid var(--warn);padding:0 1px}
  .macroexp .mx-res{font-family:var(--sans);font-size:.9rem;padding:.45rem .8rem;border-radius:4px;margin:.4rem 0;border-left:4px solid var(--rule);background:var(--code-bg)}
  .macroexp .mx-res.ok{background:var(--good-soft);border-left-color:var(--good)} .macroexp .mx-res.bad{background:var(--bad-soft);border-left-color:var(--bad)}`;

  function mount(box) {
    const E = window.Course.el;
    const st = { def: 0, arg: 0, use: 0 };
    box.innerHTML = "";
    box.appendChild(E("h3", { text: box.dataset.title || "What the preprocessor pastes, and what the compiler computes" }));
    const rows = E("div"), steps = E("ol"), res = E("div", { class: "mx-res" });
    box.append(rows, steps, res);
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    function choice(label, list, key, txt) {
      const r = E("div", { class: "mx-row" }, [E("span", { text: label })]);
      list.forEach((v, i) => r.appendChild(E("button", { type: "button", class: "mx-opt" + (st[key] === i ? " on" : ""), "aria-pressed": String(st[key] === i), text: txt(v), onclick: () => { st[key] = i; render(); } })));
      return r;
    }
    function render() {
      rows.innerHTML = "";
      rows.append(choice("definition", DEFS, "def", d => d.text), choice("argument", ARGS, "arg", a => a), choice("use", USES, "use", u => u[0].replace("@", "…")));
      const D = DEFS[st.def], A = ARGS[st.arg], U = USES[st.use], side = A === "i++";
      const argVal = side ? 2 : ev(parse(A)), want = st.use ? Math.trunc(100 / (argVal * argVal)) : argVal * argVal;
      steps.innerHTML = "";
      const li = h => steps.appendChild(E("li", { html: h }));
      if (D.fn) {
        const call = U[1].replace("SQUARE(@)", `square(${A})`);
        li(`The source line is <code class="big">${esc(call)}</code>`);
        li(side ? "The call evaluates the argument once: <b>i++</b> gives the old value 2, and i becomes 3. The parameter x receives 2." : `The call evaluates the argument first, as a normal expression: <b>${esc(A)}</b> is <b>${argVal}</b>. The parameter x receives ${argVal}.`);
        li(`Inside the function, x * x is ${argVal} * ${argVal} = ${argVal * argVal}, and the call is replaced by that value${st.use ? `: 100 / ${argVal * argVal} = ${want}` : ""}.`);
        res.className = "mx-res ok";
        res.textContent = `a = ${want}. A function receives a value, so precedence and side effects behave as in any other call.` + (side ? " i is incremented exactly once." : "");
        return;
      }
      const body = D.body.replace(/x/g, "\u0001");
      const pasted = U[1].replace("SQUARE(@)", body).replace(/\u0001/g, A);
      const marked = esc(U[1].replace("SQUARE(@)", body)).replace(/\u0001/g, `<mark>${esc(A)}</mark>`);
      li(`The preprocessor finds <b>SQUARE(</b> and collects the argument as tokens: <b>${esc(A)}</b>. It does not evaluate them.`);
      li(`It pastes them for every x in <b>${esc(D.body)}</b>. The compiler receives <code class="big">${marked}</code>`);
      if (side) {
        li("<b>i++</b> now appears twice in one expression, and nothing orders the two increments.");
        res.className = "mx-res bad";
        res.textContent = "Undefined behaviour: i is modified twice without a sequence point. The compiler may produce any value, and i may go up by one, two or not at all. No parentheses fix this; use the static inline function.";
        return;
      }
      const expr = pasted.replace(/^a = /, "").replace(/;$/, ""), tree = parse(expr), got = ev(tree);
      li(`It groups the text by precedence: * and / bind tighter than + and −, and equal operators go left to right. <code class="big">${esc(strip(show(tree)))} = ${got}</code>`);
      const okv = got === want;
      res.className = "mx-res " + (okv ? "ok" : "bad");
      res.textContent = okv ? `a = ${got}, which is what you meant.` + (D.id === "full" ? " The parentheses around each x and around the whole body keep the grouping." : st.arg === 1 ? " A plain number cannot be split, so this case hides the bug. Try 2 + 1." : "")
        : `a = ${got}, but the square you meant gives ${want}.` + (D.id === "bare" && A.includes("+") ? " The * of the body splits the pasted 2 + 1." : "") + (st.use && D.id !== "full" ? " Nothing wraps the whole body, so 100 / binds to the first factor only." : "");
    }
    render();
  }
  window.MacroExp = { parse, ev };
  function init() {
    if (!document.getElementById("macroexp-css")) { const s = document.createElement("style"); s.id = "macroexp-css"; s.textContent = CSS; document.head.appendChild(s); }
    document.querySelectorAll(".widget.macroexp").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
