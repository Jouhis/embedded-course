# Proposals from the depth expansion of lessons 0107 to 0109

For the lead to merge into `GLOSSARY.md` and `RESOURCES.md`. Formats follow those files.

## Glossary terms (add to the groups shown)

### Embedded Linux (after "Application processor")
**Kernel**:
The part of an operating system that runs with full hardware access. It schedules processes, handles interrupts, manages memory and drives devices through drivers.
_Avoid_: Core (the processor core is a different thing)

**Root filesystem**:
The file system that the kernel mounts at boot, holding the programs, libraries and configuration that user space runs from.
_Avoid_: Rootfs (informal, acceptable in build tool output only)

**MMU (memory management unit)**:
Hardware on an application processor that translates each virtual address a program uses into a physical address, using tables that the kernel maintains.
_Avoid_: MPU (the Cortex-M unit that checks accesses against regions without translating them)

**Virtual memory**:
The mechanism in which each process sees its own address space, translated to physical memory by the MMU, so processes cannot read or overwrite one another's memory by accident.
_Avoid_: Virtual address (a single address; virtual memory is the whole system)

### Functional safety
Note: the existing entries for SIL, ASIL, HARA, V-model, Safety case, Safety mechanism, Plausibility check, March test, Stuck-at fault and Safe state already match lesson 0109. No change.

## Resources (add or correct)

### Correction: the functional safety white paper
The existing entry cited "NXP, Functional safety white paper" at `https://nxp.com/docs/en/white-paper/FCTNLSFTYWP.pdf`. The document itself is titled *Addressing the Challenges of Functional Safety in the Automotive and Industrial Markets*, a Freescale SafeAssure white paper, document FCTNLSFTYWP, revision 1, dated 2011 and 2013. Its failure-measures table gives SIL 4 at 10^-9 to below 10^-8 per hour and ASIL D at below 10^-8 per hour, and states there is no direct correlation between the scales. Lesson 0109 now cites it by that title.

### Verified sources cited by the new text
- Microchip SRAM diagnostic, DIAG_SRAM_MarchCMinus: `https://onlinedocs.microchip.com/oxy/GUID-CA566412-3E3C-467B-98AF-9F1D156615B7-en-US-3/GUID-4236B5E8-131B-4198-BED7-A31CE5426ACD.html`. States that March C- detects stuck-at, addressing, transition and coupling faults, and runs in six steps.
- Klipper Code Overview: `https://www.klipper3d.org/Code_Overview.html`. Says queue_step commands are normally queued at least 100 ms before their first step, and that the MCU fires steps from a hardware timer interrupt.
- Buildroot: `https://buildroot.org/`. Quoted as "a simple, efficient and easy-to-use tool to generate embedded Linux systems through cross-compilation".
- Embedded Rust Book, Static Guarantees: `https://docs.rust-embedded.org/book/static-guarantees/index.html`. Says trying to change the output state of a pin in floating input mode "would raise a compile error".
