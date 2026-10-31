// EXPECT: TIM2 nested in EXTI0
/* NVIC demo on the Blue Pill: a high-priority timer preempts a long low-priority EXTI handler.
 *
 *   EXTI0 (button on PB0, active low)   priority 2 (low), busy for about 30 ms
 *   TIM2 update interrupt (100 Hz)      priority 0 (high), preempts EXTI0
 *   TIM3 free-running at 1 MHz          a microsecond stopwatch for the busy wait
 *
 * Both ISRs write to a small event log. The log entries carry a sequence number, and the
 * log index is shared between the two ISRs, so the log update runs with PRIMASK set.
 * main() prints the log, so the UART output is in sequence order.
 *
 * Priority numbers: a lower number is a higher priority. With grouping 3 on this device
 * (__NVIC_PRIO_BITS = 4), all four bits are preemption bits and there are no sub-priority bits.
 */
#include <stdint.h>
#include "stm32f1xx.h"

#define TIM3_TICK_HZ      1000000UL     /* PSC = 7 on the 8 MHz HSI clock */
#define TIM2_PSC_1KHZ    7999U          /* 8 MHz / 8000 = 1 kHz */
#define TIM2_ARR_100HZ      9U          /* 1 kHz / 10 = 100 Hz update interrupt */
#define EXTI_BUSY_US    30000U          /* how long the low-priority handler runs */

#define PRIO_GROUP        3U            /* 4 preemption bits, 0 sub-priority bits */
#define PRIO_TIM2         0U            /* highest: may preempt the EXTI handler */
#define PRIO_EXTI0        2U            /* lower: can be preempted by TIM2 */

#define CFG_INPUT_PULLUP  0x8U          /* CNF=10, MODE=00 */
#define LOG_SIZE          32U

typedef enum {
    EV_EXTI_ENTER = 0,
    EV_TIM2_TICK,
    EV_TIM2_NESTED,      /* TIM2 ran while EXTI0 was active */
    EV_EXTI_EXIT
} event_id_t;

typedef struct {
    uint32_t seq;
    uint32_t tick10ms;   /* TIM2 ticks since boot (10 ms each) */
    uint8_t  id;
} log_entry_t;

static volatile uint32_t g_seq;
static volatile uint32_t g_tick10ms;
static volatile uint8_t  g_exti_active;      /* 1 while EXTI0 is running */
static volatile uint8_t  g_head;             /* written by both ISRs */
static volatile uint8_t  g_tail;             /* written only by main() */
static volatile log_entry_t g_log[LOG_SIZE];

/* ---- UART (USART1 TX on PA9, as in the template) -------------------------- */

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull 50 MHz */
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

/* ---- Event log, shared by the ISRs and main() ----------------------------- */

/* Called from ISRs with different priorities. Disabling interrupts (PRIMASK) for the
 * few instructions that update g_head means a nested ISR cannot interleave with it. */
static void log_event(event_id_t id) {
    __disable_irq();
    uint8_t h = g_head;
    g_log[h].seq = ++g_seq;
    g_log[h].tick10ms = g_tick10ms;
    g_log[h].id = (uint8_t)id;
    g_head = (uint8_t)((h + 1U) % LOG_SIZE);
    __enable_irq();
}

static void drain_log(void) {
    while (g_tail != g_head) {
        log_entry_t e = g_log[g_tail];
        g_tail = (uint8_t)((g_tail + 1U) % LOG_SIZE);
        uart_puts("seq=");
        uart_put_uint(e.seq);
        uart_puts(" tick=");
        uart_put_uint(e.tick10ms);
        uart_puts(" ");
        switch (e.id) {
            case EV_EXTI_ENTER:  uart_puts("EXTI0 enter\r\n"); break;
            case EV_TIM2_TICK:   uart_puts("TIM2 tick\r\n"); break;
            case EV_TIM2_NESTED: uart_puts("TIM2 nested in EXTI0\r\n"); break;
            case EV_EXTI_EXIT:   uart_puts("EXTI0 exit\r\n"); break;
            default:             uart_puts("?\r\n"); break;
        }
    }
}

/* ---- Timer setup ----------------------------------------------------------- */

