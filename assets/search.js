/* Embedded Systems course: search.
 *
 * A search box in the top bar of every lesson and reference sheet, and on the course index
 * (an element with id="course-search"). course.js loads this file on lesson pages and the index;
 * reference sheets load it with their own <script> tag.
 *
 * - Keyword search (always): BM25 over assets/search/index.json, which tools/maintainer/build_search.py
 *   builds. One entry per section (<h2>/<h3>) and per glossary term; quizzes are not indexed.
 *   Words in a heading count more; a word being typed matches as a prefix ("debounc").
 * - Smart search (opt-in, remembered per browser): also embeds the question with a small
 *   sentence model and ranks sections by meaning, so "button registers twice" finds debouncing.
 *   Needs assets/search/vectors.bin (build_search.py --semantic). The model (about 23 MB) comes
 *   from Hugging Face and the runtime (about 27 MB) from jsDelivr, once; the browser caches them.
 *   Both rankings are merged by reciprocal rank fusion.
 * - Every <h2>, <h3> and <dt id> gets an id from its text, the same way build_search.py makes
 *   them (slug()), so a result can link to its section.
 *
 * Keys: "/" focuses the box, arrows move, Enter opens, Escape closes. Search needs the pages
 * served over http (the site, or `python -m http.server` in the course folder): browsers block
 * fetch() from file:// pages.
 */
