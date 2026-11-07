// Embed the search passages for the course's semantic search. Run by tools/maintainer/build_search.py --semantic.
//   node tools/maintainer/search/embed.mjs <passages.json> <out dir>
// Writes <out>/vectors.bin (one int8 vector per section, L2-normalised and scaled by 127) and
// <out>/vectors.json (model and size). A section split into several passages gets the normalised
// mean of their vectors. The browser (assets/search.js) embeds the question with the same model,
// using the model, dtype and library version recorded in vectors.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pipeline, env } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";
const DTYPE = "q8";

const [, , passagesPath, outDir] = process.argv;
const passages = JSON.parse(readFileSync(passagesPath, "utf8"));
const nDocs = passages.reduce((m, p) => Math.max(m, p.d + 1), 0);

env.cacheDir = join(import.meta.dirname, ".cache");   // the model download, git-ignored
const embed = await pipeline("feature-extraction", MODEL, { dtype: DTYPE });

let dim = 0, sums = null;
const BATCH = 32, t0 = Date.now();
for (let i = 0; i < passages.length; i += BATCH) {
  const batch = passages.slice(i, i + BATCH);
  const out = await embed(batch.map(p => p.x), { pooling: "mean", normalize: true });
  if (!sums) { dim = out.dims[1]; sums = new Float32Array(nDocs * dim); }
  batch.forEach((p, k) => {
    for (let j = 0; j < dim; j++) sums[p.d * dim + j] += out.data[k * dim + j];
  });
  if ((i / BATCH) % 20 === 0) process.stdout.write(`\r  embedded ${i + batch.length}/${passages.length}`);
}

const q = new Int8Array(nDocs * dim);
for (let d = 0; d < nDocs; d++) {
  let n = 0;
  for (let j = 0; j < dim; j++) n += sums[d * dim + j] ** 2;
  n = Math.sqrt(n) || 1;
  for (let j = 0; j < dim; j++) q[d * dim + j] = Math.round((sums[d * dim + j] / n) * 127);
}
writeFileSync(join(outDir, "vectors.bin"), q);
// lib: the transformers.js version that made the vectors; the browser loads the same one.
writeFileSync(join(outDir, "vectors.json"),
              JSON.stringify({ model: MODEL, dtype: DTYPE, lib: env.version, dim, count: nDocs }));
console.log(`\rsearch vectors: ${nDocs} sections x ${dim}, ${(q.length / 1e6).toFixed(1)} MB, ` +
            `${((Date.now() - t0) / 1000).toFixed(0)} s -> ${join(outDir, "vectors.bin")}`);
