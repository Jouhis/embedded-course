/* Bench lab 10: measure interrupt latency on the NUCLEO-U545RE-Q.
 *
 * Pressing B1 drives PC13 high. EXTI line 13 raises EXTI13_IRQn, and the handler drives PA5
 * high. The logic analyzer measures the time from the PC13 edge (D0) to the PA5 edge (D1).
 * The core runs from MSIS at 4 MHz (reset default), so one cycle is 250 ns and a 24 MS/s
 * analyzer resolves about a sixth of a cycle.
 *
 * The response is the handler's first statement: the pin write comes before anything else,
 * including clearing the pending flag. What remains is the hardware path: input synchronisation,
 * EXTI, the NVIC, exception entry (lesson 34's 12 cycles is the Cortex-M3 figure; this lab measures
 * the M33's) and the few instructions before the store.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <stdint.h>
#include <stdio.h>
#include "stm32u5xx.h"

#define LED_PIN     5U      /* PA5 (LD2, also CN10 pin 11 / Arduino D13): logic analyzer D1 */
#define BTN_PIN     13U     /* PC13 (CN7 pin 23), B1: high while pressed (UM3062 section 6.6); analyzer D0 */
#define TX_PIN      9U      /* PA9, USART1 TX to the ST-LINK VCP */
#define BAUD        115200U
#define PULSE_MS    2U      /* how long PA5 stays high after each response */

static volatile uint32_t presses;
static volatile uint32_t ms_now;

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    GPIOA->MODER = (GPIOA->MODER & ~(3U << (TX_PIN * 2U))) | (2U << (TX_PIN * 2U));
    GPIOA->AFR[1] = (GPIOA->AFR[1] & ~(0xFU << ((TX_PIN - 8U) * 4U))) | (7U << ((TX_PIN - 8U) * 4U));
    USART1->BRR = (SystemCoreClock + BAUD / 2U) / BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

int _write(int fd, const char *buf, int len) {
    (void)fd;
    for (int i = 0; i < len; i++) {
        if (buf[i] == '\n') {
            while ((USART1->ISR & USART_ISR_TXE_TXFNF) == 0U) { }
            USART1->TDR = '\r';
        }
        while ((USART1->ISR & USART_ISR_TXE_TXFNF) == 0U) { }
        USART1->TDR = (uint8_t)buf[i];
    }
    return len;
}

void SysTick_Handler(void) {
    ms_now++;
}

static void board_init(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN | RCC_AHB2ENR1_GPIOCEN;
    (void)RCC->AHB2ENR1;
    GPIOA->MODER = (GPIOA->MODER & ~(3U << (LED_PIN * 2U))) | (1U << (LED_PIN * 2U));
    GPIOA->OSPEEDR |= 3U << (LED_PIN * 2U);          /* fastest edge, so the analyzer sees it cleanly */
    /* PC13 input with pull-down, as UM3062 requires for the user button. */
    GPIOC->MODER &= ~(3U << (BTN_PIN * 2U));
    GPIOC->PUPDR = (GPIOC->PUPDR & ~(3U << (BTN_PIN * 2U))) | (2U << (BTN_PIN * 2U));
    /* EXTI line 13 from port C (EXTICR4 field EXTI13 = 2), rising edge = press, unmasked. */
    EXTI->EXTICR[3] = (EXTI->EXTICR[3] & ~EXTI_EXTICR4_EXTI13) | (2U << EXTI_EXTICR4_EXTI13_Pos);
    EXTI->RTSR1 |= 1U << BTN_PIN;
    EXTI->IMR1 |= 1U << BTN_PIN;
    NVIC_SetPriority(EXTI13_IRQn, 0);
    NVIC_EnableIRQ(EXTI13_IRQn);
    uart_init();
    SysTick_Config(SystemCoreClock / 1000U);         /* 1 ms tick, lowest priority by default */
}

static void main_loop(void) {
    uint32_t reported = 0U, high_since = 0U;
    for (;;) {
        if ((GPIOA->ODR & (1U << LED_PIN)) != 0U) {
            if (high_since == 0U) {
                high_since = ms_now + 1U;
            } else if ((int32_t)(ms_now - high_since) >= (int32_t)PULSE_MS) {
                GPIOA->BSRR = 1U << (LED_PIN + 16U);    /* end the pulse */
                high_since = 0U;
            }
        }
        if (presses != reported) {
            reported = presses;
            printf("BENCH10 response %lu\n", (unsigned long)reported);
        }
    }
}

void EXTI13_IRQHandler(void) {
    GPIOA->BSRR = 1U << LED_PIN;                     /* respond first */
    EXTI->RPR1 = EXTI_RPR1_RPIF13;                   /* then clear: writing 1 clears the flag */
    presses++;
}

int main(void) {
    board_init();
    printf("BENCH10 ready at %lu Hz: press B1, capture PC13 and PA5\n", (unsigned long)SystemCoreClock);
    main_loop();
}
