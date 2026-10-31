// EXPECT: DRYER RTOS OK
/* bootloader.c: the bootloader of the dryer (lesson 113, after lesson 102). It runs first after
 * reset, validates the application image header at 0x08004000, and jumps to the application.
 *
 * It uses CMSIS registers only (no HAL and no FreeRTOS), so it stays small. The serial line is
 * initialised here for its own messages; the application re-initialises the same port later.
 *
 * Note on RAM: the startup code copies .data and clears .bss for the whole image before main()
 * runs. Both the bootloader and the application use that RAM, so the application needs no copy
 * of its own: the jump keeps RAM as it is. */
#include <stdint.h>
#include "stm32f1xx.h"
#include "app_image.h"

#define BOOT_BAUD  115200U

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);      /* PA9: AF push-pull, 50 MHz */
    USART1->BRR = SystemCoreClock / BOOT_BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0U) { }
        USART1->DR = (uint8_t)*s++;
    }
    while ((USART1->SR & USART_SR_TC) == 0U) { }
}

/* Each check removes one way for a bad image to crash the boot: a wrong magic (not an image),
 * a truncated or overlong image, a stack pointer outside RAM, and a reset handler outside the image.
 * What it does not check: a CRC or a signature (the header has room; lesson 103 covers signing). */
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
    if (sp <= RAM_BASE_ADDR || sp > RAM_BASE_ADDR + RAM_SIZE) {
        return 0;
    }
    if ((reset & 1u) == 0u) {                  /* Thumb state: bit 0 of a Cortex-M reset handler is set */
        return 0;
    }
    if (reset < APP_BASE_ADDR || reset >= h->image_end) {
        return 0;
    }
    return 1;
}

/* Hand over: the application's vector table becomes the active one, then the stack pointer and
 * the reset handler are taken from it. The bootloader's code does not run again after this. */
static void jump_to_app(void) {
    const uint32_t *vectors = (const uint32_t *)(uintptr_t)(APP_BASE_ADDR + APP_VECTOR_OFFSET);
    uint32_t sp = vectors[0];
    uint32_t reset = vectors[1];

    __disable_irq();                                  /* no interrupt may run in the middle of the hand-over */
    SCB->VTOR = APP_BASE_ADDR + APP_VECTOR_OFFSET;    /* exceptions now use the application's table */
    __set_MSP(sp);
    ((void (*)(void))(uintptr_t)reset)();             /* never returns */
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
