/* Checks that our own startup did the two jobs that C needs before main().
 * Serial: USART1 TX on PA9, 115200 baud. Clock: 8 MHz internal oscillator (HSI). */
#include <stdint.h>
#include "stm32f1xx.h"

#define MAGIC_INITIAL  0xCAFEF00DU

/* Initialised global: its value is stored in flash and must be copied to RAM. */
volatile uint32_t g_initialised = MAGIC_INITIAL;

/* Zero-initialised global: it lives in .bss and must be cleared before main().
 * Caveat: the simulator starts RAM at zero, so this check passes even without the
 * clear loop. On real hardware RAM holds old values after a reset, and the check is meaningful. */
volatile uint32_t g_zeroed;

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull, 50 MHz */
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0U) { }
        USART1->DR = (uint8_t)*s++;
    }
}

static void uart_hex32(uint32_t v) {
    static const char digits[] = "0123456789ABCDEF";
    uart_puts("0x");
    for (int shift = 28; shift >= 0; shift -= 4) {
        char c[2] = { digits[(v >> shift) & 0xFU], 0 };
        uart_puts(c);
    }
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    uart_puts("g_initialised = ");
    uart_hex32(g_initialised);
    uart_puts(", g_zeroed = ");
    uart_hex32(g_zeroed);
    uart_puts("\r\n");

    int ok = (g_initialised == MAGIC_INITIAL) && (g_zeroed == 0U);
    uart_puts(ok ? "OWN STARTUP OK\r\n" : "OWN STARTUP FAIL\r\n"); // EXPECT: OWN STARTUP OK

    while (1) { }
}
