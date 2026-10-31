/* CPU simulator widget: a tiny ARM-flavoured CPU for Part 2 (Computer Architecture).
 *
 * Usage in a lesson (load after course.js):
 *
 *   <div class="widget cpusim" data-title="Count to five" data-show="regs,flags,mem,io,stack,pipeline">
 *     <script type="text/plain">
 *             MOV  R0, #0          @ comment (also ; or //)
 *     loop:   ADD  R0, R0, #1
 *             CMP  R0, #5
 *             BNE  loop
 *             B    .               @ "." = branch to self (halt)
 *     </script>
 *   </div>
 *
 * data-show (optional, comma list): regs, flags, mem, io, stack, pipeline, phases. Default: regs,flags,io,phases.
 *
 * Machine model (deliberately Cortex-M-like, simplified):
 *   Registers R0–R12, SP (R13), LR (R14), PC (R15); flags N Z C V; PRIMASK (I); mode Thread/Handler.
 *   Code at 0x0000_0000, 2 bytes per instruction (like Thumb).
 *   RAM 0x2000_0000–0x2000_00FF (64 words); SP starts at 0x2000_0100 (full-descending stack).
 *   GPIO: 0x4000_0000 = ODR (8 LEDs, write), 0x4000_0004 = IDR (8 switches, read).
 *   Interrupt: the "IRQ" button sets a pending interrupt. If PRIMASK=0 and a label IRQ_Handler exists, at the
 *   next instruction boundary the CPU stacks xPSR, PC, LR, R12, R3, R2, R1, R0 (8 words, R0 lowest, like Cortex-M),
 *   sets LR = 0xFFFFFFF9 (EXC_RETURN) and jumps to IRQ_Handler in Handler mode. BX LR / POP {PC} with an
 *   EXC_RETURN value unstacks and returns.
 *
 * Instructions:
 *   MOV Rd, #imm | Rm      MVN Rd, Rm         LDR Rd, =imm32 | =label
 *   ADD/SUB/AND/ORR/EOR/BIC Rd, Rn, #imm | Rm      LSL/LSR Rd, Rn, #imm
 *   ADDS... (S suffix accepted; arithmetic/logic always set flags here, like most Thumb 16-bit forms)
 *   CMP Rn, #imm | Rm      TST Rn, #imm | Rm
 *   B label  B.  BEQ BNE BCS BCC BMI BPL BHI BLS BGE BLT BGT BLE label
 *   BL label  BX Rm
 *   LDR/STR Rd, [Rn]  |  [Rn, #off]
 *   PUSH {reglist}  POP {reglist}  (ranges like R4-R7 allowed)
 *   NOP  WFI  CPSID I  CPSIE I
 *   SVC #n                 supervisor call → SVC_Handler (IPSR = 11)
 *   MRS Rd, MSP|PSP|CONTROL|PRIMASK|IPSR|APSR      MSR MSP|PSP|CONTROL|PRIMASK, Rn  (MSR is privileged)
 *
 * Stacks: R13 is the active SP. Thread mode uses PSP when CONTROL.SPSEL (bit 1) = 1, otherwise MSP;
 * Handler mode always uses MSP. CONTROL.nPRIV (bit 0) = 1 makes Thread mode unprivileged (MSR/CPSID ignored).
 * EXC_RETURN: 0xFFFFFFF9 = back to Thread/MSP, 0xFFFFFFFD = back to Thread/PSP. Nested exceptions are not modelled.
 * data-show adds "sys" for an MSP/PSP/CONTROL/IPSR panel.
 */
