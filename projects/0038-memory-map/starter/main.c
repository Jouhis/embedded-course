/* Lesson 38 starter: the memory map and memory-mapped registers.
 * The LED blinks through the CMSIS struct GPIOC->BSRR. Your task: replace the one
 * BSRR write in the loop with a raw write through an address you compute yourself.
 * TODO(learner): the address of GPIOC->BSRR is GPIOC base + offset of BSRR.
 * Find GPIOC base (0x40011000 in the CMSIS header) and BSRR offset (0x10),
 * then write GPIO_BSRR_BR13 through a volatile pointer to that address.
 * Print the address you used, and check it against &GPIOC->BSRR.
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

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << 20)) | (0x2U << 20);   /* PC13 push-pull output */

    while (1) {
        GPIOC->BSRR = GPIO_BSRR_BR13;      /* TODO(learner): replace with a raw write */
        uart_puts("LED on\r\n");
        for (volatile uint32_t i = 0; i < 400000U; i++) { }
        GPIOC->BSRR = GPIO_BSRR_BS13;      /* TODO(learner): replace with a raw write */
        uart_puts("LED off\r\n");
        for (volatile uint32_t i = 0; i < 400000U; i++) { }
    }
}
