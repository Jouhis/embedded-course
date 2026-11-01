/* Lesson 90: priority inversion, shown with a binary semaphore, then fixed with a mutex.
 *
 *   low   (priority 1) takes the shared resource and holds it for 200 ms (wall-clock time)
 *   medium(priority 2) starts at 20 ms and burns 300 ms of CPU; it never touches the resource
 *   high  (priority 3) starts at 50 ms and needs the resource for 10 ms
 *
 * The expected timeline (ticks are milliseconds): phase 1 gives high a wait of about 270 ms
 * (it ends when medium finishes at 320 ms); phase 2 gives about 150 ms (low finishes at 200 ms).
 *
 * Phase 1 uses a binary semaphore as the lock. Medium preempts low while low holds the lock,
 * so high waits for medium's whole run: that is priority inversion.
 * Phase 2 uses a mutex. Its priority inheritance raises low to priority 3 while high waits,
 * so medium cannot preempt low and high waits only for low's own critical section.
 *
 * Tasks never print. They record events with the tick count, and the controller prints the
 * timeline after each phase, so printing does not change the timing. */
#include <stdbool.h>
#include <stdint.h>
#include "stm32f1xx.h"
#include "FreeRTOS.h"
#include "semphr.h"
#include "task.h"

#define UART_BAUD          115200U
#define TASK_STACK_WORDS   160U
#define LOW_WORK_MS        200U   /* low's critical section, measured in elapsed ticks (burn_ms busy-waits) */
#define MEDIUM_START_MS    20U
#define MEDIUM_WORK_MS     300U
#define HIGH_START_MS      50U
#define HIGH_WORK_MS       10U
#define MAX_EVENTS         16U
#define TASKS_PER_PHASE    3U

typedef struct {
    uint32_t tick;
    char     who;      /* 'L', 'M' or 'H' */
    const char *what;
} event_t;

static SemaphoreHandle_t resource;      /* the lock under test: binary semaphore, then mutex */
static SemaphoreHandle_t phase_done;    /* counting: each task gives once when it finishes */
static event_t events[MAX_EVENTS];
static uint32_t event_count;
static uint32_t high_wait_ms;

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

/* Record one event. The critical section keeps the index update safe if a tick switches tasks. */
static void record(char who, const char *what) {
    taskENTER_CRITICAL();
    if (event_count < MAX_EVENTS) {
        events[event_count].tick = xTaskGetTickCount();
        events[event_count].who = who;
        events[event_count].what = what;
        event_count++;
    }
    taskEXIT_CRITICAL();
}

/* Burn CPU for ms milliseconds. Busy-waiting keeps the task Ready, so a higher priority
 * task can preempt it, which is what makes the inversion visible. */
static void burn_ms(uint32_t ms) {
    TickType_t start = xTaskGetTickCount();
    while ((xTaskGetTickCount() - start) < ms) { }
}

static void low_task(void *arg) {
    (void)arg;
    record('L', "start");
    xSemaphoreTake(resource, portMAX_DELAY);
    record('L', "got lock");
    burn_ms(LOW_WORK_MS);
    record('L', "release");
    xSemaphoreGive(resource);
    xSemaphoreGive(phase_done);
    vTaskDelete(NULL);
}

static void medium_task(void *arg) {
    (void)arg;
    vTaskDelay(pdMS_TO_TICKS(MEDIUM_START_MS));
    record('M', "start (no lock)");
    burn_ms(MEDIUM_WORK_MS);
    record('M', "done");
    xSemaphoreGive(phase_done);
    vTaskDelete(NULL);
}

static void high_task(void *arg) {
    (void)arg;
    vTaskDelay(pdMS_TO_TICKS(HIGH_START_MS));
    TickType_t requested = xTaskGetTickCount();
    record('H', "wants lock");
    xSemaphoreTake(resource, portMAX_DELAY);
    high_wait_ms = xTaskGetTickCount() - requested;
    record('H', "got lock");
    burn_ms(HIGH_WORK_MS);
    record('H', "release");
    xSemaphoreGive(resource);
    xSemaphoreGive(phase_done);
    vTaskDelete(NULL);
}

static void print_timeline(const char *name) {
    uart_puts(name);
    uart_puts("\r\n");
    for (uint32_t i = 0U; i < event_count; i++) {
        uart_puts("  t=");
        uart_put_u32(events[i].tick);
        uart_puts(" ");
        uart_puts((events[i].who == 'L') ? "low   " : (events[i].who == 'M') ? "medium" : "high  ");
        uart_puts(" ");
        uart_puts(events[i].what);
        uart_puts("\r\n");
    }
    uart_puts("  high waited ");
    uart_put_u32(high_wait_ms);
    uart_puts(" ms\r\n");
}

/* Run one phase: create the lock, start the three tasks, wait for all three to finish. */
static void run_phase(const char *name, bool use_mutex) {
    event_count = 0U;
    high_wait_ms = 0U;
    /* A binary semaphore starts empty, so it must be given once to be available.
     * A mutex is available when created and also records its owner. */
    if (use_mutex) {
        /* TODO(learner): phase 2 must use a mutex, so priority inheritance applies. This line
         * is a binary semaphore on purpose, so the starter still shows the inversion. Replace
         * it with resource = xSemaphoreCreateMutex() and delete the give on the next line, since
         * a mutex is available as soon as it is created. Then the output ends with "PI FIXED". */
        resource = xSemaphoreCreateBinary();
        xSemaphoreGive(resource);
    } else {
        resource = xSemaphoreCreateBinary();
        xSemaphoreGive(resource);
    }
    xTaskCreate(low_task, "low", TASK_STACK_WORDS, NULL, 1U, NULL);
    xTaskCreate(medium_task, "medium", TASK_STACK_WORDS, NULL, 2U, NULL);
    xTaskCreate(high_task, "high", TASK_STACK_WORDS, NULL, 3U, NULL);
    for (uint32_t i = 0U; i < TASKS_PER_PHASE; i++) {
        xSemaphoreTake(phase_done, portMAX_DELAY);
    }
    print_timeline(name);
    vSemaphoreDelete(resource);
}

static void controller_task(void *arg) {
    (void)arg;
    phase_done = xSemaphoreCreateCounting(TASKS_PER_PHASE, 0U);

    run_phase("PHASE 1: binary semaphore (no inheritance)", false);
    uint32_t waited_semaphore = high_wait_ms;

    run_phase("PHASE 2: mutex (priority inheritance)", true);
    uint32_t waited_mutex = high_wait_ms;

    uart_puts(waited_mutex < waited_semaphore ? "PI FIXED" : "PI NOT FIXED");
    uart_puts(": high waited ");
    uart_put_u32(waited_semaphore);
    uart_puts(" ms with a binary semaphore, ");
    uart_put_u32(waited_mutex);
    uart_puts(" ms with a mutex\r\n");
    vTaskDelete(NULL);
}

static void uart_boot_check(void) { uart_puts("PI demo start\r\n"); }

void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    uart_boot_check();
    /* The controller is the highest priority so it runs first and waits for each phase. */
    xTaskCreate(controller_task, "ctrl", TASK_STACK_WORDS, NULL, 4U, NULL);
    vTaskStartScheduler();
    for (;;) {}
}
