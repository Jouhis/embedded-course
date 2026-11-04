// EXPECT: TIMEOUT elapsed=2000 ms
/* SysTick as a millisecond time base on the Blue Pill (8 MHz HSI, so 8000 ticks = 1 ms).
 *
 * SysTick_Config() sets the reload value, sets SysTick to the lowest interrupt priority,
 * and starts the counter with its interrupt enabled. The handler adds 1 to g_ms every
 * millisecond. Everything else reads g_ms through millis().
 *
 * The counter is a uint32_t, so it wraps after about 49.7 days. The code below never
 * compares two raw times. It subtracts them in uint32_t, which gives the right
 * elapsed time across the wrap (lesson 55 explains the pattern for timeouts).
 */
#include <stdint.h>
#include "stm32f1xx.h"

#define TICK_HZ            1000U     /* one SysTick interrupt per millisecond */
#define BLINK_PERIOD_MS    500U      /* LED toggle period, scheduled without blocking */
#define TIMEOUT_MS        2000U      /* the demo timeout */

/* Start 256 ms before the counter wraps, so the demo crosses zero in its first second.
 * This shows that elapsed-time arithmetic does not break at the wrap. */
#define DEMO_START_MS    0xFFFFFF00UL

#define CFG_OUTPUT_PP_2MHZ 0x2U   /* CNF=00, MODE=10 */

static volatile uint32_t g_ms;

void SysTick_Handler(void) {
    g_ms++;
}

/* Read the time. An aligned 32-bit load is one bus access on the Cortex-M3, so it cannot tear.
 * The PRIMASK bracket is still the habit to copy when a timestamp is more than one word
 * (lesson 57). */
static uint32_t millis(void) {
    uint32_t t;
    __disable_irq();
    t = g_ms;
    __enable_irq();
    return t;
}

/* True when at least `timeout_ms` have passed since `start_ms`. The subtraction is
 * modulo 2^32, so it is correct across the wrap as long as the timeout is under 2^31 ms. */
static uint8_t timed_out(uint32_t start_ms, uint32_t timeout_ms) {
    return (uint32_t)(millis() - start_ms) >= timeout_ms;
}

/* ---- UART (USART1 TX on PA9) ---------------------------------------------- */

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_putc(char c) {
    while ((USART1->SR & USART_SR_TXE) == 0) { }
    USART1->DR = (uint8_t)c;
}

static void uart_puts(const char *s) {
    while (*s) { uart_putc(*s++); }
}

static void uart_put_uint(uint32_t v) {
    char buf[10];
    int n = 0;
    do { buf[n++] = (char)('0' + (v % 10U)); v /= 10U; } while (v != 0U);
    while (n > 0) { uart_putc(buf[--n]); }
}

/* ---- Main ----------------------------------------------------------------- */

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << 20)) | (CFG_OUTPUT_PP_2MHZ << 20);  /* PC13 = LED */

    /* SysTick_Config returns 1 when the reload value does not fit in 24 bits. For a
     * 1 kHz tick at 8 MHz the reload is 7999, so it always succeeds here. */
    if (SysTick_Config(SystemCoreClock / TICK_HZ) != 0U) {
        uart_puts("SysTick reload too large\r\n");
        while (1) { }
    }

    g_ms = DEMO_START_MS;       /* start near the wrap; see the note above */
    uart_puts("START ms=");
    uart_put_uint(millis());
    uart_puts("\r\n");

    uint32_t start = millis();
    uint32_t last_toggle = millis();
    uint8_t wrapped = 0U;
    uint8_t reported = 0U;

    while (1) {
        uint32_t now = millis();

        if (!wrapped && now < DEMO_START_MS) {   /* the counter has crossed zero */
            wrapped = 1U;
            uart_puts("WRAP passed at ms=");
            uart_put_uint(now);
            uart_puts("\r\n");
        }

        if (timed_out(last_toggle, BLINK_PERIOD_MS)) {
            last_toggle = now;
            GPIOC->ODR ^= (1U << 13);            /* toggle the LED without blocking */
        }

        if (!reported && timed_out(start, TIMEOUT_MS)) {
            reported = 1U;
            /* Read the time before printing: sending "TIMEOUT elapsed=" takes about
             * 1.4 ms at 115200 baud, so a read after it would show 2001. */
            uint32_t elapsed = millis() - start;   /* 2000 even across the wrap */
            uart_puts("TIMEOUT elapsed=");
            uart_put_uint(elapsed);
            uart_puts(" ms\r\n");
        }
    }
}
