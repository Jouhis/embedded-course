/* A serial command line driven by a USART1 receive interrupt, with a lock-free ring buffer,
 * plus a button on EXTI0 counted in its own interrupt. CMSIS registers only, no HAL.
 *
 *   PA10  USART1 RX: bytes typed in the serial monitor. The RX interrupt stores them in a ring buffer.
 *   PA9   USART1 TX: echo and replies.
 *   PA0   push button to GND, internal pull-up. The falling edge raises EXTI line 0.
 *   PC13  onboard LED (active low). The command "toggle" flips it.
 *
 * Clock: the 8 MHz internal oscillator (HSI). Serial: 115200 baud. */
#include <stdint.h>
#include "stm32f1xx.h"

#define LED_PIN          13U      /* PC13, active low */
#define RING_SIZE        16U      /* power of two: index & (RING_SIZE - 1) wraps the index */
#define LINE_MAX         15U      /* longest command we keep, plus the terminating NUL */

/* ---- Ring buffer: single producer (the RX interrupt), single consumer (main) ----------------
 *
 * head and tail are free-running 16-bit counters, not indexes. The slot is counter & (SIZE-1),
 * and the buffer is full when head - tail == SIZE, empty when head == tail. Free-running counters
 * avoid the one-slot-wasted trick, and the uint16_t difference is correct across the wrap.
 *
 * Why this is safe without a lock on one core:
 *   - Only the producer writes head, and only the consumer writes tail. Each side reads the other's index.
 *   - A 16-bit access to an aligned halfword is a single load or store, so a read of head or tail
 *     is never torn.
 *   - The producer writes the data slot before it publishes the new head. The consumer reads the
 *     slot only after it sees the new head. volatile keeps the compiler from reordering the two.
 *   - An interrupt can split a consumer call, but the producer never touches tail, so the
 *     consumer's view stays consistent. */
typedef struct {
    volatile uint8_t  data[RING_SIZE];
    volatile uint16_t head;     /* written only by the producer (the ISR) */
    volatile uint16_t tail;     /* written only by the consumer (main) */
} ByteRing;

static ByteRing g_rx;                 /* filled by the USART1 interrupt */
static volatile uint32_t g_rx_dropped;   /* bytes that arrived while the ring was full */
static volatile uint32_t g_button_presses;

/* Producer side: called from the interrupt. Returns 0 when full, so the byte is dropped. */
static int ring_put(ByteRing *r, uint8_t byte) {
    uint16_t head = r->head;
    if ((uint16_t)(head - r->tail) == RING_SIZE) {
        return 0;
    }
    r->data[head & (RING_SIZE - 1U)] = byte;
    r->head = (uint16_t)(head + 1U);    /* publish only after the slot is written */
    return 1;
}

/* Consumer side: called from main. Returns 0 when empty. */
static int ring_get(ByteRing *r, uint8_t *byte) {
    uint16_t tail = r->tail;
    if (tail == r->head) {
        return 0;
    }
    *byte = r->data[tail & (RING_SIZE - 1U)];
    r->tail = (uint16_t)(tail + 1U);    /* free the slot only after reading it */
    return 1;
}

/* Test the ring before the hardware uses it. The slot index wraps past the end of the array
 * several times here, so an index bug shows up now instead of on the serial line. */
static int ring_self_test(void) {
    ByteRing t = { .head = 0U, .tail = 0U };

    for (uint16_t i = 0U; i < 3U * RING_SIZE + 5U; i++) {
        uint8_t in = (uint8_t)(i * 7U);
        if (!ring_put(&t, in)) return 0;       /* must have room: we pop after each push */
        uint8_t out;
        if (!ring_get(&t, &out) || out != in) return 0;
    }

    /* Fill it completely, then one more push must fail. */
    for (uint16_t i = 0U; i < RING_SIZE; i++) {
        if (!ring_put(&t, (uint8_t)i)) return 0;
    }
    if (ring_put(&t, 0xFFU)) return 0;         /* full: the extra byte is refused */

    /* Drain in order; the empty ring must then refuse a read. */
    for (uint16_t i = 0U; i < RING_SIZE; i++) {
        uint8_t out;
        if (!ring_get(&t, &out) || out != (uint8_t)i) return 0;
    }
    uint8_t unused;
    return ring_get(&t, &unused) == 0;
}

/* ---- Clocks, GPIO and USART1 -------------------------------------------------------------- */

static void led_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << ((LED_PIN - 8U) * 4U))) | (0x2U << ((LED_PIN - 8U) * 4U));
    GPIOC->BSRR = 1U << LED_PIN;        /* start off: PC13 high */
}

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    /* PA9 (TX): alternate-function push-pull, 50 MHz (CNF=10, MODE=11), field at bit 4.
     * PA10 (RX): floating input (CNF=01, MODE=00), field at bit 8. */
    GPIOA->CRH = (GPIOA->CRH & ~((0xFU << 4) | (0xFU << 8))) | (0xBU << 4) | (0x4U << 8);
    USART1->BRR = SystemCoreClock / 115200U;
    /* RXNEIE: interrupt when a byte arrives in DR. Without it the ring never fills. */
    USART1->CR1 = USART_CR1_TE | USART_CR1_RE | USART_CR1_RXNEIE | USART_CR1_UE;
    NVIC_SetPriority(USART1_IRQn, 2U);  /* 2 is less urgent than 0: EXTI0 (the button) keeps the reset
                                         * default 0, so it can preempt this handler */
    NVIC_EnableIRQ(USART1_IRQn);
}

