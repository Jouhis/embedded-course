/* Bench lab 10: measure interrupt latency on the NUCLEO-U545RE-Q.
 *
 * Pressing B1 drives PC13 high. EXTI line 13 raises EXTI13_IRQn, and the response is PA5 going
 * high. The logic analyzer measures the time from the PC13 edge (D0) to the PA5 edge (D1).
 * The core runs from MSIS at 4 MHz (reset default), so one cycle is 250 ns.
 *
 * This version is written the way a generic driver layer often is: the handler looks up which
 * line fired, calls a registered callback through a pointer, and the callback logs the event
 * before it responds. Measure it first, then TODO(learner): make the response as fast as the
 * hardware allows, and account for every cycle that remains.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <string.h>
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

typedef void (*exti_callback_t)(uint32_t line);
static exti_callback_t callbacks[16];
static char event_log[8][32];

static void on_button(uint32_t line) {
    static uint32_t n;
    snprintf(event_log[n % 8U], sizeof event_log[0], "line %lu event %lu", (unsigned long)line, (unsigned long)n);
    n++;
    GPIOA->BSRR = 1U << LED_PIN;                     /* the response, after the logging */
    presses++;
}

void EXTI13_IRQHandler(void) {
    for (uint32_t line = 0U; line < 16U; line++) {   /* generic dispatch: find the pending line */
        if ((EXTI->RPR1 & (1U << line)) != 0U) {
            EXTI->RPR1 = 1U << line;
            if (callbacks[line] != NULL) {
                callbacks[line](line);
            }
        }
    }
}

int main(void) {
    callbacks[BTN_PIN] = on_button;
    board_init();
    printf("BENCH10 ready at %lu Hz: press B1, capture PC13 and PA5\n", (unsigned long)SystemCoreClock);
    main_loop();
}
