
/* Reference manual practice: compute register addresses from a base address and
 * an offset, then compare them with the register map in RM0008. The CMSIS structs
 * give you the offsets; RM0008 gives you the reset values.
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
    print_line("GPIOC base:           ", GPIOC_BASE);
    print_line("GPIOC->CRH address:   ", (uint32_t)(uintptr_t)&GPIOC->CRH);
    print_line("GPIOC->BSRR address:  ", (uint32_t)(uintptr_t)&GPIOC->BSRR);
    print_line("RCC->APB2ENR address: ", (uint32_t)(uintptr_t)&RCC->APB2ENR);
    print_line("USART1->DR address:   ", (uint32_t)(uintptr_t)&USART1->DR);
    while (1) { }
}
