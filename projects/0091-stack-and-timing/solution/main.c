// EXPECT: STACK OK
/* Lesson 91: measuring execution time and stack use of FreeRTOS tasks on the Blue Pill.
 *
 *   fast_task    priority 3, period 10 ms (vTaskDelayUntil), does about 1 ms of work
 *   slow_task    priority 2, period 100 ms, does more work
 *   report_task  priority 1, once a second: prints each task's worst execution time (TIM2 in
 *                microseconds) and its stack high-water mark
 *
 * Priorities follow rate-monotonic order: the shorter the period, the higher the priority.
 *
 * The timer is TIM2, a free-running 16-bit counter at 1 MHz. DWT_CYCCNT would also work on a
 * Cortex-M3. The lesson uses TIM2, a plain peripheral counter, so the measurement does not depend on how a simulator models DWT. */
#include <stdbool.h>
#include <stdint.h>
#include "stm32f1xx.h"
#include "FreeRTOS.h"
#include "task.h"

#define UART_BAUD          115200U
#define TIMER_TICKS_PER_US 1U       /* the TIM2 prescaler gives 1 count per microsecond */
#define FAST_PERIOD_MS     10U
#define SLOW_PERIOD_MS     100U
#define REPORT_PERIOD_MS   1000U
#define FAST_WORK_LOOPS    300U     /* loop counts, not time: the report shows the real time */
#define SLOW_WORK_LOOPS    3000U
#define FAST_STACK_WORDS   128U
#define SLOW_STACK_WORDS   128U
#define REPORT_STACK_WORDS 160U
/* Warn if a task has ever had fewer free words than this. 16 words = 64 bytes of margin. */
#define STACK_MARGIN_WORDS 16U

static TaskHandle_t fast_handle;
static TaskHandle_t slow_handle;
static TaskHandle_t report_handle;
static volatile uint32_t fast_max_us;
static volatile uint32_t slow_max_us;

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull */
    USART1->BRR = SystemCoreClock / UART_BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

static void uart_put_u32(uint32_t v) {
    char buf[11];
    char *p = &buf[sizeof buf - 1];
    *p = '\0';
    do {
        *--p = (char)('0' + v % 10U);
        v /= 10U;
    } while (v != 0U);
    uart_puts(p);
}

static void timer_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_TIM2EN;
    /* Divide the timer clock so that one count is one microsecond, whatever SystemCoreClock is. */
    TIM2->PSC = (SystemCoreClock / 1000000U) * TIMER_TICKS_PER_US - 1U;
    TIM2->ARR = 0xFFFFU;
    TIM2->CR1 = TIM_CR1_CEN;
}

/* CPU work with a volatile accumulator, so the compiler cannot delete the loop. */
static void do_work(uint32_t loops) {
    volatile uint32_t acc = 0U;
    for (uint32_t i = 0U; i < loops; i++) {
        acc += i;
    }
}

/* Run the work and keep the worst elapsed time. The 16-bit subtraction is correct across a
 * counter wrap as long as one measurement is shorter than 65 ms. */
static void timed_work(uint32_t loops, volatile uint32_t *max_us) {
    uint16_t start = (uint16_t)TIM2->CNT;
    do_work(loops);
    uint32_t elapsed = (uint16_t)((uint16_t)TIM2->CNT - start);
    if (elapsed > *max_us) {
        *max_us = elapsed;
    }
}

static void fast_task(void *arg) {
    (void)arg;
    TickType_t last_wake = xTaskGetTickCount();
    for (;;) {
        timed_work(FAST_WORK_LOOPS, &fast_max_us);
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(FAST_PERIOD_MS));
    }
}

static void slow_task(void *arg) {
    (void)arg;
    TickType_t last_wake = xTaskGetTickCount();
    for (;;) {
        timed_work(SLOW_WORK_LOOPS, &slow_max_us);
        vTaskDelayUntil(&last_wake, pdMS_TO_TICKS(SLOW_PERIOD_MS));
    }
}

/* Print one task's numbers. Returns false if its stack margin has ever been too small. */
static bool report_one(const char *name, TaskHandle_t h, uint32_t depth_words, uint32_t max_us) {
    /* uxTaskGetStackHighWaterMark returns the fewest words that were ever free. */
    UBaseType_t free_words = uxTaskGetStackHighWaterMark(h);
    uint32_t used_words = depth_words - free_words;

    uart_puts("  ");
    uart_puts(name);
    uart_puts(" stack used=");
    uart_put_u32(used_words * 4U);
    uart_puts(" B, free=");
    uart_put_u32(free_words * 4U);
    uart_puts(" B, worst=");
    uart_put_u32(max_us);
    uart_puts(" us\r\n");
    return free_words >= STACK_MARGIN_WORDS;
}

static bool report_all(void) {
    /* The report task is not timed here: it runs at the lowest priority, so it cannot delay the others. */
    bool ok = true;
    ok = report_one("fast  ", fast_handle, FAST_STACK_WORDS, fast_max_us) && ok;
    ok = report_one("slow  ", slow_handle, SLOW_STACK_WORDS, slow_max_us) && ok;
    ok = report_one("report", report_handle, REPORT_STACK_WORDS, 0U) && ok;
    return ok;
}

static void report_task(void *arg) {
    (void)arg;
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(REPORT_PERIOD_MS));
        bool ok = report_all();
        uart_puts(ok ? "STACK OK: every task keeps a margin\r\n" : "STACK LOW: a task is close to overflow\r\n");
    }
}

void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    timer_init();

    xTaskCreate(fast_task, "fast", FAST_STACK_WORDS, NULL, 3U, &fast_handle);
    xTaskCreate(slow_task, "slow", SLOW_STACK_WORDS, NULL, 2U, &slow_handle);
    xTaskCreate(report_task, "report", REPORT_STACK_WORDS, NULL, 1U, &report_handle);
    vTaskStartScheduler();
    for (;;) {}
}