static void tim3_stopwatch_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM3EN;
    TIM3->PSC = 7U;                 /* 8 MHz / 8 = 1 MHz: one count is one microsecond */
    TIM3->ARR = 0xFFFFU;            /* wraps every 65.5 ms, so compare differences only */
    TIM3->CR1 = TIM_CR1_CEN;
}

static void tim2_tick_start(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
    TIM2->PSC  = TIM2_PSC_1KHZ;
    TIM2->ARR  = TIM2_ARR_100HZ;
    TIM2->DIER = TIM_DIER_UIE;      /* raise an interrupt on each update event */
    TIM2->EGR  = TIM_EGR_UG;        /* load PSC and ARR now */
    TIM2->SR   = 0U;                /* clear the update flag from the EGR write */
    TIM2->CR1  = TIM_CR1_CEN;
}

/* Busy-wait on the stopwatch. uint16_t subtraction handles the counter wrap. */
static void busy_wait_us(uint32_t us) {
    uint16_t start = (uint16_t)TIM3->CNT;
    while ((uint16_t)((uint16_t)TIM3->CNT - start) < us) { }
}

/* ---- Interrupt handlers --------------------------------------------------- */

void TIM2_IRQHandler(void) {
    if ((TIM2->SR & TIM_SR_UIF) != 0U) {
        TIM2->SR = ~TIM_SR_UIF;     /* write 0 to UIF to clear it, and leave the other flags alone */
        g_tick10ms++;
        log_event(g_exti_active ? EV_TIM2_NESTED : EV_TIM2_TICK);
    }
}

void EXTI0_IRQHandler(void) {
    if ((EXTI->PR & EXTI_PR_PR0) != 0U) {
        EXTI->PR = EXTI_PR_PR0;     /* clear the pending bit: rc_w1, write 1 */
        g_exti_active = 1U;
        log_event(EV_EXTI_ENTER);
        busy_wait_us(EXTI_BUSY_US); /* long work at low priority: TIM2 can interrupt this */
        log_event(EV_EXTI_EXIT);
        g_exti_active = 0U;
    }
}

/* ---- Setup ------------------------------------------------------------------ */

static void button_exti_start(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN | RCC_APB2ENR_AFIOEN;
    /* PB0 is an input with a pull-up. The button pulls it to GND, so a press is a falling edge. */
    GPIOB->CRL = (GPIOB->CRL & ~0xFU) | CFG_INPUT_PULLUP;
    GPIOB->ODR |= (1U << 0);

    AFIO->EXTICR[0] = AFIO_EXTICR1_EXTI0_PB;   /* route PB0 to EXTI line 0 */
    EXTI->FTSR |= EXTI_FTSR_TR0;               /* falling edge */
    EXTI->IMR  |= EXTI_IMR_IM0;                /* unmask line 0 */
    EXTI->PR    = EXTI_PR_PR0;                 /* clear any stale pending bit */
}

static void nvic_start(void) {
    NVIC_SetPriorityGrouping(PRIO_GROUP);
    NVIC_SetPriority(TIM2_IRQn,  NVIC_EncodePriority(PRIO_GROUP, PRIO_TIM2, 0U));
    NVIC_SetPriority(EXTI0_IRQn, NVIC_EncodePriority(PRIO_GROUP, PRIO_EXTI0, 0U));
    NVIC_EnableIRQ(TIM2_IRQn);
    NVIC_EnableIRQ(EXTI0_IRQn);
}

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    tim3_stopwatch_start();

    /* Set the priorities before the sources can fire: a button press during setup must not
     * run at the wrong priority. */
    nvic_start();
    button_exti_start();
    tim2_tick_start();

    uart_puts("NVIC group=3 TIM2 prio=");
    uart_put_uint(NVIC_GetPriority(TIM2_IRQn));
    uart_puts(" EXTI0 prio=");
    uart_put_uint(NVIC_GetPriority(EXTI0_IRQn));
    uart_puts("\r\nPress the button (PB0)\r\n");

    while (1) {
        drain_log();
        busy_wait_us(20000U);       /* poll the log every 20 ms; never block the ISRs */
    }
}
