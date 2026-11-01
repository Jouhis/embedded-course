/* app_vectors.c: the application image's header, vector table and reset handler (lesson 118).
 * The bootloader jumps to app_reset through this table, after it has checked the header. */
#include <stdint.h>
#include "app_image.h"

typedef void (*vector_fn)(void);

/* Symbols from boot/boot.ld: the top of RAM, and the end of the application image. */
extern uint32_t _estack;
extern const uint8_t _app_image_end[];

/* Defined by the FreeRTOS port (its names are mapped in FreeRTOSConfig.h) and by the USART driver. */
extern void SVC_Handler(void);
extern void PendSV_Handler(void);
extern void SysTick_Handler(void);
extern void USART1_IRQHandler(void);

/* Any exception the application does not expect stops here, so a debugger shows where. */
static void app_fault(void) {
    for (;;) {
    }
}

/* The application's reset. The bootloader's startup code already copied .data and cleared .bss
 * for the shared RAM (one RAM, one copy), so this goes straight to the application. */
static void app_reset(void) {
    app_main();
    for (;;) {
    }
}

/* The header. The bootloader reads image_end and checks the magic first. */
__attribute__((section(".app_header"), used))
const app_header_t app_header = {
    APP_IMAGE_MAGIC,
    APP_VERSION,
    (uint32_t)(uintptr_t)_app_image_end,
    APP_VECTOR_OFFSET,
    {0u, 0u, 0u, 0u},
};

/* The vector table: word 0 is the initial stack pointer, word 1 the reset handler, then the
 * exceptions (16 entries) and the device interrupts (IRQn + 16). Every entry defaults to app_fault. */
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Woverride-init"
__attribute__((section(".app_vectors"), used))
const vector_fn app_vectors[APP_VECTOR_COUNT] = {
    [0 ... APP_VECTOR_COUNT - 1] = app_fault,
    [0]  = (vector_fn)(uintptr_t)&_estack,
    [1]  = app_reset,
    [11] = SVC_Handler,                       /* SVCall */
    [14] = PendSV_Handler,
    [15] = SysTick_Handler,
    [16 + APP_IRQ_USART1] = USART1_IRQHandler,
};
#pragma GCC diagnostic pop
