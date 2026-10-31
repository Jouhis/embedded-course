/* Blink PC13 with YOUR OWN register struct for the GPIO block, not the CMSIS GPIO_TypeDef.
 * LED: PC13 (active low). Serial: USART1 TX on PA9, 115200 baud.
 * RCC, SysTick and USART1 still come from CMSIS. Only GPIO is ours.
 *
 * Reference: RM0008 section 3 (memory map) for base addresses,
 *            RM0008 section 9.2 (GPIO registers) for the offsets and field order. */
#include <stdint.h>
#include "stm32f1xx.h"

/* ---- Your register layout ------------------------------------------------- */

/* TODO(learner): check this base against RM0008 section 3. Is it GPIOA or GPIOC? */
#define MY_GPIOA_BASE  0x40010800UL
#define MY_GPIOC_BASE  0x40010800UL

/* TODO(learner): the fields must sit at the offsets in RM0008 section 9.2:
 * CRL at 0x00, CRH at 0x04, IDR at 0x08, ODR at 0x0C, BSRR at 0x10, BRR at 0x14, LCKR at 0x18.
 * Each field is one 32-bit register, so the order in the struct sets the offsets. */
typedef struct {
    volatile uint32_t CRH;
    volatile uint32_t CRL;
    volatile uint32_t IDR;
    volatile uint32_t ODR;
    volatile uint32_t BSRR;
    volatile uint32_t BRR;
    volatile uint32_t LCKR;
} MyGpio;

#define MY_GPIOA  ((MyGpio *)MY_GPIOA_BASE)
#define MY_GPIOC  ((MyGpio *)MY_GPIOC_BASE)

#define LED_PIN_BIT  13U    /* PC13 */

/* ---- Helpers (same as the template) -------------------------------------- */

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
    MY_GPIOA->CRH = (MY_GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

/* ---- Main ----------------------------------------------------------------- */

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;   /* Clock the GPIOC peripheral */

    /* TODO(learner): configure PC13 as push-pull output, 2 MHz.
     * PC13 is in CRH, so its 4-bit field starts at bit 20 (CNF bits 23:22, MODE bits 21:20).
     * Clear the field, then write CNF=00, MODE=10. Use read-modify-write here: this is setup. */
    MY_GPIOC->CRH = MY_GPIOC->CRH;

    while (1) {
        /* TODO(learner): LED on = PC13 low. Use BSRR: the BR (reset) half is bit 16 + 13.
         * Then LED off = PC13 high, using the BS (set) half. Both are single writes, so no
         * read-modify-write race with an interrupt. */
        uart_puts("LED on\r\n");
        delay_ms(500);
        uart_puts("LED off\r\n");
        delay_ms(500);
    }
}
