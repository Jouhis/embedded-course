// EXPECT: RCC base:   0x40021000
// (Not the APB2ENR line: Wokwi reads RCC_APB2ENR back as 0, see the lesson.)

/* The bus delivers each access to the right block. This demo prints the base
 * addresses that the bus fabric routes to (APB1, APB2 and AHB) and the GPIOC
 * clock-enable bit. Reading a peripheral needs its bus clock enabled first.
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
    print_line("APB1 base:  ", APB1PERIPH_BASE);
    print_line("APB2 base:  ", APB2PERIPH_BASE);
    print_line("AHB base:   ", AHBPERIPH_BASE);
    print_line("GPIOC base: ", GPIOC_BASE);   /* on APB2 */
    print_line("RCC base:   ", RCC_BASE);     /* on AHB */

    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;       /* enable the GPIOC bus clock */
    print_line("APB2ENR:    ", RCC->APB2ENR);
    while (1) { }
}
