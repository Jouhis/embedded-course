// EXPECT: BOOT -> APP OK
/* Bootloader for the STM32 Blue Pill (lesson 102). It sits at 0x08000000, validates the
 * application image header at 0x08004000, and jumps to the application if the image is good.
 *
 * Uses CMSIS register definitions only (no HAL). USART1 TX on PA9 at 115200 baud, the same
 * wiring as lesson 67. The application (app.c) is in the same image and prints the last line. */
#include <stdint.h>
#include "stm32f1xx.h"
#include "app_image.h"

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    /* PA9: alternate-function push-pull output, 50 MHz (CNF=10, MODE=11) */
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

/* Decides whether the slot holds a runnable image. Each check removes one way for a bad
 * image to crash the boot: a wrong magic (not an image at all), a truncated or overlong
 * image, a stack pointer outside RAM, and a reset handler outside the image.
 *
 * What it does not check: a CRC or a signature. The header has room for them (reserved[]),
 * but computing a CRC needs the image's final bytes, which a linker script alone cannot give
 * us. A signing tool does that step in real projects (lesson 103). */
static int slot_is_valid(const app_header_t *h) {
    if (h->magic != APP_IMAGE_MAGIC) {
        return 0;
    }
    if (h->vector_offset != APP_VECTOR_OFFSET) {
        return 0;
    }
    uint32_t first = APP_BASE_ADDR + APP_VECTOR_OFFSET;
    if (h->image_end <= first || h->image_end > APP_BASE_ADDR + APP_SLOT_SIZE) {
        return 0;
    }
    const uint32_t *vectors = (const uint32_t *)(uintptr_t)first;
    uint32_t sp = vectors[0];
    uint32_t reset = vectors[1];
    /* The initial stack pointer must point into SRAM. Its top is one past the last byte. */
    if (sp <= RAM_BASE_ADDR || sp > RAM_BASE_ADDR + RAM_SIZE) {
        return 0;
    }
    /* A Cortex-M reset handler address always has bit 0 set (Thumb state). */
    if ((reset & 1u) == 0u) {
        return 0;
    }
    /* The reset handler must lie inside the image, not in the bootloader or in empty flash. */
    if (reset < APP_BASE_ADDR || reset >= h->image_end) {
        return 0;
    }
    return 1;
}

/* Hands over to the application. The application's own vector table becomes the active one,
 * then the stack pointer and the reset handler are taken from it. Once we branch, the
 * bootloader's code is no longer running; the application owns the CPU. */
static void jump_to_app(void) {
    const uint32_t *vectors = (const uint32_t *)(uintptr_t)(APP_BASE_ADDR + APP_VECTOR_OFFSET);
    uint32_t sp = vectors[0];
    uint32_t reset = vectors[1];

    __disable_irq();                                  /* no bootloader interrupt may run mid-hand-over */
    SCB->VTOR = APP_BASE_ADDR + APP_VECTOR_OFFSET;    /* exceptions now use the application's table */
    __set_MSP(sp);                                    /* the application's stack starts at its own top */
    ((void (*)(void))(uintptr_t)reset)();             /* branch to the reset handler; never returns */
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    uart_puts("BOOT: checking application slot\r\n");

    const app_header_t *header = (const app_header_t *)(uintptr_t)APP_BASE_ADDR;
    if (slot_is_valid(header)) {
        uart_puts("BOOT: image valid, jumping\r\n");
        jump_to_app();
    }

    uart_puts("BOOT: no valid image, staying in the bootloader\r\n");
    while (1) {
    }
}