static void uart_putc(char c) {
    while ((USART1->SR & USART_SR_TXE) == 0U) { }
    USART1->DR = (uint8_t)c;
}

static void uart_puts(const char *s) {
    while (*s) {
        uart_putc(*s++);
    }
}

/* RX interrupt: runs once per received byte. Keep it short, and do the work in main. */
void USART1_IRQHandler(void) {
    uint32_t sr = USART1->SR;               /* step 1: read SR ... */
    if (sr & (USART_SR_RXNE | USART_SR_ORE)) {
        uint8_t byte = (uint8_t)USART1->DR; /* step 2: ... then DR. This clears RXNE and ORE. */
        if (sr & USART_SR_RXNE) {
            if (!ring_put(&g_rx, byte)) {
                g_rx_dropped++;
            }
        }
    }
    if (sr & USART_SR_ORE) {
        g_rx_dropped++;                     /* a byte was overwritten before we read it */
    }
}

/* ---- Button on EXTI0 ------------------------------------------------------------------------ */

static void button_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_AFIOEN;   /* AFIO routes the EXTI lines */

    /* PA0 input with pull-up: CNF=10, MODE=00 gives 0x8 in the field at bit 0. Then ODR bit 0 = 1
     * selects the pull-up. The ODR write is a plain set here, because nothing else touches PA0. */
    GPIOA->CRL = (GPIOA->CRL & ~0xFU) | 0x8U;
    GPIOA->BSRR = GPIO_BSRR_BS0;

    /* EXTI line 0 comes from pin 0 of whichever port AFIO_EXTICR1 selects. 0 selects port A. */
    AFIO->EXTICR[0] = (AFIO->EXTICR[0] & ~AFIO_EXTICR1_EXTI0) | AFIO_EXTICR1_EXTI0_PA;

    EXTI->FTSR |= EXTI_FTSR_TR0;     /* falling edge: pressing pulls PA0 to GND */
    EXTI->PR = EXTI_PR_PR0;          /* clear stale pending state (write 1 to clear) */
    EXTI->IMR |= EXTI_IMR_MR0;       /* unmask line 0 so it can interrupt */
    NVIC_EnableIRQ(EXTI0_IRQn);
}

void EXTI0_IRQHandler(void) {
    if (EXTI->PR & EXTI_PR_PR0) {
        EXTI->PR = EXTI_PR_PR0;      /* clear by writing 1, or the interrupt fires again forever */
        g_button_presses++;
    }
}

/* ---- Command line --------------------------------------------------------------------------- */

static void led_set(int on) {
    /* PC13 is active low. BSRR gives an atomic set or reset, with no read first. */
    GPIOC->BSRR = on ? (1U << (LED_PIN + 16U)) : (1U << LED_PIN);
}

/* Exact match. Comparing only the first characters would accept "toggles", and reading
 * line[1] on a one-character line would read past what we stored. */
static int str_eq(const char *a, const char *b) {
    while (*a && *a == *b) {
        a++;
        b++;
    }
    return *a == *b;
}

static void handle_command(const char *line) {
    if (line[0] == '\0') {
        return;
    }
    if (str_eq(line, "toggle")) {
        /* PC13 low means the LED is lit (active low). Read the ODR bit, then drive the opposite. */
        int lit = (GPIOC->ODR & (1U << LED_PIN)) == 0U;
        led_set(!lit);
        uart_puts(lit ? "LED off\r\n" : "LED on\r\n");
    } else if (str_eq(line, "st")) {
        uart_puts("presses ");
        /* Printing a decimal number by hand keeps this file free of printf. */
        char buf[11];
        uint32_t v = g_button_presses;
        int n = 0;
        do { buf[n++] = (char)('0' + (v % 10U)); v /= 10U; } while (v != 0U);
        while (n > 0) { uart_putc(buf[--n]); }
        uart_puts("\r\n");
    } else {
        uart_puts("unknown command, try: toggle, st\r\n");
    }
}

int main(void) {
    SystemCoreClockUpdate();
    led_init();
    uart_init();

    /* The self-test runs before any interrupt can touch the ring, so a failure is easy to read. */
    if (!ring_self_test()) {
        uart_puts("RING FAIL\r\n");
        while (1) { }
    }
    uart_puts("RING OK\r\n"); // EXPECT: RING OK

    button_init();
    uart_puts("Type toggle and press Enter. Type st for the button count.\r\n> ");

    char line[LINE_MAX + 1U];
    uint32_t len = 0U;

    while (1) {
        uint8_t c;
        while (ring_get(&g_rx, &c)) {          /* drain every byte the interrupt stored */
            if (c == '\r' || c == '\n') {
                line[len] = '\0';
                uart_puts("\r\n");
                handle_command(line);
                len = 0U;
                uart_puts("> ");
            } else if (len < LINE_MAX) {
                line[len++] = (char)c;
                uart_putc((char)c);           /* echo the typed character */
            }
        }
    }
}
