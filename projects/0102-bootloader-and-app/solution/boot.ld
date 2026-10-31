/* boot.ld: one linker script for a bootloader and an application slot in the SAME image (lesson 102).
 *
 *   BOOT  0x08000000  16 KiB  the bootloader: vector table, code, constants, .data (initial values)
 *   APP   0x08004000  48 KiB  the application slot: header, vector table (+0x100), code
 *   RAM   0x20000000  20 KiB  shared by both: .data, .bss, and the stack at the top
 *
 * Each output section is placed in its region, so the linker reports an error if the bootloader
 * outgrows its 16 KiB. The ASSERTs check the header and vector positions that the bootloader relies on. */
ENTRY(Reset_Handler)

_estack = ORIGIN(RAM) + LENGTH(RAM);     /* the stack starts at the top of RAM */

MEMORY
{
  BOOT (rx)  : ORIGIN = 0x08000000, LENGTH = 16K
  APP  (rx)  : ORIGIN = 0x08004000, LENGTH = 48K
  RAM  (rwx) : ORIGIN = 0x20000000, LENGTH = 20K
}

SECTIONS
{
  /* ----- bootloader (BOOT) ----- */
  .isr_vector : { KEEP(*(.isr_vector)) } > BOOT

  .text :
  {
    *(.text*) *(.glue_7) *(.glue_7t) *(.eh_frame)
    KEEP(*(.init)) KEEP(*(.fini))
  } > BOOT

  .rodata : { *(.rodata*) } > BOOT

  .ARM.extab : { *(.ARM.extab* .gnu.linkonce.armextab.*) } > BOOT
  .ARM : { __exidx_start = .; *(.ARM.exidx*) __exidx_end = .; } > BOOT

  .preinit_array :
  {
    PROVIDE_HIDDEN(__preinit_array_start = .);
    KEEP(*(.preinit_array*))
    PROVIDE_HIDDEN(__preinit_array_end = .);
  } > BOOT
  .init_array :
  {
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*))) KEEP(*(.init_array*))
    PROVIDE_HIDDEN(__init_array_end = .);
  } > BOOT
  .fini_array :
  {
    PROVIDE_HIDDEN(__fini_array_start = .);
    KEEP(*(SORT(.fini_array.*))) KEEP(*(.fini_array*))
    PROVIDE_HIDDEN(__fini_array_end = .);
  } > BOOT

  /* .data is stored in BOOT (the load address) and copied to RAM by the startup code. */
  _sidata = LOADADDR(.data);
  .data :
  {
    . = ALIGN(4);
    _sdata = .;
    *(.data*)
    . = ALIGN(4);
    _edata = .;
  } > RAM AT> BOOT

  .bss :
  {
    . = ALIGN(4);
    _sbss = .;
    __bss_start__ = _sbss;
    *(.bss*) *(COMMON)
    . = ALIGN(4);
    _ebss = .;
    __bss_end__ = _ebss;
  } > RAM

  /* ----- application slot (APP) ----- */
  .app_header : { KEEP(*(.app_header)) } > APP

  .app_vectors ALIGN(256) : { KEEP(*(.app_vectors)) } > APP

  .app_text : { *(.app_text*) } > APP

  .app_end : { _app_image_end = .; } > APP

  ASSERT(ADDR(.app_header) == ORIGIN(APP), "the image header must be the first thing in the slot")
  ASSERT(ADDR(.app_vectors) == ORIGIN(APP) + 0x100, "the vector table must be at slot + 0x100")
}
