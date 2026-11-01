# Proposals from the depth pass on lessons 0034 to 0038

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

## Computer architecture

**Bus**:
A set of wires and a protocol that carry an address, data and a control signal from a master to a slave.
_Avoid_: Interconnect (acceptable in fabric descriptions, but this course says bus)

**Bus master**:
A device that starts a bus transfer, such as the core or a DMA controller.
_Avoid_: Initiator (the same idea in some specifications)

**Bus slave**:
A device that answers a bus transfer, such as a memory or a peripheral register block.
_Avoid_: Target (acceptable in some specifications)

**Arbitration**:
The rule a bus or crossbar uses to choose which of several masters goes first when they want the same slave.
_Avoid_: Priority (priority is one input to arbitration, not the mechanism)

**AHB-Lite**:
The high-speed bus protocol that the RP2040 datasheet uses for its main crossbar. The fabric adds no wait states to an AHB-Lite slave access.
_Avoid_: AHB (the course uses the name the RP2040 datasheet uses)

**Cache**:
A small, fast copy of recently used memory, placed between the core and a slower memory. A read either hits the copy or misses and goes to the slower memory.
_Avoid_: Buffer (a buffer holds data in transit, not data kept for reuse)

**Cache hit**:
A read whose data is already in the cache. The RP2040 XIP cache hit costs one cycle.
_Avoid_: Cache read (too vague)

**Cache miss**:
A read whose data is not in the cache, so it goes to the slower memory, and the cache keeps a copy.
_Avoid_: Cache fail (a miss is normal, not a failure)

**Set-associative cache**:
A cache in which each address maps to one set of entries, and the address may sit in any entry of that set. A two-way set-associative cache has two entries per set.
_Avoid_: Direct-mapped (the one-entry-per-set case)

**CONTROL register**:
The Cortex-M register that holds the privilege bit (bit 0, nPRIV) and the stack-select bit (bit 1, SPSEL) for thread mode. Only a handler can make thread mode privileged again.
_Avoid_: Mode register (the mode is not stored in CONTROL)

**SVC (supervisor call)**:
The instruction that raises the SVCall exception, which is number 11. Unprivileged code uses it to ask a privileged handler for a service.
_Avoid_: Syscall (acceptable in other texts, but this course says SVC)

**Bootrom**:
Read-only memory on the chip, fixed at manufacture, that runs first after reset. On the RP2040 it is 16 kB at 0x00000000.
_Avoid_: Bootloader (the bootrom loads a program, which may or may not be a bootloader)

**Section (linker)**:
A named group of bytes in the output file, such as .text, .rodata, .data or .bss, that the linker script places in a memory region.
_Avoid_: Segment (a loader term that can group several sections)

**Thumb bit**:
Bit 0 of a function address in C, set to mark Thumb code. The code itself starts at the even address, so a printed function address ends in 1.
_Avoid_: Odd address (the bit is a marker, not the location)

## Peripherals

**Striped SRAM**:
The first 256 kB of RP2040 SRAM, where consecutive words go to four different 64 kB banks, so parallel accesses rarely collide.
_Avoid_: Interleaved (a near synonym, but the datasheet says striped)

## Glossary corrections (for the lead to apply to existing entries)

- **Late arrival**: the current entry says the interrupt "arrives while the core is still stacking". The TRM (§5.7 and Table 5-4) says a late arrival can pre-empt while the first instruction of the earlier handler has not yet reached the execute stage. Suggested text: "A higher-priority exception that arrives before the first instruction of the earlier handler reaches the execute stage. It takes over, and the stacking is kept."
- **Atomic alias (SET, CLR, XOR)**: the RP2040 datasheet (section 2.1.2) says the SIO does not support bus-level aliases, and that some SIO registers, such as GPIO_OUT_SET, have their own set and clear offsets. Suggested addition: "The SIO has no bus-level aliases; use its own SET and CLR registers instead." Check the phrase "write-only register address" against section 2.1.2 before merging.
- **SIO (single-cycle IO)**: the RP2040 datasheet's Table 15 calls the region at 0xD0000000 "IOPORT Registers", and section 2.3.1 calls the block SIO. No change needed; the datasheet name can be noted as an alias.

## Resource proposals (RESOURCES.md format)

None. Every source used in lessons 0034 to 0038 is already in RESOURCES.md: the RP2040 datasheet, the Cortex-M3 TRM DDI0337G (Keil copy), the Pico SDK 2.3.1 headers, and the STM32F1 device header and HAL. RM0008 is listed, but it was not fetched in this pass (see the report), so the lessons leave out its bus-matrix chapter and its flash latency table.

## Notes for the lead (not for GLOSSARY.md; for NOTES.md)

- The Wokwi STM32 simulator does not keep the value of RCC->APB2ENR: after the code sets bits 2, 4 and 14, the readback prints 0x00000000 (run of projects/0037-bus-architecture, 2026-10-31). The expected hardware value is 0x00004014. Lesson 37 now says so.
- The comment in projects/0037-bus-architecture/main.c and the older lesson text say that a peripheral needs its clock enabled before use. That rule is not checked against RM0008 in this course yet. Project code was not edited.
