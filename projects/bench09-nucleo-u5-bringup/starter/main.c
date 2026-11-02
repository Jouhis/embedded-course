/* Bench lab 9: bring up the Nucleo-U5. Lesson 67's blink, half-ported from the Blue Pill
 * (STM32F103, Cortex-M3) to the NUCLEO-U545RE-Q (STM32U545, Cortex-M33).
 *
 * It builds, it flashes, and nothing happens: no LED, no serial output. Each TODO(learner) is a
 * place where the Blue Pill code doesn't carry over. Use the CMSIS header stm32u545xx.h (names)
 * and the board manual UM3062 (pins): LD2 is on PA5, the VCP is USART1 on PA9/PA10.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <stdint.h>
#include <stdio.h>
#include "stm32u5xx.h"

#define LED_PIN        5U      /* PA5, LD2 */
#define TX_PIN         9U      /* PA9, USART1_TX to the ST-LINK VCP */
#define BAUD           115200U
#define BEAT_ON_MS     100U
#define BEAT_PERIOD_MS 1000U

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    /* TODO(learner): on the Blue Pill, CRH set PA9 to "alternate function push-pull" in one field.
     * On the U5, set MODER9 to alternate function and pick USART1's alternate function in AFR[1]. */
    /* TODO(learner): the Blue Pill ran at 8 MHz. What does this chip run at after reset? */
    USART1->BRR = 8000000U / BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

int _write(int fd, const char *buf, int len) {   /* printf goes to the VCP */
    (void)fd;
    for (int i = 0; i < len; i++) {
        while ((USART1->ISR & USART_ISR_TXE_TXFNF) == 0U) { }
        USART1->TDR = (uint8_t)buf[i];
    }
    return len;
}

int main(void) {
    SystemCoreClockUpdate();
    /* TODO(learner): the Blue Pill enabled the port clock with RCC->APB2ENR |= RCC_APB2ENR_IOPAEN.
     * Find the register and bit that clock GPIOA on the U5. */

    /* TODO(learner): the Blue Pill used CRL (4 bits per pin). Make PA5 a push-pull output. */
    uart_init();

    uint32_t id = DBGMCU->IDCODE;
    printf("BENCH9 OK: STM32 DEV_ID=0x%03lX REV_ID=0x%04lX, %lu Hz\n",
           (unsigned long)(id & 0xFFFU), (unsigned long)(id >> 16), (unsigned long)SystemCoreClock);

    SysTick->LOAD = SystemCoreClock / 1000U - 1U;
    SysTick->VAL = 0U;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk;

    uint32_t ms = 0U, beat = 0U;
    for (;;) {
        if ((SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk) == 0U) {
            continue;
        }
        ms++;
        uint32_t phase = ms % BEAT_PERIOD_MS;
        if (phase == 0U) {
            GPIOA->BSRR = 1U << LED_PIN;
        } else if (phase == BEAT_ON_MS) {
            GPIOA->BSRR = 1U << (LED_PIN + 16U);
            printf("beat %lu\n", (unsigned long)++beat);
        }
    }
}
