// EXPECT: g_copied at main(): 0x0000CAFE

/* Startup code: g_copied starts at 0xCAFE in flash and is copied to RAM by
 * Reset_Handler; g_cleared starts at zero and is cleared in .bss. Both values are
 * already correct when main() runs. Set a breakpoint on Reset_Handler in GDB (lesson 42).
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

extern uint32_t _sdata;    /* start of .data in RAM (linker symbol) */
extern uint32_t _edata;    /* end of .data in RAM */
extern uint32_t _sidata;   /* where .data is stored in flash */
extern uint32_t _sbss;     /* start of .bss */
extern uint32_t _ebss;     /* end of .bss */

static volatile uint32_t g_copied = 0xCAFEU;   /* .data: value stored in flash, copied at startup */
static volatile uint32_t g_cleared;            /* .bss: zeroed at startup */

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    print_line("g_copied at main(): ", g_copied);
    print_line("g_cleared at main(): ", g_cleared);
    print_line("_sdata (RAM):  ", (uint32_t)(uintptr_t)&_sdata);
    print_line("_edata (RAM):  ", (uint32_t)(uintptr_t)&_edata);
    print_line("_sidata (flash):", (uint32_t)(uintptr_t)&_sidata);
    print_line("_sbss: ", (uint32_t)(uintptr_t)&_sbss);
    print_line("_ebss: ", (uint32_t)(uintptr_t)&_ebss);
    while (1) { }
}
