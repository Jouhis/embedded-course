/* Bootloader for the STM32 Blue Pill (lesson 102). Your task: validate the application slot and
 * jump to the application. The application (app.c) is in the same image, at 0x08004000.
 *
 * Uses CMSIS register definitions only. USART1 TX on PA9 at 115200 baud (the lesson 67 wiring). */
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

/* TODO(learner): return 1 only if the slot holds a runnable image. Check, in this order:
 *   1. h->magic equals APP_IMAGE_MAGIC.
 *   2. h->vector_offset equals APP_VECTOR_OFFSET.
 *   3. h->image_end is after the vector table and no further than APP_BASE_ADDR + APP_SLOT_SIZE.
 *   4. The initial stack pointer (word 0 of the vector table) is in SRAM: greater than
 *      RAM_BASE_ADDR and at most RAM_BASE_ADDR + RAM_SIZE.
 *   5. The reset handler (word 1) has bit 0 set, and lies between APP_BASE_ADDR and h->image_end.
 * The vector table is at APP_BASE_ADDR + APP_VECTOR_OFFSET. */
static int slot_is_valid(const app_header_t *h) {
    (void)h;
    return 0;
}

/* TODO(learner): hand over to the application. Read the stack pointer (word 0) and the reset
 * handler (word 1) from the application's vector table. Then, in this order:
 *   __disable_irq();
 *   SCB->VTOR = the vector table address;
 *   __set_MSP(the stack pointer);
 *   call the reset handler through a function pointer, cast from uintptr_t. It never returns. */
static void jump_to_app(void) {
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
