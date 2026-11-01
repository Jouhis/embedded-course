/* boot.ld: one linker script for the bootloader and the application slot in the SAME image (lessons 104, 117).
 *
 *   BOOT  0x08000000  16 KiB  the bootloader's code (startup, system init, bootloader.c), constants, .data's initial values
 *   APP   0x08004000  48 KiB  the header, the vector table (+0x200), and everything else: FreeRTOS, HAL, drivers, app
 *   RAM   0x20000000  20 KiB  .data, .bss and the heap and stacks; shared by both
 *
 * Placement is by input file: the bootloader objects are matched by name and go to BOOT; every other
 * input (the catch-all *(.text*) in APP) goes to the application slot. If the application outgrows 48 KiB,
 * the linker reports the overflow of APP. The ASSERTs check the layout that the bootloader relies on. */
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

  .boot_text :
  {
    *startup_stm32*(.text*)
    *system_stm32*(.text*)
    *bootloader*(.text*)
    *startup_stm32*(.rodata*)
    *bootloader*(.rodata*)
  } > BOOT

  /* .data is stored in BOOT (the load address) and copied to RAM by the startup code. Both images use it. */
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

  .app_vectors ALIGN(512) : { KEEP(*(.app_vectors)) } > APP

  .text :
  {
    *(.text*) *(.glue_7) *(.glue_7t) *(.eh_frame)
    KEEP(*(.init)) KEEP(*(.fini))
  } > APP

  .rodata : { *(.rodata*) } > APP

  .ARM.extab : { *(.ARM.extab* .gnu.linkonce.armextab.*) } > APP
  .ARM : { __exidx_start = .; *(.ARM.exidx*) __exidx_end = .; } > APP

  .preinit_array :
  {
    PROVIDE_HIDDEN(__preinit_array_start = .);
    KEEP(*(.preinit_array*))
    PROVIDE_HIDDEN(__preinit_array_end = .);
  } > APP
  .init_array :
  {
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*))) KEEP(*(.init_array*))
    PROVIDE_HIDDEN(__init_array_end = .);
  } > APP
  .fini_array :
  {
    PROVIDE_HIDDEN(__fini_array_start = .);
    KEEP(*(SORT(.fini_array.*))) KEEP(*(.fini_array*))
    PROVIDE_HIDDEN(__fini_array_end = .);
  } > APP

  .app_end : { _app_image_end = .; } > APP

  ASSERT(ADDR(.app_header) == ORIGIN(APP), "the image header must be the first thing in the slot")
  ASSERT(ADDR(.app_vectors) == ORIGIN(APP) + 0x200, "the vector table must be at slot + 0x200")
}
