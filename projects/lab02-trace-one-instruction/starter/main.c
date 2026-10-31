/* Lab 2 starter: trace one instruction.
 * The program is the bare-metal blink from the template. You do not need to
 * change the code to finish the lab: you trace it from C to the LED.
 * Answer each TODO(learner) question in your lab notes, then check the solution.
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
        /* TODO(learner) 1: Preprocess this line (gcc -E) and write the final
         *   expression the compiler sees for GPIO_BSRR_BR13. Which bit is it,
         *   and what is its value in hex?
         * TODO(learner) 2: What is the address of GPIOC->BSRR? Find GPIOC_BASE
         *   in the CMSIS header and add the offset of BSRR in GPIO_TypeDef.
         * TODO(learner) 3: Which bus carries GPIOC? Find APB2PERIPH_BASE and
         *   AHBPERIPH_BASE in the header.
         * TODO(learner) 4: Why does driving BR13 low light the LED? Write the
         *   reason in one sentence, and say where you checked it.
         */
        GPIOC->BSRR = GPIO_BSRR_BR13;   /* Drive PC13 low: LED on */
        uart_puts("LED on\r\n");
        delay_ms(500);
        GPIOC->BSRR = GPIO_BSRR_BS13;   /* Drive PC13 high: LED off */
        uart_puts("LED off\r\n");
        delay_ms(500);
    }
}
