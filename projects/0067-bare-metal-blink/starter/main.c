/* Two LEDs at different rates with CMSIS only: no HAL, no delay_ms() that blocks.
 *
 *   PC13  onboard LED, active low, wired to 3.3 V through the board.   500 ms on, 500 ms off.
 *   PB0   external LED through a 220 ohm resistor, active high.        150 ms on, 150 ms off.
 *
 * SysTick is polled, not interrupt-driven: COUNTFLAG is set once per millisecond,
 * and the main loop counts those milliseconds. Each LED has its own deadline, so
 * a slow LED never holds up a fast one. Clock: the 8 MHz internal oscillator (HSI).
 * Serial: USART1 TX on PA9, 115200 baud, used only for the startup line. */
#include <stdint.h>
#include "stm32f1xx.h"

#define LED_ONBOARD_PIN       13U     /* PC13 */
#define LED_ONBOARD_HALF_MS   500U
#define LED_EXTERNAL_PIN      0U      /* PB0 */
#define LED_EXTERNAL_HALF_MS  150U

/* CRL configures pins 0 to 7 and CRH pins 8 to 15. Each pin has a 4-bit field:
 * CNF in bits 3:2 and MODE in bits 1:0. CNF=00 with MODE=10 is push-pull output at 2 MHz. */
#define PIN_FIELD_BITS        4U
#define CFG_OUT_PUSH_PULL_2MHZ 0x2U

static void systick_start_1ms(void) {
    /* SysTick counts down from LOAD to 0 once per millisecond at the core clock. */
    SysTick->LOAD = (SystemCoreClock / 1000U) - 1U;
    SysTick->VAL  = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_ENABLE_Msk;
}

/* Returns 1 once per elapsed millisecond. Reading CTRL clears COUNTFLAG, so each
 * millisecond is reported exactly once, provided the loop polls at least once per ms. */
static int systick_one_ms_elapsed(void) {
    return (SysTick->CTRL & SysTick_CTRL_COUNTFLAG_Msk) != 0U;
}

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull, 50 MHz */
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0U) { }
        USART1->DR = (uint8_t)*s++;
    }
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    /* Clock gating: a GPIO port does nothing until its bit in RCC_APB2ENR is set. */
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    /* TODO(learner) 1: also set RCC_APB2ENR_IOPBEN. Without it, GPIOB ignores your writes. */

    /* PC13 is in CRH, field starts at bit (13 - 8) * 4 = 20. */
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << ((LED_ONBOARD_PIN - 8U) * PIN_FIELD_BITS)))
               | (CFG_OUT_PUSH_PULL_2MHZ << ((LED_ONBOARD_PIN - 8U) * PIN_FIELD_BITS));

    /* TODO(learner) 2: configure PB0 as a push-pull output at 2 MHz. PB0 is in CRL, so its
     * field starts at bit 0 * 4 = 0. Use the same mask-and-set pattern as PC13 above. */

    /* Start both LEDs off. BSRR: bit n sets pin n, bit n+16 resets it. Each write touches one pin only. */
    GPIOC->BSRR = 1U << LED_ONBOARD_PIN;                      /* PC13 high: LED off (active low) */
    /* TODO(learner) 3: the PB0 LED should start off. Write its BSRR reset bit here. */

    uart_puts("TWO LED OK\r\n");

    systick_start_1ms();

    uint32_t now_ms = 0U;
    uint32_t next_onboard_ms = LED_ONBOARD_HALF_MS;   /* deadline of the next PC13 change */
    uint32_t next_external_ms = LED_EXTERNAL_HALF_MS; /* deadline of the next PB0 change */
    uint32_t onboard_on = 0U;
    uint32_t external_on = 0U;

    while (1) {
        if (!systick_one_ms_elapsed()) {
            continue;                    /* nothing to do until the next millisecond */
        }
        now_ms++;

        if (now_ms >= next_onboard_ms) {
            next_onboard_ms += LED_ONBOARD_HALF_MS;
            onboard_on = !onboard_on;
            /* Active low: reset the pin (bit 16 + 13) to light the LED, set it to turn it off. */
            GPIOC->BSRR = onboard_on ? (1U << (LED_ONBOARD_PIN + 16U)) : (1U << LED_ONBOARD_PIN);
        }

        /* TODO(learner) 4: copy the PC13 block above for PB0. Use LED_EXTERNAL_HALF_MS,
         * next_external_ms and external_on, and remember that PB0 is active high. */
    }
}
