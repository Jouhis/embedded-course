/* Bare-metal blink for the STM32 Blue Pill using only CMSIS register definitions.
 * LED: PC13 (active low). Serial: USART1 TX on PA9, 115200 baud.
 * Clock: the default 8 MHz internal oscillator (HSI).
 *
 * Lesson 82 (CI): the half-period comes from led_half_period_ms(), which the host
 * unit tests in host-tests/ check on the PC. The simulation test looks for the line below.
 */
// EXPECT: LED on
#include <stdint.h>
#include "stm32f1xx.h"
#include "led_pattern.h"

#define LED_PERIOD_MS  1000U   /* one full on/off cycle */

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

    const uint32_t half = led_half_period_ms(LED_PERIOD_MS);

    while (1) {
        GPIOC->BSRR = GPIO_BSRR_BR13;   /* Drive PC13 low: LED on */
        uart_puts("LED on\r\n");
        delay_ms(half);
        GPIOC->BSRR = GPIO_BSRR_BS13;   /* Drive PC13 high: LED off */
        uart_puts("LED off\r\n");
        delay_ms(half);
    }
}
