/* Lab 2 solution: trace one instruction.
 * Same program as the starter, with the answers to the TODO(learner) questions
 * written as comments next to the lines they describe.
 *
 * LED: PC13 (active low). Serial: USART1 TX on PA9, 115200 baud. Clock: HSI 8 MHz.
 */
#include <stdint.h>
#include "stm32f1xx.h"

static void delay_ms(uint32_t ms) {
    /* SysTick counts down from LOAD to 0 once per millisecond. */
    SysTick->LOAD = (SystemCoreClock / 1000U) - 1U;
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk;
    while (ms--) {
        while ((SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk) == 0) { }
    }
    SysTick->CTRL = 0;
}

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    /* PA9: alternate-function push-pull output, 50 MHz (CNF=10, MODE=11) */
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;              /* Clock the GPIOC peripheral */
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << 20)) | (0x2U << 20); /* PC13: push-pull output, 2 MHz */

    while (1) {
        /* Answers:
         * 1. GPIO_BSRR_BR13 expands to (0x1UL << 29), which is 0x20000000:
         *    bit 29 of BSRR, the reset bit for pin 13 (bits 16-31 reset, 0-15 set).
         * 2. GPIOC_BASE = APB2PERIPH_BASE + 0x1000 = 0x40011000. BSRR is the
         *    5th word of GPIO_TypeDef, offset 0x10, so the address is 0x40011010.
         * 3. GPIOC is on APB2: APB2PERIPH_BASE = PERIPH_BASE + 0x10000 = 0x40010000.
         *    AHBPERIPH_BASE (0x40020000) holds RCC and FLASH, not GPIOC.
         * 4. The Blue Pill's PC13 LED is active low, as the template comment says.
         *    Check it against the board schematic before you rely on it.
         */
        GPIOC->BSRR = GPIO_BSRR_BR13;   /* Drive PC13 low: LED on */
        uart_puts("LED on\r\n");
        delay_ms(500);
        GPIOC->BSRR = GPIO_BSRR_BS13;   /* Drive PC13 high: LED off */
        uart_puts("LED off\r\n");
        delay_ms(500);
    }
}
