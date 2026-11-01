# Proposals from the depth pass on lessons 0047 to 0050

Written by the depth-pass author for the lead to merge. Nothing in GLOSSARY.md or RESOURCES.md was edited.

## Glossary proposals (GLOSSARY.md format)

### Embedded C (group: Embedded C)

**Alignment**:
The rule that a value of a given size starts at an address that is a multiple of that size, so a 32-bit value sits at a multiple of 4. An aligned access can be done in one bus transfer, and an unaligned one may be slower or refused by the core.
_Avoid_: Byte boundary (informal, and it misses the size rule)

**Padding**:
Unused bytes that the compiler inserts between struct members so that each member meets its alignment. A packed struct removes it.
_Avoid_: Gap (informal)

**Union**:
A type whose members all start at the same address, so its size is that of its largest member. Reading a member other than the one last written is subtle in C.
_Avoid_: Variant (a different concept in other languages)

**Byte**:
Eight bits, the unit that the memory system reads and writes. Its bits are numbered 0 (least significant) to 7.
_Avoid_: Octet (acceptable in protocol specifications)

**Null pointer**:
A pointer value that points to nothing, written `NULL`. A static object of pointer type starts as null, and calling through a null function pointer is undefined behaviour.
_Avoid_: Zero pointer (informal)

**Indirect call**:
A call whose target address is read from a variable at run time, such as a function pointer, rather than named in the code. On Cortex-M the core loads the address into a register and branches through it.
_Avoid_: Function pointer call (the pointer is the mechanism; the call is the act)

**Translation unit**:
One source file after the preprocessor has pasted in its includes and expanded its macros. The compiler compiles each translation unit separately.
_Avoid_: Compilation unit (acceptable in conversation)

### Embedded C (group: Embedded C), preprocessor terms

**Preprocessor**:
The first phase of compilation. It performs the `#include`, `#define` and `#if` directives on the text of a source file, so the compiler sees only the expanded C text.
_Avoid_: Macro processor (too narrow: it also does file inclusion and conditional compilation)

**Macro**:
A name defined with `#define` that the preprocessor replaces with text. An object-like macro has no arguments, and a function-like macro takes arguments that are substituted as text.
_Avoid_: Inline function (a macro is text substitution and does not evaluate its arguments first)

**Token pasting**:
The `##` operator in a macro, which joins two tokens into one identifier, as in `EV_##name`.
_Avoid_: Concatenation (informal)

**Stringizing**:
The `#` operator in a function-like macro, which turns its argument into a string literal, as in `#name`.
_Avoid_: Stringify (informal verb)

## Resource proposals (RESOURCES.md format)

None. Lessons 0047 to 0050 cite sources already in RESOURCES.md (cppreference bit-field, volatile, macro replacement and storage duration pages; the GCC common attributes page; the CMake target_compile_definitions page; the PM0056 and RM0008 manuals).

## Notes for the lead

- The RM0008 PDF could not be downloaded in this environment (the st.com connection was reset), so lesson 0047 cites RM0008 by its section title only, with no section numbers. Its register facts were checked against `third_party/cmsis-device-f1/Include/stm32f103xb.h` instead. The meaning of the CNF and MODE values in CRH (the solution writes 0x2 for PC13) still needs the RM0008 port configuration table to be checked.
- The PM0056 section numbers were not checked, so lesson 0049 cites PM0056 without section numbers.
