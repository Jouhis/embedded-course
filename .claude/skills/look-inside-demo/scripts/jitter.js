// Append to shoot.py --do after a scenario. Samples every text in the scene every 50 ms for 4 s and lists the
// texts whose position changed 10 or more times: a label that jumps up and down reads as a glitch.
const scene = document.querySelector(".widget svg");
const seen = new Map();
for (let k = 0; k < 80; k++) {
  scene.querySelectorAll("text").forEach((t, i) => {
    const b = t.getBBox(), key = i, pos = Math.round(b.y) + "," + Math.round(b.x);
    const r = seen.get(key) || { n: 0, last: pos, txt: t.textContent.slice(0, 40) };
    if (r.last !== pos) { r.n++; r.last = pos; }
    seen.set(key, r);
  });
  await W(50);
}
const jumpy = [...seen.values()].filter(r => r.n >= 10).map(r => `${r.n}x "${r.txt}"`);
log("JITTER(4s)", jumpy.length ? "\n  " + jumpy.join("\n  ") : "none");
