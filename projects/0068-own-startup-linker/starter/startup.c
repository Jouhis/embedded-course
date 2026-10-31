/* Our own startup code for the STM32F103 (replaces startup_stm32f103xb.s).
 *
 * The core reads two words from the start of flash on reset: the initial stack
 * pointer (word 0) and the reset handler address (word 1). The rest of the table
 * is one word per exception, in the order that PM0056 lists them. */
#include <stdint.h>

/* Symbols defined by minimal.ld. We use their addresses, never their values. */
extern uint32_t _estack;                    /* top of RAM: the initial stack pointer */
extern uint32_t _sidata, _sdata, _edata;    /* .data: load address in flash, run address in RAM */
extern uint32_t _sbss, _ebss;               /* .bss: zero-initialised RAM */

extern int main(void);
extern void SystemInit(void);               /* CMSIS: sets the clock (system_stm32f1xx.c) */

typedef void (*isr_fn)(void);

void Reset_Handler(void);

static void Default_Handler(void) {
    while (1) { }                           /* an unexpected exception stops here, visibly */
}

/* Every handler we do not write points at Default_Handler. A weak alias lets a
 * project define its own SysTick_Handler later without editing this file. */
void NMI_Handler(void)         __attribute__((weak, alias("Default_Handler")));
void HardFault_Handler(void)   __attribute__((weak, alias("Default_Handler")));
void MemManage_Handler(void)   __attribute__((weak, alias("Default_Handler")));
void BusFault_Handler(void)    __attribute__((weak, alias("Default_Handler")));
void UsageFault_Handler(void)  __attribute__((weak, alias("Default_Handler")));
void SVC_Handler(void)         __attribute__((weak, alias("Default_Handler")));
void DebugMon_Handler(void)    __attribute__((weak, alias("Default_Handler")));
void PendSV_Handler(void)      __attribute__((weak, alias("Default_Handler")));
void SysTick_Handler(void)     __attribute__((weak, alias("Default_Handler")));

/* The vector table. "used" stops the linker discarding it, and the section name
 * puts it first in flash, where minimal.ld expects it (KEEP(*(.isr_vector))). */
__attribute__((used, section(".isr_vector")))
const isr_fn g_vectors[16] = {
    (isr_fn)(uintptr_t)&_estack,   /* 0: initial stack pointer (a data address, not code) */
    Reset_Handler,                 /* 1: first code to run after reset */
    NMI_Handler,                   /* 2 */
    HardFault_Handler,             /* 3 */
    MemManage_Handler,             /* 4 */
    BusFault_Handler,              /* 5 */
    UsageFault_Handler,            /* 6 */
    0, 0, 0, 0,                    /* 7 to 10: reserved, must be zero */
    SVC_Handler,                   /* 11 */
    DebugMon_Handler,              /* 12 */
    0,                             /* 13: reserved */
    PendSV_Handler,                /* 14 */
    SysTick_Handler                /* 15 */
    /* Entries 16 and up are external interrupts (IRQ0 onwards). This minimal table
     * stops at 15, which is safe only while no external interrupt is enabled. */
};

void Reset_Handler(void) {
    /* 1. Clock first, so the copy and clear loops run at the final clock. */
    SystemInit();

    /* TODO(learner) 1: copy .data from flash to RAM. The source starts at _sidata and the
     * destination runs from _sdata to _edata (the symbols are in minimal.ld). Copy one
     * 32-bit word per loop step. The tempting mistake is to copy from _sdata to _sidata. */

    /* TODO(learner) 2: zero .bss from _sbss to _ebss. You also have to write the .bss
     * section and these two symbols in minimal.ld; the starter script does not have it yet. */

    /* 4. Hand over to the program. */
    main();
    while (1) { }                           /* main() should never return on firmware */
}