(function () {
  "use strict";

  const RAM_BASE = 0x20000000, RAM_WORDS = 64, STACK_TOP = 0x20000100;
  const GPIO_ODR = 0x40000000, GPIO_IDR = 0x40000004;
  const EXC_RETURN = 0xFFFFFFF9;          // return to Thread mode, use MSP
  const EXC_RETURN_PSP = 0xFFFFFFFD;      // return to Thread mode, use PSP
  const EXC_RETURN_HANDLER = 0xFFFFFFF1;  // return to Handler mode (nesting: not modelled)
  const SVC_NUM = 11, IRQ_NUM = 16;       // exception numbers shown in IPSR
  const SYSREGS = ["MSP", "PSP", "CONTROL", "PRIMASK", "IPSR", "APSR"];
  const REG_NAMES = ["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12", "SP", "LR", "PC"];
  const CONDS = { EQ: f => f.Z, NE: f => !f.Z, CS: f => f.C, HS: f => f.C, CC: f => !f.C, LO: f => !f.C,
    MI: f => f.N, PL: f => !f.N, HI: f => f.C && !f.Z, LS: f => !f.C || f.Z,
    GE: f => f.N === f.V, LT: f => f.N !== f.V, GT: f => !f.Z && f.N === f.V, LE: f => f.Z || f.N !== f.V };

  const u32 = x => x >>> 0;
  const hex = (x, w = 8) => "0x" + u32(x).toString(16).toUpperCase().padStart(w, "0");

  // ---------------------------------------------------------------- assembler

  function regIndex(tok) {
    const t = tok.trim().toUpperCase();
    const alias = { SP: 13, LR: 14, PC: 15 };
    if (t in alias) return alias[t];
    const m = t.match(/^R(\d{1,2})$/);
    if (m && +m[1] <= 15) return +m[1];
    throw new Error(`"${tok}" is not a register`);
  }

  function immValue(tok) {
    const t = tok.trim().replace(/^#/, "");
    const v = /^-?0x/i.test(t) ? parseInt(t, 16) : /^-?0b/i.test(t) ? parseInt(t.replace(/0b/i, ""), 2) : parseInt(t, 10);
    if (isNaN(v)) throw new Error(`"${tok}" is not a number`);
    return v;
  }

  function parseRegList(s) {
    const inner = s.trim().replace(/^\{|\}$/g, "");
    const regs = new Set();
    inner.split(",").forEach(part => {
      const p = part.trim();
      if (!p) return;
      const r = p.split("-");
      if (r.length === 2) {
        const a = regIndex(r[0]), b = regIndex(r[1]);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) regs.add(i);
      } else regs.add(regIndex(p));
    });
    return [...regs].sort((a, b) => a - b);
  }

  function splitOperands(s) {
    // Split on commas that are not inside [] or {}
    const out = []; let depth = 0, cur = "";
    for (const ch of s) {
      if (ch === "[" || ch === "{") depth++;
      if (ch === "]" || ch === "}") depth--;
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function assemble(source) {
    const lines = source.replace(/\r/g, "").split("\n");
    const prog = [], labels = {}, pending = [];
    lines.forEach((raw, lineNo) => {
      let line = raw.replace(/(@|;|\/\/).*$/, "").trim();
      if (!line) return;
      let m;
      while ((m = line.match(/^([A-Za-z_][\w]*):\s*/))) {
        labels[m[1]] = prog.length * 2;
        line = line.slice(m[0].length);
      }
      if (!line) return;
      const sp = line.search(/\s/);
      const mnem = (sp < 0 ? line : line.slice(0, sp)).toUpperCase();
      const ops = sp < 0 ? [] : splitOperands(line.slice(sp + 1));
      pending.push({ mnem, ops, lineNo, text: raw.trim() });
      prog.push(null);
    });
    pending.forEach((p, i) => {
      try { prog[i] = decodeText(p, labels, i * 2); }
      catch (e) { throw new Error(`Line ${p.lineNo + 1} ("${p.text}"): ${e.message}`); }
    });
    return { prog, labels };
  }

  function decodeText({ mnem, ops, text }, labels, addr) {
    let base = mnem.replace(/\.W$|\.N$/, "");
    const ins = { text: text.replace(/(@|;|\/\/).*$/, "").replace(/^[A-Za-z_]\w*:\s*/, "").trim(), addr };
    const target = t => {
      if (t === ".") return addr;
      if (!(t in labels)) throw new Error(`unknown label "${t}"`);
      return labels[t];
    };
    const operand2 = t => (t.trim().startsWith("#") ? { imm: immValue(t) } : { rm: regIndex(t) });

    if (base === "NOP" || base === "WFI") return Object.assign(ins, { op: base });
    if (base === "CPSID" || base === "CPSIE") return Object.assign(ins, { op: base });
    if (base === "SVC") return Object.assign(ins, { op: "SVC", imm: immValue(ops[0] || "#0") });
    if (base === "MRS") {
      const sys = (ops[1] || "").toUpperCase();
      if (!SYSREGS.includes(sys)) throw new Error(`MRS: special register must be one of ${SYSREGS.join(", ")}`);
      return Object.assign(ins, { op: "MRS", rd: regIndex(ops[0]), sys });
    }
    if (base === "MSR") {
      const sys = (ops[0] || "").toUpperCase();
      if (!["MSP", "PSP", "CONTROL", "PRIMASK"].includes(sys)) throw new Error("MSR: special register must be MSP, PSP, CONTROL or PRIMASK");
      return Object.assign(ins, { op: "MSR", sys, rn: regIndex(ops[1]) });
    }
    if (base === "BL") return Object.assign(ins, { op: "BL", target: target(ops[0]) });
    if (base === "BX") return Object.assign(ins, { op: "BX", rm: regIndex(ops[0]) });
    if (base === "B" || (base.length === 3 && base[0] === "B" && base.slice(1) in CONDS)) {
      return Object.assign(ins, { op: "B", cond: base === "B" ? null : base.slice(1), target: target(ops[0]) });
    }
    if (base === "PUSH" || base === "POP") {
      return Object.assign(ins, { op: base, regs: parseRegList(ops.join(",")) });
    }
    if (base === "LDR" || base === "STR") {
      const rd = regIndex(ops[0]);
      if (base === "LDR" && ops[1].startsWith("=")) {
        const lit = ops[1].slice(1).trim();
        // LDR Rd, =label loads the label's address (as in GNU as); LDR Rd, =number loads the number.
        const value = /^[A-Za-z_]\w*$/.test(lit) ? target(lit) : immValue(lit);
        return Object.assign(ins, { op: "MOV", rd, imm: value });
      }
      const mm = ops[1].match(/^\[\s*(\w+)\s*(?:,\s*(#?[-\w]+))?\s*\]$/);
      if (!mm) throw new Error("expected [Rn] or [Rn, #offset]");
      return Object.assign(ins, { op: base, rd, rn: regIndex(mm[1]), off: mm[2] ? immValue(mm[2]) : 0 });
    }
    const flagsVariant = base.length === 4 && base.endsWith("S") && ["ADDS", "SUBS", "ANDS", "ORRS", "EORS", "BICS", "MOVS", "LSLS", "LSRS", "MVNS"].includes(base);
    if (flagsVariant) base = base.slice(0, -1);
    if (base === "MOV" || base === "MVN") {
      return Object.assign(ins, { op: base, rd: regIndex(ops[0]) }, operand2(ops[1]));
    }
    if (base === "CMP" || base === "TST") {
      return Object.assign(ins, { op: base, rn: regIndex(ops[0]) }, operand2(ops[1]));
    }
    if (["ADD", "SUB", "AND", "ORR", "EOR", "BIC", "LSL", "LSR"].includes(base)) {
      if (ops.length === 2) ops = [ops[0], ops[0], ops[1]];  // ADD R0, #1 shorthand
      return Object.assign(ins, { op: base, rd: regIndex(ops[0]), rn: regIndex(ops[1]) }, operand2(ops[2]));
    }
    throw new Error(`unknown instruction "${mnem}"`);
  }

  // ---------------------------------------------------------------- machine

  class Machine {
    constructor(prog, labels) {
      this.prog = prog; this.labels = labels;
      this.reset();
    }
    reset() {
      this.r = new Array(16).fill(0);
      this.r[13] = STACK_TOP;
      this.msp = STACK_TOP; this.psp = 0; this.control = 0; this.ipsr = 0;
      this.f = { N: false, Z: false, C: false, V: false };
      this.primask = false;
      this.mode = "Thread";
      this.ram = new Array(RAM_WORDS).fill(0);
      this.odr = 0; this.idr = 0;
      this.irqPending = false;
      this.halted = false; this.waiting = false;
      this.cycle = 0;
      this.trace = [];           // executed instructions, for the pipeline view
      this.lastWrite = null; this.lastRead = null;
      this.phase = "fetch"; this.ir = null; this.decoded = "";
      this.log = [];
    }
    pcIndex() { return this.r[15] / 2; }

    read(addr) {
      addr = u32(addr);
      if (addr === GPIO_ODR) return this.odr;
      if (addr === GPIO_IDR) return this.idr;
      const i = (addr - RAM_BASE) / 4;
      if (addr % 4 || i < 0 || i >= RAM_WORDS) throw new Error(`bus fault: no memory at ${hex(addr)} (or address not word-aligned)`);
      this.lastRead = addr;
      return this.ram[i];
    }
    write(addr, v) {
      addr = u32(addr);
      if (addr === GPIO_ODR) { this.odr = v & 0xFF; this.lastWrite = addr; return; }
      if (addr === GPIO_IDR) return;   // read-only register: writes are ignored
      const i = (addr - RAM_BASE) / 4;
      if (addr % 4 || i < 0 || i >= RAM_WORDS) throw new Error(`bus fault: no memory at ${hex(addr)} (or address not word-aligned)`);
      this.ram[i] = u32(v);
      this.lastWrite = addr;
    }
    push(v) { this.r[13] = u32(this.r[13] - 4); this.write(this.r[13], v); }
    pop() { const v = this.read(this.r[13]); this.r[13] = u32(this.r[13] + 4); return v; }

    xpsr() { const f = this.f; return u32((f.N << 31) | (f.Z << 30) | (f.C << 29) | (f.V << 28)); }
    setXpsr(v) { this.f = { N: !!(v >>> 31 & 1), Z: !!(v >>> 30 & 1), C: !!(v >>> 29 & 1), V: !!(v >>> 28 & 1) }; }

    setNZ(res) { this.f.N = !!(res >>> 31); this.f.Z = u32(res) === 0; }
    addFlags(a, b, carryIn = 0) {
      const res = u32(a + b + carryIn);
      this.f.C = a + b + carryIn > 0xFFFFFFFF;
      this.f.V = !!((~(a ^ b) & (a ^ res)) >>> 31);
      this.setNZ(res);
      return res;
    }

    // ----- Banked stack pointers: R13 is the *active* SP; the inactive one lives in msp/psp. -----
    usingPsp() { return this.mode === "Thread" && (this.control & 2) !== 0; }
    saveSp() { if (this.usingPsp()) this.psp = this.r[13]; else this.msp = this.r[13]; }
    loadSp() { this.r[13] = this.usingPsp() ? this.psp : this.msp; }
    readSp(which) { this.saveSp(); return which === "PSP" ? this.psp : this.msp; }
    writeSp(which, v) { this.saveSp(); if (which === "PSP") this.psp = u32(v) & ~3; else this.msp = u32(v) & ~3; this.loadSp(); }

    /* Exception entry, as on Cortex-M: stack 8 words on the CURRENT stack (MSP or PSP),
       switch to Handler mode (always MSP), LR = EXC_RETURN encoding where we came from. */
    enterException(num, handlerLabel, returnPc) {
      const fromPsp = this.usingPsp();
      const frame = [this.xpsr() | (this.ipsr & 0x1FF), returnPc, this.r[14], this.r[12], this.r[3], this.r[2], this.r[1], this.r[0]];
      frame.forEach(v => this.push(v));          // R0 ends up at the lowest address
      this.saveSp();
      this.r[14] = this.mode === "Handler" ? EXC_RETURN_HANDLER : fromPsp ? EXC_RETURN_PSP : EXC_RETURN;
      this.mode = "Handler";
      this.ipsr = num;
      this.loadSp();                              // Handler mode always uses MSP
      this.r[15] = this.labels[handlerLabel];
      this.log.push(`${handlerLabel}: stacked 8 words on ${fromPsp ? "PSP" : "MSP"}, LR = ${hex(this.r[14])}`);
      this.trace.push({ text: `(exception entry → ${handlerLabel})`, irq: true, taken: true });
    }

    /* Take a pending interrupt at an instruction boundary. Returns true if it did. */
    maybeTakeIrq() {
      if (!this.irqPending || this.primask || this.mode === "Handler" || !("IRQ_Handler" in this.labels)) return false;
      this.irqPending = false;
      this.waiting = false;
      this.enterException(IRQ_NUM, "IRQ_Handler", this.r[15]);
      return true;
    }

    exceptionReturn(excReturn) {
      if (excReturn === EXC_RETURN_HANDLER) throw new Error("nested exception return is not modelled by this simulator");
      this.saveSp();
      this.mode = "Thread";
      this.ipsr = 0;
      if (excReturn === EXC_RETURN_PSP) this.control |= 2; else this.control &= ~2;
      this.loadSp();                              // unstack from the stack the frame was pushed to
      const vals = [];
      for (let i = 0; i < 8; i++) vals.push(this.pop());
      [this.r[0], this.r[1], this.r[2], this.r[3], this.r[12], this.r[14], this.r[15]] = vals.slice(0, 7);
      this.setXpsr(vals[7]);
      this.log.push(`Exception return: unstacked 8 words from ${excReturn === EXC_RETURN_PSP ? "PSP" : "MSP"}, back to Thread mode`);
    }

    branchTo(addr) {
      addr = u32(addr);
      if (this.mode === "Handler" && (addr === EXC_RETURN || addr === EXC_RETURN_PSP || addr === EXC_RETURN_HANDLER)) {
        this.exceptionReturn(addr); return;
      }
      this.r[15] = addr & ~1;
    }

    /* Advance one phase (fetch -> decode -> execute). Returns a description of what happened. */
    microStep() {
      if (this.halted) return "Halted.";
      if (this.phase === "fetch") {
        if (this.maybeTakeIrq()) return "Interrupt! The CPU saved its context on the stack and jumped to IRQ_Handler.";
        if (this.waiting) return "WFI: sleeping until an interrupt arrives (press IRQ).";
        const ins = this.prog[this.pcIndex()];
        if (!ins) { this.halted = true; return `Ran off the end of the program at ${hex(this.r[15])}.`; }
        this.ir = ins; this.phase = "decode";
        return `FETCH: read the instruction at PC = ${hex(this.r[15])} into the instruction register.`;
      }
      if (this.phase === "decode") {
        this.decoded = describe(this.ir);
        this.phase = "execute";
        return `DECODE: ${this.decoded}`;
      }
      const msg = this.execute(this.ir);
      this.phase = "fetch";
      return `EXECUTE: ${msg}`;
    }

    step() {   // one whole instruction (or an interrupt entry)
      if (this.phase !== "fetch") { let m; do { m = this.microStep(); } while (this.phase !== "fetch" && !this.halted); return m; }
      const first = this.microStep();
      if (this.phase === "fetch") return first;   // IRQ entry, WFI or halt
      this.microStep();
      return this.microStep();
    }

    execute(ins) {
      const r = this.r, pc = r[15];
      let next = pc + 2, taken = false, msg = "";
      const src2 = () => ("imm" in ins ? u32(ins.imm) : r[ins.rm]);
      this.lastWrite = this.lastRead = null;
      switch (ins.op) {
        case "NOP": msg = "nothing."; break;
        case "SVC":
          if (!("SVC_Handler" in this.labels)) throw new Error("SVC executed but there is no SVC_Handler label");
          this.cycle++; this.trace.push({ text: ins.text, taken: false });
          this.enterException(SVC_NUM, "SVC_Handler", u32(pc + 2));
          return `supervisor call #${ins.imm}: synchronous exception → SVC_Handler (IPSR = ${SVC_NUM}).`;
        case "MRS": {
          const v = { MSP: () => this.readSp("MSP"), PSP: () => this.readSp("PSP"), CONTROL: () => this.control,
                      PRIMASK: () => (this.primask ? 1 : 0), IPSR: () => this.ipsr, APSR: () => this.xpsr() }[ins.sys]();
          r[ins.rd] = u32(v); msg = `${REG_NAMES[ins.rd]} = ${ins.sys} = ${hex(v)}`; break;
        }
        case "MSR": {
          const privileged = this.mode === "Handler" || !(this.control & 1);
          if (!privileged) { msg = `ignored: unprivileged code cannot write ${ins.sys}.`; break; }
          const v = r[ins.rn];
          if (ins.sys === "MSP" || ins.sys === "PSP") this.writeSp(ins.sys, v);
          else if (ins.sys === "PRIMASK") this.primask = !!(v & 1);
          else { this.saveSp(); this.control = v & 3; this.loadSp(); }
          msg = `${ins.sys} = ${hex(v & (ins.sys === "CONTROL" ? 3 : 0xFFFFFFFF))}` +
                (ins.sys === "CONTROL" && this.mode === "Thread" ? ` (Thread mode now uses ${this.usingPsp() ? "PSP" : "MSP"}${v & 1 ? ", unprivileged" : ""})` : "") + ".";
          break;
        }
        case "WFI": this.waiting = true; msg = "wait for interrupt."; break;
        case "CPSID": if (this.mode === "Thread" && (this.control & 1)) { msg = "ignored: unprivileged code cannot mask interrupts."; break; } this.primask = true; msg = "interrupts disabled (PRIMASK = 1)."; break;
        case "CPSIE": this.primask = false; msg = "interrupts enabled (PRIMASK = 0)."; break;
        case "MOV": r[ins.rd] = src2(); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "MVN": r[ins.rd] = u32(~src2()); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "ADD": r[ins.rd] = this.addFlags(r[ins.rn], src2()); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "SUB": r[ins.rd] = this.addFlags(r[ins.rn], u32(~src2()), 1); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "CMP": this.addFlags(r[ins.rn], u32(~src2()), 1); msg = `compared ${REG_NAMES[ins.rn]} with ${"imm" in ins ? ins.imm : REG_NAMES[ins.rm]}; flags updated.`; break;
        case "TST": this.setNZ(r[ins.rn] & src2()); msg = "tested bits; N and Z updated."; break;
        case "AND": r[ins.rd] = u32(r[ins.rn] & src2()); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "ORR": r[ins.rd] = u32(r[ins.rn] | src2()); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "EOR": r[ins.rd] = u32(r[ins.rn] ^ src2()); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "BIC": r[ins.rd] = u32(r[ins.rn] & ~src2()); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break;
        case "LSL": { const s = src2() & 31; if (s) this.f.C = !!((r[ins.rn] >>> (32 - s)) & 1); r[ins.rd] = u32(r[ins.rn] << s); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break; }
        case "LSR": { const s = src2() & 31; if (s) this.f.C = !!((r[ins.rn] >>> (s - 1)) & 1); r[ins.rd] = u32(r[ins.rn] >>> s); this.setNZ(r[ins.rd]); msg = `${REG_NAMES[ins.rd]} = ${hex(r[ins.rd])}`; break; }
        case "LDR": { const a = u32(r[ins.rn] + ins.off); r[ins.rd] = this.read(a); msg = `loaded ${hex(r[ins.rd])} from ${hex(a)} into ${REG_NAMES[ins.rd]}.`; break; }
        case "STR": { const a = u32(r[ins.rn] + ins.off); this.write(a, r[ins.rd]); msg = `stored ${REG_NAMES[ins.rd]} (${hex(r[ins.rd])}) to ${hex(a)}${a === GPIO_ODR ? ": the LEDs changed (memory-mapped GPIO)" : ""}.`; break; }
        case "PUSH": for (let i = ins.regs.length - 1; i >= 0; i--) this.push(r[ins.regs[i]]); msg = `pushed {${ins.regs.map(i => REG_NAMES[i]).join(", ")}}; SP = ${hex(r[13])}.`; break;
        case "POP": {
          let newPc = null;
          ins.regs.forEach(i => { const v = this.pop(); if (i === 15) newPc = v; else r[i] = v; });
          msg = `popped {${ins.regs.map(i => REG_NAMES[i]).join(", ")}}; SP = ${hex(r[13])}.`;
          if (newPc !== null) { taken = true; this.branchTo(newPc); next = null; }
          break;
        }
        case "B":
          if (!ins.cond || CONDS[ins.cond](this.f)) {
            taken = true; next = ins.target;
            msg = ins.target === pc ? "branch to itself: the program is parked here." : `branch taken to ${hex(ins.target)}.`;
            if (ins.target === pc && !this.irqPending) this.parked = true;
          } else msg = `condition ${ins.cond} is false: branch not taken.`;
          break;
        case "BL": r[14] = u32(pc + 2) | 1; next = ins.target; taken = true; msg = `call: LR = return address ${hex(pc + 2)} (+1 Thumb bit), jump to ${hex(ins.target)}.`; break;
        case "BX": taken = true; next = null; { const v = r[ins.rm]; this.branchTo(v); msg = v === EXC_RETURN ? "BX with EXC_RETURN: exception return." : `return/jump to ${hex(v & ~1)}.`; } break;
        default: throw new Error("unimplemented " + ins.op);
      }
      if (next !== null) r[15] = u32(next);
      this.cycle++;
      this.trace.push({ text: ins.text, taken });
      if (this.trace.length > 40) this.trace.shift();
      return msg;
    }
  }

  function describe(ins) {
    const R = i => REG_NAMES[i];
    const src = "imm" in ins ? `the constant ${ins.imm}` : R(ins.rm);
    switch (ins.op) {
      case "MOV": return `move ${src} into ${R(ins.rd)}.`;
      case "MVN": return `move NOT ${src} into ${R(ins.rd)}.`;
      case "ADD": case "SUB": case "AND": case "ORR": case "EOR": case "BIC": case "LSL": case "LSR":
        return `ALU operation ${ins.op}: ${R(ins.rd)} ← ${R(ins.rn)} ${ins.op} ${src}; update flags.`;
      case "CMP": return `subtract ${src} from ${R(ins.rn)}, keep only the flags.`;
      case "TST": return `AND ${R(ins.rn)} with ${src}, keep only the flags.`;
      case "LDR": return `load: address = ${R(ins.rn)} + ${ins.off}; read memory into ${R(ins.rd)}.`;
      case "STR": return `store: address = ${R(ins.rn)} + ${ins.off}; write ${R(ins.rd)} to memory.`;
      case "B": return ins.cond ? `conditional branch if ${ins.cond}; check the flags.` : "unconditional branch.";
      case "SVC": return "supervisor call: raise the SVCall exception (used by an RTOS to enter the kernel).";
      case "MRS": return `read special register ${ins.sys} into ${R(ins.rd)}.`;
      case "MSR": return `write ${R(ins.rn)} into special register ${ins.sys} (privileged only).`;
      case "BL": return "branch with link: save the return address in LR, then jump.";
      case "BX": return `branch to the address in ${R(ins.rm)}.`;
      case "PUSH": return `push ${ins.regs.length} register(s): SP moves down by ${ins.regs.length * 4} bytes.`;
      case "POP": return `pop ${ins.regs.length} register(s): SP moves up by ${ins.regs.length * 4} bytes.`;
      default: return ins.op + ".";
    }
  }

  // ---------------------------------------------------------------- UI

  const CSS = `
  .cpusim .cs-grid{display:grid;grid-template-columns:minmax(14rem,1fr) minmax(14rem,1fr);gap:1rem}
  @media(max-width:40rem){.cpusim .cs-grid{grid-template-columns:1fr}}
  .cpusim .cs-code{font-family:var(--mono);font-size:.8rem;line-height:1.5;margin:0;padding:.5rem;background:var(--code-bg);border-radius:4px;max-height:22rem;overflow:auto}
  .cpusim .cs-code div{white-space:pre;padding:0 .3rem;border-radius:3px}
  .cpusim .cs-code div.pc{background:var(--accent);color:var(--bg)}
  .cpusim .cs-code .addr{color:var(--muted);margin-right:.6rem}
  .cpusim .cs-code div.pc .addr{color:inherit}
  .cpusim table{font-family:var(--mono);font-size:.78rem;margin:.25rem 0 .75rem}
  .cpusim td,.cpusim th{padding:.1rem .4rem}
  .cpusim .chg{background:var(--warn-soft);color:var(--warn);font-weight:700}
  .cpusim .cs-controls{display:flex;flex-wrap:wrap;gap:.4rem;margin:.75rem 0}
  .cpusim .cs-msg{font-family:var(--sans);font-size:.85rem;background:var(--accent-soft);padding:.5rem .75rem;border-radius:4px;min-height:2.6rem}
  .cpusim .cs-phase{display:flex;gap:.3rem;margin:.5rem 0}
  .cpusim .cs-phase span{flex:1;text-align:center;padding:.2rem;border:1px solid var(--rule);border-radius:3px;font-size:.75rem;font-weight:700;letter-spacing:.05em}
  .cpusim .cs-phase span.on{background:var(--accent);color:var(--bg);border-color:var(--accent)}
  .cpusim .leds{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap}
  .cpusim .led{width:1.1rem;height:1.1rem;border-radius:50%;border:1px solid var(--rule);background:var(--code-bg)}
  .cpusim .led.on{background:#e53935;box-shadow:0 0 8px #e53935;border-color:#e53935}
  .cpusim .sw{font-family:var(--mono);font-size:.75rem;padding:.1rem .35rem;cursor:pointer}
  .cpusim .flag{display:inline-block;width:1.6rem;text-align:center;border:1px solid var(--rule);border-radius:3px;margin-right:.2rem;font-family:var(--mono);font-size:.8rem}
  .cpusim .flag.set{background:var(--good);color:var(--bg);border-color:var(--good)}
  .cpusim .cs-err{color:var(--bad);font-family:var(--mono);font-size:.85rem}
  .cpusim .pipe td{text-align:center;min-width:1.6rem;border:1px solid var(--rule)}
  .cpusim .pipe td.F{background:var(--accent-soft)} .cpusim .pipe td.D{background:var(--warn-soft)} .cpusim .pipe td.E{background:var(--good-soft)}
  .cpusim .pipe td.X{background:var(--bad-soft);color:var(--bad)}
  .cpusim .pipe td.lbl{text-align:left;white-space:nowrap;border:none;font-size:.72rem}
  .cpusim h4{font-family:var(--sans);font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:.5rem 0 .2rem}`;

  function injectCss() {
    if (document.getElementById("cpusim-css")) return;
    const s = document.createElement("style");
    s.id = "cpusim-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function mount(container) {
    const E = (window.Course && window.Course.el) || ((t, a, c) => { const n = document.createElement(t); Object.assign(n, a); (c || []).forEach(x => n.append(x)); return n; });
    const srcEl = container.querySelector('script[type="text/plain"]');
    const source = srcEl ? srcEl.textContent : "";
    const show = new Set((container.dataset.show || "regs,flags,io,phases").split(",").map(s => s.trim()));
    container.appendChild(E("h3", { text: container.dataset.title || "CPU simulator" }));

    let asm;
    try { asm = assemble(source); }
    catch (e) { container.appendChild(E("p", { class: "cs-err", text: e.message })); return; }
    const m = new Machine(asm.prog, asm.labels);
    let prevRegs = m.r.slice(), timer = null;

    const code = E("div", { class: "cs-code" });
    asm.prog.forEach(ins => {
      const row = E("div");
      row.appendChild(E("span", { class: "addr", text: hex(ins.addr, 4) }));
      row.appendChild(document.createTextNode(ins.text));
      code.appendChild(row);
    });
    const phase = E("div", { class: "cs-phase" }, ["FETCH", "DECODE", "EXECUTE"].map(t => E("span", { text: t })));
    const msg = E("div", { class: "cs-msg", text: "Press Step to execute one phase, or Instruction for a whole instruction." });
    const state = E("div");
    const pipe = E("div");
    const left = E("div", {}, [E("h4", { text: "Program (PC highlighted)" }), code]);
    if (show.has("phases")) left.appendChild(phase);
    left.appendChild(msg);
    const grid = E("div", { class: "cs-grid" }, [left, state]);

    const btn = (label, fn, cls) => { const b = E("button", { class: "btn" + (cls ? " " + cls : ""), type: "button", text: label }); b.addEventListener("click", fn); return b; };
    const guard = fn => () => { try { fn(); } catch (e) { m.halted = true; msg.textContent = "Fault: " + e.message; stop(); } render(); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; runBtn.textContent = "Run"; } };
    const runBtn = btn("Run", () => {
      if (timer) { stop(); return; }
      runBtn.textContent = "Pause";
      timer = setInterval(guard(() => {
        prevRegs = m.r.slice();
        msg.textContent = m.step();
        if (m.halted || m.parked) { m.parked = false; stop(); }
      }), 350);
    });
    const controls = E("div", { class: "cs-controls" }, [
      btn("Step", guard(() => { prevRegs = m.r.slice(); msg.textContent = m.microStep(); })),
      btn("Instruction", guard(() => { prevRegs = m.r.slice(); msg.textContent = m.step(); m.parked = false; })),
      runBtn,
      btn("Reset", () => { stop(); m.reset(); prevRegs = m.r.slice(); msg.textContent = "Reset: PC = 0, SP = " + hex(STACK_TOP) + "."; render(); }, "secondary"),
    ]);
    if ("IRQ_Handler" in asm.labels) {
      controls.appendChild(btn("IRQ ⚡", () => { m.irqPending = true; msg.textContent = m.primask ? "IRQ pending, but interrupts are disabled (PRIMASK = 1)." : "IRQ pending: it will be taken at the next instruction boundary."; render(); }, "secondary"));
    }
    container.appendChild(controls);
    container.appendChild(grid);
    if (show.has("pipeline")) container.appendChild(pipe);

    function render() {
      [...code.children].forEach((row, i) => row.classList.toggle("pc", i === m.pcIndex()));
      const cur = code.children[m.pcIndex()];
      if (cur) cur.scrollIntoView({ block: "nearest" });
      phase.querySelectorAll("span").forEach(s => s.classList.toggle("on", s.textContent.toLowerCase() === m.phase && !m.halted));

      state.innerHTML = "";
      if (show.has("regs")) {
        state.appendChild(E("h4", { text: `Registers · ${m.mode} mode` }));
        const t = E("table");
        for (let i = 0; i < 16; i += 2) {
          const tr = E("tr");
          [i, i + 1].forEach(j => {
            tr.appendChild(E("th", { text: REG_NAMES[j] }));
            tr.appendChild(E("td", { class: m.r[j] !== prevRegs[j] ? "chg" : "", text: hex(m.r[j]) }));
          });
          t.appendChild(tr);
        }
        state.appendChild(t);
      }
      if (show.has("sys")) {
        state.appendChild(E("h4", { text: "System registers" }));
        m.saveSp();
        const t = E("table");
        [["MSP", hex(m.msp)], ["PSP", hex(m.psp)], ["CONTROL", `${m.control} (SPSEL=${(m.control >> 1) & 1}, nPRIV=${m.control & 1})`],
         ["IPSR", `${m.ipsr}${m.ipsr === IRQ_NUM ? " (IRQ)" : m.ipsr === SVC_NUM ? " (SVCall)" : m.ipsr === 0 ? " (Thread)" : ""}`],
         ["Active SP", m.usingPsp() ? "PSP" : "MSP"]]
          .forEach(([k, v]) => t.appendChild(E("tr", {}, [E("th", { text: k }), E("td", { text: v })])));
        state.appendChild(t);
      }
      if (show.has("flags")) {
        state.appendChild(E("h4", { text: "Flags (xPSR) and PRIMASK" }));
        const f = E("div");
        ["N", "Z", "C", "V"].forEach(k => f.appendChild(E("span", { class: "flag" + (m.f[k] ? " set" : ""), text: k })));
        f.appendChild(E("span", { class: "flag" + (m.primask ? " set" : ""), text: "I", title: "PRIMASK: 1 = interrupts disabled" }));
        if (m.irqPending) f.appendChild(E("span", { text: "  IRQ pending" }));
        state.appendChild(f);
      }
      if (show.has("io")) {
        state.appendChild(E("h4", { text: `GPIO: ODR @ ${hex(GPIO_ODR)} → LEDs 7…0` }));
        const leds = E("div", { class: "leds" });
        for (let b = 7; b >= 0; b--) leds.appendChild(E("span", { class: "led" + ((m.odr >> b) & 1 ? " on" : ""), title: "bit " + b }));
        state.appendChild(leds);
        state.appendChild(E("h4", { text: `Switches → IDR @ ${hex(GPIO_IDR)} (click to toggle)` }));
        const sws = E("div", { class: "leds" });
        for (let b = 7; b >= 0; b--) {
          const s = E("button", { type: "button", class: "sw btn" + ((m.idr >> b) & 1 ? "" : " secondary"), text: String(b) });
          s.addEventListener("click", () => { m.idr ^= 1 << b; render(); });
          sws.appendChild(s);
        }
        state.appendChild(sws);
      }
      if (show.has("stack") || show.has("mem")) {
        const sp = m.r[13];
        const rows = [];
        if (show.has("stack")) {
          state.appendChild(E("h4", { text: "Stack (top of RAM, grows down)" }));
          for (let a = STACK_TOP - 4; a >= Math.max(RAM_BASE, STACK_TOP - 4 * 12); a -= 4) rows.push(a);
        } else {
          state.appendChild(E("h4", { text: "RAM (first 16 words)" }));
          for (let a = RAM_BASE; a < RAM_BASE + 64; a += 4) rows.push(a);
        }
        const t = E("table");
        rows.forEach(a => {
          const tr = E("tr");
          tr.appendChild(E("th", { text: hex(a) }));
          tr.appendChild(E("td", { class: a === m.lastWrite ? "chg" : "", text: hex(m.ram[(a - RAM_BASE) / 4]) }));
          tr.appendChild(E("td", { text: a === sp ? "← SP" : (a < sp ? "" : "") }));
          t.appendChild(tr);
        });
        state.appendChild(t);
      }
      if (show.has("pipeline")) renderPipeline();
    }

    /* 3-stage pipeline view: each executed instruction is fetched one cycle after the previous one,
       except that a taken branch flushes the two instructions behind it (shown in red). */
    function renderPipeline() {
      pipe.innerHTML = "";
      pipe.appendChild(E("h4", { text: "3-stage pipeline (last 8 instructions): F = fetch, D = decode, E = execute, ✕ = flushed" }));
      const rows = [];
      let t = 0;
      m.trace.slice(-8).forEach(ent => {
        rows.push({ text: ent.text, start: t, flushed: false });
        if (ent.taken) {
          rows.push({ text: "(next instruction, wrongly fetched)", start: t + 1, flushed: true, upto: 2 });
          rows.push({ text: "(next + 1, wrongly fetched)", start: t + 2, flushed: true, upto: 1 });
          t += 3;
        } else t += 1;
      });
      const cycles = rows.length ? Math.max(...rows.map(r => r.start + 3)) : 3;
      const table = E("table", { class: "pipe" });
      const head = E("tr", {}, [E("td", { class: "lbl", text: "cycle →" })]);
      for (let c = 0; c < cycles; c++) head.appendChild(E("td", { class: "lbl", text: String(c + 1) }));
      table.appendChild(head);
      rows.forEach(r => {
        const tr = E("tr", {}, [E("td", { class: "lbl", text: r.text })]);
        for (let c = 0; c < cycles; c++) {
          const k = c - r.start;
          let cls = "", txt = "";
          if (k >= 0 && k < 3) {
            if (r.flushed && k >= r.upto) { cls = ""; }
            else if (r.flushed) { cls = "X"; txt = k === r.upto - 1 ? "✕" : "FD"[k]; }
            else { cls = "FDE"[k]; txt = cls; }
          }
          tr.appendChild(E("td", { class: cls, text: txt }));
        }
        table.appendChild(tr);
      });
      pipe.appendChild(table);
      const executed = m.trace.filter(e => !e.irq).length;
      const flushedCycles = m.trace.filter(e => e.taken).length * 2;
      if (executed) pipe.appendChild(E("p", { class: "cs-msg", text: `Executed ${executed} instructions; ${flushedCycles} cycles lost to branch flushes.` }));
    }

    render();
  }

  // Exposed for testing and for other widgets.
  window.CpuSim = { assemble, Machine, hex };

  function init() { injectCss(); document.querySelectorAll(".cpusim").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
