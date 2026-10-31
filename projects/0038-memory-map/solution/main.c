/* Lesson 38 solution: the memory map and memory-mapped registers.
 * GPIOC->BSRR is a memory-mapped register at GPIOC base + offset. The struct
 * GPIOC->BSRR is the compiler's way of writing that address; the raw pointer below
 * does the same write with the address spelled out.
 *   GPIOC base      0x40011000  (APB2PERIPH_BASE 0x40010000 + 0x1000)
 *   BSRR offset     0x10        (5th word of GPIO_TypeDef)
 *   BSRR address    0x40011010
 * Writing BR13 (bit 29) resets PC13; the Blue Pill LED is active low, so the LED lights.
 */
#include <stdint.h>
#include "stm32f1xx.h"

/* UART1 on PA9 at 115200 baud, from the template. Output goes to the serial monitor. */
static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9 alternate push-pull, 50 MHz */
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

/* Print a 32-bit value as 0x%08X. Avoids printf so the output is small and predictable. */
static void print_hex(uint32_t v) {
    static const char digits[] = "0123456789ABCDEF";
    char buf[12] = "0x00000000";
    for (int i = 0; i < 8; i++) {
        buf[9 - i] = digits[(v >> (4 * i)) & 0xFU];
    }
    uart_puts(buf);
}

static void print_line(const char *label, uint32_t value) {
    uart_puts(label);
    print_hex(value);
    uart_puts("\r\n");
}

#define GPIOC_BSRR_ADDR  (0x40011000UL + 0x10UL)   /* GPIOC base + BSRR offset */

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << 20)) | (0x2U << 20);   /* PC13 push-pull output */

    volatile uint32_t *bsrr = (volatile uint32_t *)GPIOC_BSRR_ADDR;
    print_line("BSRR address: ", GPIOC_BSRR_ADDR);
    if ((uint32_t)(uintptr_t)&GPIOC->BSRR == GPIOC_BSRR_ADDR) {
        uart_puts("address check OK: &GPIOC->BSRR matches\r\n");
    }

    while (1) {
        *bsrr = GPIO_BSRR_BR13;     /* raw write: LED on */
        uart_puts("LED on\r\n");
        for (volatile uint32_t i = 0; i < 400000U; i++) { }
        *bsrr = GPIO_BSRR_BS13;     /* raw write: LED off */
        uart_puts("LED off\r\n");
        for (volatile uint32_t i = 0; i < 400000U; i++) { }
    }
}