(function () {
  "use strict";

  const SCRIPT = document.currentScript;
  const ROOT = SCRIPT ? SCRIPT.src.replace(/assets\/search\.js(\?.*)?$/, "") : "../";
  const SMART_KEY = "embedded-course-smart-search";
  const SKIP = ".widget, .circuitjs, .pager, .complete-bar, nav, svg, template, button";
  const STOP = new Set(("a an and are as at be by can do does for from has have how i if in into is it " +
                        "its my of on or so that the then this to was what when where which who why will " +
                        "with you your").split(" "));

  // ---------- Section anchors (must match build_search.py) ----------

  function slug(text) {
    return text.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "section";
  }
  function assignHeadingIds() {
    const used = new Set();
    document.querySelectorAll("main h2, main h3, main dt[id]").forEach(h => {
      if (h.closest(SKIP)) return;
      if (!h.id) {
        const base = slug(h.textContent.replace(/\s+/g, " ").trim());
        let id = base, n = 2;
        while (used.has(id)) id = `${base}-${n++}`;
        h.id = id;
      }
      used.add(h.id);
    });
    // The browser looked for the anchor before the ids existed: jump to it now.
    const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }

  // ---------- Keyword index ----------

  function tokens(text) {
    return (text.toLowerCase().match(/[a-z0-9_]+/g) || []).filter(t => !STOP.has(t) && (t.length > 1 || /\d/.test(t)));
  }

  let indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(ROOT + "assets/search/index.json")
        .then(r => { if (!r.ok) throw new Error(`index.json: HTTP ${r.status}`); return r.json(); })
        .then(buildIndex);
      indexPromise.catch(() => { indexPromise = null; });
    }
    return indexPromise;
  }

  function buildIndex(data) {
    const docs = data.docs;
    const postings = new Map();      // term -> [[doc, weighted tf], ...]
    const lengths = new Float32Array(docs.length);
    docs.forEach((d, i) => {
      const tf = new Map();
      const add = (text, w) => tokens(text).forEach(t => tf.set(t, (tf.get(t) || 0) + w));
      add(d.x, 1); add(d.h, 4); add(d.t, 1.5);
      let len = 0;
      tf.forEach((n, t) => {
        len += n;
        let p = postings.get(t);
        if (!p) postings.set(t, p = []);
        p.push([i, n]);
      });
      lengths[i] = len;
    });
    let total = 0;
    lengths.forEach(l => { total += l; });
    return { docs, postings, lengths, avg: total / docs.length, vocab: Array.from(postings.keys()).sort() };
  }

  /* Vocabulary terms that start with prefix (binary search in the sorted list). */
  function expand(ix, prefix, max) {
    let lo = 0, hi = ix.vocab.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ix.vocab[m] < prefix) lo = m + 1; else hi = m; }
    const out = [];
    for (let i = lo; i < ix.vocab.length && out.length < max && ix.vocab[i].startsWith(prefix); i++) out.push(ix.vocab[i]);
    return out;
  }

  /* One group per query word: the vocabulary terms it matches, with weights. The word itself and
   * a plural's singular count fully; the last word, which may still be being typed, also matches
   * longer words that start with it ("debounc"), at a lower weight. */
  function queryGroups(ix, query) {
    const words = tokens(query);
    const typing = !/\s$/.test(query);
    return words.map((q, i) => {
      const g = new Map();
      const put = (t, w) => { if (ix.postings.has(t) && (g.get(t) || 0) < w) g.set(t, w); };
      put(q, 1);
      if (q.length > 3 && q.endsWith("s")) put(q.slice(0, -1), 1);
      put(q + "s", 1);
      if (typing && i === words.length - 1 && q.length >= 3) expand(ix, q, 40).forEach(t => put(t, 0.6));
      return g;
    }).filter(g => g.size);
  }

  /* BM25. Within a group a section scores its best-matching term once, so a word that prefixes
   * many code identifiers (led -> led_init, led_set, ...) does not count many times over. */
  function keywordSearch(ix, query) {
    const groups = queryGroups(ix, query);
    const scores = new Map(), k1 = 1.2, b = 0.75, N = ix.docs.length;
    groups.forEach(g => {
      const best = new Map();
      g.forEach((w, t) => {
        const p = ix.postings.get(t);
        const idf = Math.log(1 + (N - p.length + 0.5) / (p.length + 0.5));
        p.forEach(([d, tf]) => {
          const s = w * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * ix.lengths[d] / ix.avg));
          if (s > (best.get(d) || 0)) best.set(d, s);
        });
      });
      best.forEach((s, d) => scores.set(d, (scores.get(d) || 0) + s));
    });
    const terms = new Map();
    groups.forEach(g => g.forEach((w, t) => terms.set(t, w)));
    return { ranked: Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]), terms };
  }

  // ---------- Smart (semantic) search ----------

  let smart = null;    // { meta, vectors, embed } once loaded
  let smartPromise = null;
  function smartWanted() { try { return localStorage.getItem(SMART_KEY) === "1"; } catch (e) { return false; } }
  function setSmartWanted(on) { try { localStorage.setItem(SMART_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ } }

  let metaPromise = null;
  function loadSmartMeta() {
    if (!metaPromise) {
      metaPromise = fetch(ROOT + "assets/search/vectors.json")
        .then(r => (r.ok ? r.json() : null)).catch(() => null);
    }
    return metaPromise;
  }

  function loadSmart(onProgress) {
    if (smartPromise) return smartPromise;
    smartPromise = (async () => {
      const meta = await loadSmartMeta();
      if (!meta) throw new Error("this copy of the course has no smart-search vectors");
      const [buf, lib] = await Promise.all([
        fetch(ROOT + "assets/search/vectors.bin").then(r => { if (!r.ok) throw new Error(`vectors.bin: HTTP ${r.status}`); return r.arrayBuffer(); }),
        import(`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${meta.lib}/dist/transformers.min.js`),
      ]);
      lib.env.allowLocalModels = false;
      const files = {};
      const embed = await lib.pipeline("feature-extraction", meta.model, {
        dtype: meta.dtype,
        progress_callback: p => {
          if (p.status === "progress" && p.total) {
            files[p.file] = [p.loaded, p.total];
            let got = 0, all = 0;
            Object.values(files).forEach(([l, t]) => { got += l; all += t; });
            onProgress(`Loading the smart-search model: ${Math.round(100 * got / all)} %`);
          }
        },
      });
      smart = { meta, vectors: new Int8Array(buf), embed };
      return smart;
    })();
    smartPromise.catch(() => { smartPromise = null; });
    return smartPromise;
  }

  async function semanticSearch(query) {
    const { meta, vectors, embed } = smart;
    const q = (await embed(query, { pooling: "mean", normalize: true })).data;
    const dim = meta.dim, scores = new Float32Array(meta.count);
    for (let d = 0; d < meta.count; d++) {
      let s = 0;
      for (let j = 0, o = d * dim; j < dim; j++) s += q[j] * vectors[o + j];
      scores[d] = s;
    }
    const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]);
    // Below this cosine the match is noise; 127 is the int8 scale.
    return order.filter(d => scores[d] / 127 > 0.25).slice(0, 60);
  }

  /* Reciprocal rank fusion: a section ranked high by either method comes near the top. */
  function fuse(lists) {
    const s = new Map();
    lists.forEach(list => list.slice(0, 60).forEach((d, r) => s.set(d, (s.get(d) || 0) + 1 / (60 + r))));
    return Array.from(s.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  }

  // ---------- Snippets ----------

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function highlight(text, terms) {
    if (!terms.size) return escapeHtml(text);
    const words = Array.from(terms.keys()).sort((a, b) => b.length - a.length)
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`\\b(${words.join("|")})`, "gi");
    return escapeHtml(text).replace(re, "<mark>$1</mark>");
  }
  function snippet(text, terms) {
    const lower = text.toLowerCase();
    let at = -1;
    terms.forEach((w, t) => {
      const m = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).exec(lower);
      if (m && (at < 0 || m.index < at)) at = m.index;
    });
    const start = Math.max(0, at < 0 ? 0 : at - 60);
    let s = text.slice(start, start + 200);
    if (start > 0) s = "…" + s.replace(/^\S*\s/, "");
    if (start + 200 < text.length) s = s.replace(/\s\S*$/, "") + "…";
    return highlight(s, terms);
  }

  // ---------- The search box ----------

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else n.setAttribute(k, v);
    });
    (kids || []).forEach(k => n.appendChild(typeof k === "string" ? document.createTextNode(k) : k));
    return n;
  }

  function mount() {
    const slot = document.getElementById("course-search") || document.querySelector(".course-nav");
    if (!slot || slot.querySelector(".search")) return;

    const input = el("input", { type: "search", class: "search-input", placeholder: "Search the course  ( / )",
                                "aria-label": "Search the course", autocomplete: "off", spellcheck: "false" });
    const list = el("ol", { class: "search-list", role: "listbox" });
    const status = el("p", { class: "search-status" });
    const smartBox = el("input", { type: "checkbox" });
    const smartRow = el("label", { class: "search-smart", hidden: "" }, [smartBox,
      el("span", { html: "<strong>Smart search:</strong> also finds sections that say it in other words. " +
                         "Downloads about 50 MB once, from Hugging Face and jsDelivr." })]);
    const panel = el("div", { class: "search-panel", hidden: "" }, [status, list, smartRow]);
    const box = el("div", { class: "search", role: "search" }, [input, panel]);
    slot.appendChild(box);

    let active = -1, seq = 0, timer = null;
    const open = () => { panel.hidden = false; };
    const close = () => { panel.hidden = true; active = -1; };

    loadSmartMeta().then(meta => {
      if (!meta) return;
      smartRow.hidden = false;
      smartBox.checked = smartWanted();
    });
    smartBox.addEventListener("change", () => {
      setSmartWanted(smartBox.checked);
      run();
      input.focus();
    });

    // The coloured badge on each hit: glossary, lesson, lab or reference.
    function kindOf(doc) {
      if (/glossary/i.test(doc.u)) return "glossary";
      if (!doc.u.startsWith("lessons/")) return "reference";
      return /^lesson/i.test(doc.l) ? "lesson" : /^bench|^lab/i.test(doc.l) ? "lab" : "check";
    }

    function show(ix, ranked, terms, note) {
      list.textContent = "";
      active = -1;
      ranked.slice(0, 12).forEach(d => {
        const doc = ix.docs[d];
        const a = el("a", { href: ROOT + doc.u, class: "search-hit k-" + kindOf(doc) }, [
          el("span", { class: "search-where" }, [el("span", { class: "search-kind " + kindOf(doc), text: kindOf(doc) === "glossary" ? "Glossary" : doc.l }), " " + (kindOf(doc) === "glossary" ? "" : doc.t)]),
          el("span", { class: "search-head", html: highlight(doc.h || doc.t, terms) }),
          el("span", { class: "search-snip", html: snippet(doc.x, terms) }),
        ]);
        a.addEventListener("click", close);
        list.appendChild(el("li", { role: "option" }, [a]));
      });
      status.textContent = note || (ranked.length ? "" : "No sections match. Try fewer or other words.");
      status.hidden = !status.textContent;
    }

    async function run() {
      const query = input.value.trim();
      const my = ++seq;
      if (!query) { close(); return; }
      open();
      let ix;
      try { ix = await loadIndex(); }
      catch (e) {
        list.textContent = "";
        status.hidden = false;
        status.textContent = location.protocol === "file:"
          ? "Search needs the course served over http. Read it on the website, or run `python -m http.server` in the course folder and open http://localhost:8000."
          : `Search is not available: ${e.message}. On a local copy, run python tools/maintainer/build_search.py first.`;
        return;
      }
      if (my !== seq) return;
      const kw = keywordSearch(ix, query);
      show(ix, kw.ranked, kw.terms);
      if (!smartBox.checked || smartRow.hidden) return;
      try {
        if (!smart) {
          status.hidden = false;
          status.textContent = "Loading the smart-search model…";
          await loadSmart(msg => { if (my === seq) { status.hidden = false; status.textContent = msg; } });
          if (my !== seq) return;
        }
        const sem = await semanticSearch(query);
        if (my !== seq) return;
        show(ix, kw.ranked.length ? fuse([kw.ranked, sem]) : sem, kw.terms);
      } catch (e) {
        if (my === seq) { status.hidden = false; status.textContent = `Smart search failed (${e.message}); showing keyword results.`; }
      }
    }

    function move(by) {
      const hits = list.querySelectorAll(".search-hit");
      if (!hits.length) return;
      if (active >= 0) hits[active].classList.remove("active");
      active = (active + by + hits.length) % hits.length;
      hits[active].classList.add("active");
      hits[active].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, smart ? 200 : 60); });
    input.addEventListener("focus", () => { loadIndex().catch(() => {}); if (input.value.trim()) open(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); open(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        const hits = list.querySelectorAll(".search-hit");
        const hit = hits[active >= 0 ? active : 0];
        if (hit) { e.preventDefault(); close(); location.href = hit.href; }
      }
      else if (e.key === "Escape") { close(); input.blur(); }
    });
    document.addEventListener("click", e => { if (!box.contains(e.target)) close(); });
    document.addEventListener("keydown", e => {
      const t = e.target;
      const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); input.focus(); input.select(); }
    });
  }

  function start() { assignHeadingIds(); mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
