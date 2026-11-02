/* Bench lab 12: the sleep current hunt on the NUCLEO-U545RE-Q.
 *
 * Measure the MCU's current with the multimeter in place of the IDD jumper JP4 (UM3062, section
 * 6.4.6). Each press of B1 switches between RUN (the core spins) and LOW POWER, and the VCP says
 * which one. The LOW POWER mode is much higher than it should be.
 * TODO(learner): find everything that wastes current in LOW POWER and get it down. There is
 * more than one thing; measure after each change.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <stdint.h>
#include <stdio.h>
#include "stm32u5xx.h"

#define LED_PIN     5U      /* PA5, LD2 */
#define BTN_PIN     13U     /* PC13, B1: high while pressed (UM3062 section 6.6) */
#define JUMPER_PIN  0U      /* PB0 (CN7 pin 34, Arduino A3): "a configuration jumper" with a wire on it */
#define TX_PIN      9U      /* PA9, USART1 TX to the ST-LINK VCP */
#define BAUD        115200U

static volatile uint32_t pressed;

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
    while ((USART1->ISR & USART_ISR_TC) == 0U) { }   /* the last bit is out before we sleep */
    return len;
}

void EXTI13_IRQHandler(void) {
    EXTI->RPR1 = EXTI_RPR1_RPIF13;
    pressed = 1U;
}

static void board_init(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN | RCC_AHB2ENR1_GPIOBEN | RCC_AHB2ENR1_GPIOCEN;
    RCC->AHB3ENR |= RCC_AHB3ENR_PWREN;               /* PWR registers need their clock too */
    (void)RCC->AHB3ENR;
    GPIOA->MODER = (GPIOA->MODER & ~(3U << (LED_PIN * 2U))) | (1U << (LED_PIN * 2U));
    GPIOC->MODER &= ~(3U << (BTN_PIN * 2U));
    GPIOC->PUPDR = (GPIOC->PUPDR & ~(3U << (BTN_PIN * 2U))) | (2U << (BTN_PIN * 2U));
    EXTI->EXTICR[3] = (EXTI->EXTICR[3] & ~EXTI_EXTICR4_EXTI13) | (2U << EXTI_EXTICR4_EXTI13_Pos);
    EXTI->RTSR1 |= 1U << BTN_PIN;
    EXTI->IMR1 |= 1U << BTN_PIN;                     /* an unmasked EXTI line also wakes from Stop */
    NVIC_EnableIRQ(EXTI13_IRQn);
    uart_init();
}

/* Wait for B1 while burning cycles: the "Run" measurement. */
static void run_until_press(void) {
    pressed = 0U;
    while (!pressed) {
        __NOP();
    }
}

static void wait_release(void) {
    for (volatile uint32_t i = 0; i < 100000U; i++) { }   /* about 0.1 s at 4 MHz: let the bounce pass */
}

static void enter_low_power(void) {
    pressed = 0U;
    while (!pressed) {
        __WFI();
    }
}

int main(void) {
    board_init();
    GPIOB->MODER &= ~(3U << (JUMPER_PIN * 2U));      /* PB0 as a digital input, to read the jumper */
    uint32_t jumper = (GPIOB->IDR >> JUMPER_PIN) & 1U;
    printf("BENCH12 ready (jumper=%lu). Press B1 to step: RUN, LOW POWER\n", (unsigned long)jumper);

    for (uint32_t cycle = 1;; cycle++) {
        GPIOA->BSRR = 1U << LED_PIN;
        printf("BENCH12 mode RUN: read the meter, then press B1\n");
        run_until_press();
        wait_release();

        printf("BENCH12 mode LOW POWER: read the meter, then press B1\n");
        enter_low_power();
        wait_release();
        printf("BENCH12 cycle %lu done\n", (unsigned long)cycle);
    }
}
