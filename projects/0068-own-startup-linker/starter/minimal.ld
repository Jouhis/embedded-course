/* minimal.ld: the smallest linker script that can start an STM32F103C8 (Blue Pill).
 * It places code and constants in flash, and variables in RAM, and exports the symbols
 * that startup.c uses to copy .data and clear .bss. */
ENTRY(Reset_Handler)

MEMORY
{
  FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 64K   /* code and constants */
  RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 20K   /* variables and stack */
}

/* The initial stack pointer is the top of RAM. The stack grows down from here. */
_estack = ORIGIN(RAM) + LENGTH(RAM);

SECTIONS
{
  /* The vector table must be the first thing in flash, at 0x08000000. */
  .isr_vector :
  {
    . = ALIGN(4);
    KEEP(*(.isr_vector))
  } > FLASH

  .text :
  {
    . = ALIGN(4);
    *(.text*)
    *(.rodata*)                  /* constants also stay in flash */
    . = ALIGN(4);
  } > FLASH

  /* Initialised globals: the values live in flash (AT> FLASH) and the
   * startup code copies them to RAM at _sdata. */
  _sidata = LOADADDR(.data);
  .data :
  {
    . = ALIGN(4);
    _sdata = .;
    *(.data*)
    . = ALIGN(4);
    _edata = .;
  } > RAM AT> FLASH

  /* TODO(learner) 3: add the .bss section. It goes in RAM, has no bytes in flash, and
   * must export _sbss and _ebss around its contents, as the solution's minimal.ld does. */
}
