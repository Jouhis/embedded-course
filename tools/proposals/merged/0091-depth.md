# Proposals from the depth expansion (lessons 0091, lab05, 0092, 0093, 0094)

Glossary terms in the format of GLOSSARY.md. The lead merges them. Anchors are the term lowercased with non-alphanumerics turned into `-`.

## Glossary

**Stack overflow hook**:
The function `vApplicationStackOverflowHook(TaskHandle_t, char *)` that FreeRTOS calls when `configCHECK_FOR_STACK_OVERFLOW` finds a stack past its limit or with a corrupted bottom pattern. The course's version loops forever, so a debugger stops at the bug.
_Avoid_: Stack guard (a guard is an MPU region that faults on the first write, not a check at task switches)

**Tick hook**:
The function `vApplicationTickHook()` that FreeRTOS calls once per tick when `configUSE_TICK_HOOK` is 1. The course uses it to call `HAL_IncTick()`, so the HAL's timeouts keep counting while FreeRTOS owns SysTick.
_Avoid_: Tick interrupt (the tick is the periodic interrupt; the hook is code the kernel calls from it)

**Devicetree alias**:
A second name for a devicetree node, defined under `aliases` and read in C with `DT_ALIAS(name)`. The C code uses an alias so that moving the node changes only the devicetree.
_Avoid_: Label (a label is the name used in the devicetree source for `&label` references, not for C)

**Devicetree label**:
The short name written before a node, such as `user_button: button_0`, that other devicetree text refers to with an ampersand (`&user_button`).
_Avoid_: Alias (an alias is a separate name defined under `aliases`)

**Devicetree phandle**:
A reference from one node to another, written with an ampersand and a label, such as `&gpio0`. A `gpios` property is a list of phandles, each followed by its cells.
_Avoid_: Pointer (in devicetree text, a phandle is a reference the build resolves, not a memory address)

**Board defconfig**:
The file in a board's folder that sets the Kconfig symbols that board needs. An application's `prj.conf` overrides it for the symbols both set.
_Avoid_: Default config (a Kconfig default is the value in a symbol's declaration, not a file)

**prj.conf**:
The application's Kconfig fragment, with `CONFIG_` assignments that override the board defconfig for this project only.
_Avoid_: Config file (too general; say prj.conf)

**gnuarmemb**:
The Zephyr toolchain variant that uses an Arm GNU Embedded toolchain already on the machine. Selected with `ZEPHYR_TOOLCHAIN_VARIANT=gnuarmemb` and `GNUARMEMB_TOOLCHAIN_PATH`.
_Avoid_: Zephyr SDK (the SDK bundles its own toolchains; gnuarmemb does not)

**Project filter**:
The `manifest.project-filter` setting in `.west/config`, a list of `-` and `+` patterns read left to right that decides which projects of the west manifest are fetched.
_Avoid_: Manifest (the manifest lists all projects; the filter selects some)

## Resources

No new resources. Lesson 0091 cites the FreeRTOS kernel source by file and line (`tasks.c`, `include/stack_macros.h`, `include/task.h`), and the Liu and Layland DOI is already listed in RESOURCES.md. The ACM page refused access (HTTP 403) when lesson 0091 was checked, so that entry should note the access problem.
