/* app.c: the application image (lesson 104). It has its own header and vector table, placed by
 * boot.ld in the application slot at 0x08004000. The bootloader validates the header and then
 * jumps to app_reset. This file has no global variables, so it does not need the .data copy. */
#include <stdint.h>
#include "app_image.h"

/* Every function here is placed in the application's code section, not the bootloader's. */
#define APP_CODE __attribute__((section(".app_text"), used))

typedef void (*vector_fn)(void);

/* Symbols from boot.ld. _estack is the top of RAM, shared by the bootloader and the application. */
extern uint32_t _estack;
extern const uint8_t _app_image_end[];

static void app_main(void);

APP_CODE static void app_fault(void) {
    for (;;) {
        /* A real application would log the fault here. The loop keeps it visible in a debugger. */
    }
}

APP_CODE static void app_reset(void) {
    app_main();
    for (;;) {
    }
}

APP_CODE static void app_main(void) {
    uart_puts("BOOT -> APP OK\r\n");
    for (;;) {
    }
}

/* The header. The bootloader reads image_end, and the bootloader checks the magic first. */
__attribute__((section(".app_header"), used))
const app_header_t app_header = {
    APP_IMAGE_MAGIC,
    APP_VERSION,
    (uint32_t)(uintptr_t)_app_image_end,
    APP_VECTOR_OFFSET,
    {0u, 0u, 0u, 0u},
};

/* The application's vector table. Word 0 is the initial stack pointer and word 1 the reset
 * handler; the rest are the exception handlers (lesson 42). Unused entries go to app_fault. */
__attribute__((section(".app_vectors"), used))
const vector_fn app_vectors[16] = {
    (vector_fn)(uintptr_t)&_estack,
    app_reset,
    app_fault, app_fault, app_fault, app_fault, app_fault, app_fault,
    app_fault, app_fault, app_fault, app_fault, app_fault, app_fault,
    app_fault, app_fault,
};
