# Proposals from lessons 0029 to 0033 (author: depth rewrite, Part 2.1 and 2.2)

Do not merge these yourself: the lead adds them to GLOSSARY.md in the exact format used there. There are no new resources; every source these lessons cite is already in RESOURCES.md.

## GLOSSARY.md additions

Add these under `## Computer architecture`, after **Encoding (instruction)**, for the instruction-level terms. Anchors are the term lowercased, with non-alphanumerics replaced by `-`.

**Immediate**:
A constant written into an instruction's encoding, such as the 5 in `MOVS R0, #5`. Its field width limits the values it can hold.
_Avoid_: Literal (a literal pool is a separate thing, a word in flash that holds a constant too large for an immediate)

**Halfword**:
Sixteen bits, two bytes. A 16-bit Thumb instruction is one halfword, and the Cortex-M reads instructions a halfword at a time.
_Avoid_: Short (a C type name, not the unit of an instruction)

**Speculative fetch**:
The fetch of instructions after a conditional branch before its outcome is known. The core keeps the fetches if the branch falls through and flushes them if it is taken.
_Avoid_: Prediction (a broader term that also covers branch predictors)

**Throughput**:
The number of instructions a pipeline completes per cycle in steady state. Pipelining raises throughput while leaving the latency of one instruction about the same.
_Avoid_: Speed (too vague)

**Latency (instruction)**:
The number of cycles one instruction takes from fetch to completion in a pipeline. It is larger than one in a pipelined core even though throughput is one per cycle.
_Avoid_: Delay (informal)

**Caller and callee**:
The caller is the function that makes a call, and the callee is the function that is called. The calling convention divides the duties between them.
_Avoid_: Client and server (a different pair of roles)

**Preserved register**:
A register that the AAPCS requires a callee to restore before it returns: R4 to R8, R10, R11 and SP. A caller can rely on its value after the call.
_Avoid_: Callee-saved (acceptable in other calling conventions, but say preserved under the AAPCS)

**Scratch register**:
A register a function may change without saving it. Under the AAPCS these are R0 to R3 and R12, and the argument and result registers are scratch.
_Avoid_: Temporary register (informal)

**Disassembly**:
The listing of machine code printed from an ELF file, where each line has an address, the raw bytes and the instruction they decode to. `arm-none-eabi-objdump -d` produces it.
_Avoid_: Decompilation (rebuilds C-like source from machine code, which the course does not do)

**INVSTATE**:
The fault raised when the core runs an instruction while the T bit in xPSR is clear, which happens after a branch to an address whose bit 0 is 0.
_Avoid_: Thumb fault (informal)

**Thumb state bit (T bit)**:
Bit 24 of xPSR, which must be set for the core to run Thumb code. An interworking branch sets or clears it from bit 0 of the target address.
_Avoid_: Thumb flag (it is a state bit, not a condition flag)

**STKALIGN**:
The bit in the Cortex-M3 Configuration Control Register that makes exception stack frames 8-byte aligned, so that the stack meets the AAPCS rule SP mod 8 = 0 at a public interface.
_Avoid_: Stack alignment bit (say STKALIGN, the register bit's name)

## Notes for the lead

- The glossary entries for **Stack frame**, **Full-descending stack**, **AAPCS**, **Endianness** and **ELF file** already exist and are used unchanged in lessons 0029 to 0033.
- The lessons link to the glossary anchors `#register-cpu`, `#stack`, `#full-descending-stack`, `#stack-frame`, `#main-stack-pointer-msp`, `#process-stack-pointer-psp`, `#program-status-register-xpsr`, `#interrupt`, `#elf-file` and `#aapcs`, which exist. The new terms above have no links yet.
