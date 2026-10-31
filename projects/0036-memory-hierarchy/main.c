
/* Where do the bytes live? Print one object from each memory region.
 * The const table is placed in flash, the initialised global is in SRAM (copied from
 * flash at startup), the zeroed global is in SRAM, and the local is on the stack in SRAM.
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

static const uint32_t flash_table[4] = { 1U, 2U, 3U, 4U };  /* .rodata: stays in flash */
static uint32_t ram_counter = 7U;                            /* .data: copied to SRAM at startup */
static uint32_t ram_zeroed;                                  /* .bss: cleared to 0 in SRAM */

static void show_regions(void) {
    uint32_t stack_local = 9U;   /* lives on the stack, in SRAM */
    print_line("const table (flash):  ", (uint32_t)(uintptr_t)flash_table);
    print_line("global counter (RAM): ", (uint32_t)(uintptr_t)&ram_counter);
    print_line("zeroed global  (RAM): ", (uint32_t)(uintptr_t)&ram_zeroed);
    print_line("stack local    (RAM): ", (uint32_t)(uintptr_t)&stack_local);
    print_line("main() code   (flash):", (uint32_t)(uintptr_t)show_regions);
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    show_regions();
    while (1) { }
}
