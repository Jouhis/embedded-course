
/* Faults: this demo prints the Cortex-M3 fault status registers and the MPU
 * presence flag from the device header. The STM32F103 header sets __MPU_PRESENT to 0.
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
    print_line("SCB->CFSR (fault status):  ", SCB->CFSR);
    print_line("SCB->HFSR (hard fault):     ", SCB->HFSR);
    print_line("SCB->VTOR (vector table):   ", SCB->VTOR);
    print_line("__MPU_PRESENT (header):     ", __MPU_PRESENT);   /* 0 on STM32F103 */
    while (1) { }
}
