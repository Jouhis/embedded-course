/* Bench lab 12: the sleep current hunt on the NUCLEO-U545RE-Q.
 *
 * Measure the MCU's current with the multimeter in place of the IDD jumper JP4 (UM3062, section
 * 6.4.6). Each press of B1 moves to the next mode, and the VCP says which one:
 *   RUN    the core spins in a loop at 4 MHz;
 *   SLEEP  WFI: the core's clock stops, peripherals and SysTick-free clocks keep running;
 *   STOP2  SLEEPDEEP with PWR_CR1.LPMS = Stop 2: almost every clock stops; SRAM and registers
 *          are kept, and the EXTI line from B1 wakes the chip.
 * Compared with the starter: Sleep became Stop 2, PB0 (a digital input with a floating wire on it)
 * goes back to analog mode after it is read, and LD2 is off while the chip sleeps. Measure each
 * change on its own: LD2 is driven through a transistor (UM3062 section 6.5), so ask yourself how
 * much of its current passes through JP4 at all.
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

static void enter_sleep(void) {
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;
    pressed = 0U;
    while (!pressed) {
        __WFI();
    }
}

static void enter_stop2(void) {
    PWR->CR1 = (PWR->CR1 & ~PWR_CR1_LPMS) | PWR_CR1_LPMS_1;   /* LPMS = 010: Stop 2 */
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    pressed = 0U;
    while (!pressed) {
        __WFI();
    }
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;              /* wakes on MSIS at 4 MHz, as before */
}

int main(void) {
    board_init();
    /* The jumper is read once at start-up, then its pin goes back to analog: a digital input
     * buffer whose pin floats between the rails draws current (both of its transistors conduct). */
    GPIOB->MODER &= ~(3U << (JUMPER_PIN * 2U));                        /* input, to read it */
    uint32_t jumper = (GPIOB->IDR >> JUMPER_PIN) & 1U;
    GPIOB->MODER |= 3U << (JUMPER_PIN * 2U);                           /* analog: no input buffer */
    printf("BENCH12 ready (jumper=%lu). Press B1 to step: RUN, SLEEP, STOP2\n", (unsigned long)jumper);

    for (uint32_t cycle = 1;; cycle++) {
        GPIOA->BSRR = 1U << LED_PIN;
        printf("BENCH12 mode RUN: read the meter, then press B1\n");
        run_until_press();
        wait_release();

        GPIOA->BSRR = 1U << (LED_PIN + 16U);         /* LED off while asleep */
        printf("BENCH12 mode SLEEP: read the meter, then press B1\n");
        enter_sleep();
        wait_release();

        printf("BENCH12 mode STOP2: read the meter, then press B1\n");
        enter_stop2();
        wait_release();
        printf("BENCH12 cycle %lu done\n", (unsigned long)cycle);
    }
}
