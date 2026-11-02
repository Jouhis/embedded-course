/* Bench lab 9: bring up the Nucleo-U5. Lesson 67's blink, ported from the Blue Pill (STM32F103,
 * Cortex-M3) to the NUCLEO-U545RE-Q (STM32U545, Cortex-M33).
 *
 * Board (UM3062): user LED LD2 on PA5, active high through a transistor (section 6.5); the
 * ST-LINK's virtual COM port is USART1 on PA9 (TX) and PA10 (RX) (section 6.9).
 * Clock: after reset the U5 runs from MSIS at 4 MHz (system_stm32u5xx.c), and this program
 * keeps it. USART1's kernel clock is PCLK2 by default, also 4 MHz.
 *
 * What changed from the Blue Pill:
 *   - the GPIO clock enable moved from RCC->APB2ENR to RCC->AHB2ENR1;
 *   - pins are configured with MODER (2 bits per pin), not CRL/CRH, and they come out of reset in
 *     analog mode, not as floating inputs;
 *   - alternate functions are chosen per pin with AFR[0]/AFR[1] (USART1 is AF7);
 *   - the USART has ISR/TDR, not SR/DR, and its own enable for the kernel clock in RCC->APB2ENR.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <stdint.h>
#include <stdio.h>
#include "stm32u5xx.h"

#define LED_PIN        5U      /* PA5, LD2 */
#define TX_PIN         9U      /* PA9, USART1_TX to the ST-LINK VCP */
#define AF7_USART1     7U
#define BAUD           115200U
#define BEAT_ON_MS     100U
#define BEAT_PERIOD_MS 1000U

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    /* PA9: MODER = 10 (alternate function), AFSEL9 = 7 in AFR[1] (pins 8 to 15). */
    GPIOA->MODER = (GPIOA->MODER & ~(3U << (TX_PIN * 2U))) | (2U << (TX_PIN * 2U));
    GPIOA->AFR[1] = (GPIOA->AFR[1] & ~(0xFU << ((TX_PIN - 8U) * 4U))) | (AF7_USART1 << ((TX_PIN - 8U) * 4U));
    /* Oversampling by 16: BRR = f_ck / baud, rounded. 4 MHz / 115200 = 34.7, so 35 (114286 baud, 0.8 % slow). */
    USART1->BRR = (SystemCoreClock + BAUD / 2U) / BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

int _write(int fd, const char *buf, int len) {   /* printf goes to the VCP */
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

int main(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN;           /* clock to port A first, or writes are lost */
    (void)RCC->AHB2ENR1;                             /* read back: the enable has taken effect */

    /* PA5 output: MODER5 = 01. Push-pull and low speed are the reset values of OTYPER and OSPEEDR. */
    GPIOA->MODER = (GPIOA->MODER & ~(3U << (LED_PIN * 2U))) | (1U << (LED_PIN * 2U));
    uart_init();

    uint32_t id = DBGMCU->IDCODE;
    printf("BENCH9 OK: STM32 DEV_ID=0x%03lX REV_ID=0x%04lX, %lu Hz\n",
           (unsigned long)(id & 0xFFFU), (unsigned long)(id >> 16), (unsigned long)SystemCoreClock);

    SysTick->LOAD = SystemCoreClock / 1000U - 1U;    /* 1 ms, polled as in lesson 67 */
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
            GPIOA->BSRR = 1U << LED_PIN;             /* heartbeat flash on */
        } else if (phase == BEAT_ON_MS) {
            GPIOA->BSRR = 1U << (LED_PIN + 16U);     /* off */
            printf("beat %lu\n", (unsigned long)++beat);
        }
    }
}
