/* Blink PC13 with YOUR OWN register struct for the GPIO block, not the CMSIS GPIO_TypeDef.
 * LED: PC13 (active low). Serial: USART1 TX on PA9, 115200 baud.
 * RCC, SysTick and USART1 still come from CMSIS. Only GPIO is ours.
 *
 * Reference: RM0008 section 3 (memory map) for base addresses,
 *            RM0008 section 9.2 (GPIO registers) for the offsets and field order. */
#include <stdint.h>
#include "stm32f1xx.h"

/* ---- Register layout -------------------------------------------------------
 * GPIOA is at 0x40010800 and GPIOC at 0x40011000 (RM0008 section 3, memory map).
 * Each port has the same seven 32-bit registers, in this order, so the struct
 * places each field at the offset that RM0008 section 9.2 lists. */
#define MY_GPIOA_BASE  0x40010800UL
#define MY_GPIOC_BASE  0x40011000UL

typedef struct {
    volatile uint32_t CRL;    /* 0x00: pin configuration, pins 0 to 7 */
    volatile uint32_t CRH;    /* 0x04: pin configuration, pins 8 to 15 */
    volatile uint32_t IDR;    /* 0x08: input data (read only in practice) */
    volatile uint32_t ODR;    /* 0x0C: output data */
    volatile uint32_t BSRR;   /* 0x10: bit set (low half) and bit reset (high half), atomic */
    volatile uint32_t BRR;    /* 0x14: bit reset only */
    volatile uint32_t LCKR;   /* 0x18: configuration lock */
} MyGpio;

/* The cast turns a plain address into a pointer to the register block.
 * The volatile in MyGpio stops the compiler from caching or dropping these accesses. */
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
    uart_puts("OWN STRUCT OK\r\n");

    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;   /* Clock the GPIOC peripheral */

    /* PC13 is in CRH, so its 4-bit field starts at bit (13 - 8) * 4 = 20.
     * CNF = 00 (general-purpose push-pull) and MODE = 10 (2 MHz) gives 0b0010 in the field. */
    MY_GPIOC->CRH = (MY_GPIOC->CRH & ~(0xFU << 20)) | (0x2U << 20);

    while (1) {
        /* BSRR: writing 1 to bit 16 + n resets pin n, writing 1 to bit n sets it.
         * A single write changes only the named pin and does not read the register first. */
        MY_GPIOC->BSRR = 1U << (LED_PIN_BIT + 16U);   /* PC13 low: LED on */
        uart_puts("LED on\r\n");
        delay_ms(500);

        MY_GPIOC->BSRR = 1U << LED_PIN_BIT;           /* PC13 high: LED off */
        uart_puts("LED off\r\n");
        delay_ms(500);
    }
}
