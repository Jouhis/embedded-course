/* Bench lab 15: measure your deadlines. Three periodic FreeRTOS tasks on the NUCLEO-U545RE-Q,
 * each holding its own pin high while it runs, so a logic analyzer draws the schedule.
 *
 *   task      period   work (busy, timed with DWT_CYCCNT)     pin (ST morpho header, UM3062)
 *   control    5 ms    1 ms                                    PA6  CN10 pin 13
 *   sensor    20 ms    4 ms                                    PA7  CN10 pin 15
 *   logger    50 ms    8 ms, 16 ms while B1 is held ("load")   PC8  CN10 pin 33
 *   (idle)                                                     PC6  CN10 pin 19, toggled by the idle loop
 *
 * Utilization: 1/5 + 4/20 + 8/50 = 0.56, and 0.72 under load. Both are below the rate-monotonic
 * bound for three tasks, 3 x (2^(1/3) - 1) = 0.780 (lesson 93), so with rate-monotonic priorities
 * (shorter period, higher priority) every deadline is met. Each task's deadline is its period:
 * xTaskDelayUntil() returns pdFALSE when the next release time has already passed, which this
 * program counts as a miss. Once a second the report on the ST-LINK's VCP prints the counts.
 *
 * Clock: MSIS 4 MHz from reset; the FreeRTOS tick is 1 ms.
 */
// SIM: skip real board only: Wokwi has no STM32U5 model
#include <stdint.h>
#include <stdio.h>
#include "stm32u5xx.h"
#include "FreeRTOS.h"
#include "task.h"

#define TX_PIN          9U      /* PA9, USART1 TX to the ST-LINK VCP */
#define BAUD            115200U
#define BTN_PIN         13U     /* PC13, B1: high while pressed */
#define IDLE_PIN        6U      /* PC6 */

/* Rate-monotonic order: the shorter the period, the higher the priority. */
#define PRIO_CONTROL    4U
#define PRIO_SENSOR     3U
#define PRIO_LOGGER     2U
#define PRIO_REPORT     1U

typedef struct {
    const char *name;
    GPIO_TypeDef *port;
    uint32_t pin;
    uint32_t period_ms;
    uint32_t work_us;
    uint32_t load_work_us;      /* work while B1 is held */
    volatile uint32_t runs;
    volatile uint32_t misses;
} periodic_t;

static periodic_t control = { "control", GPIOA, 6U, 5U, 1000U, 1000U, 0U, 0U };
static periodic_t sensor  = { "sensor",  GPIOA, 7U, 20U, 4000U, 4000U, 0U, 0U };
static periodic_t logger  = { "logger",  GPIOC, 8U, 50U, 8000U, 16000U, 0U, 0U };

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
    return len;
}

static void output_pin(GPIO_TypeDef *port, uint32_t pin) {
    port->BSRR = 1U << (pin + 16U);
    port->MODER = (port->MODER & ~(3U << (pin * 2U))) | (1U << (pin * 2U));
    port->OSPEEDR |= 3U << (pin * 2U);
}

/* Spin for us microseconds of CPU time. The cycle counter keeps running while this task is
 * preempted, so the loop counts only the cycles it got: it stops the counting while others run.
 * On the analyzer a preempted task's pin stays high across the gap, so the high time is the
 * response time, not the execution time. */
static void work(uint32_t us) {
    uint32_t left = us * (SystemCoreClock / 1000000U);
    uint32_t last = DWT->CYCCNT;
    while (left > 0U) {
        uint32_t now = DWT->CYCCNT;
        uint32_t step = now - last;
        last = now;
        if (step > 1000U) {
            step = 0U;            /* a jump this big means we were preempted: those cycles weren't ours */
        }
        left = (step >= left) ? 0U : left - step;
    }
}

static void periodic_task(void *arg) {
    periodic_t *t = arg;
    TickType_t release = xTaskGetTickCount();
    for (;;) {
        t->port->BSRR = 1U << t->pin;
        uint32_t loaded = (GPIOC->IDR >> BTN_PIN) & 1U;
        work(loaded ? t->load_work_us : t->work_us);
        t->runs++;
        t->port->BSRR = 1U << (t->pin + 16U);
        if (xTaskDelayUntil(&release, pdMS_TO_TICKS(t->period_ms)) == pdFALSE) {
            t->misses++;          /* the next release was already in the past: deadline missed */
        }
    }
}

static void report_task(void *arg) {
    (void)arg;
    TickType_t release = xTaskGetTickCount();
    for (;;) {
        vTaskDelayUntil(&release, pdMS_TO_TICKS(1000U));
        printf("BENCH15 %s: control %lu/%lu missed, sensor %lu/%lu, logger %lu/%lu\n",
               ((GPIOC->IDR >> BTN_PIN) & 1U) ? "LOAD" : "idle",
               (unsigned long)control.misses, (unsigned long)control.runs,
               (unsigned long)sensor.misses, (unsigned long)sensor.runs,
               (unsigned long)logger.misses, (unsigned long)logger.runs);
    }
}

/* The idle task runs when no other task is ready: PC6 toggles fast while the CPU has spare time. */
void vApplicationIdleHook(void) {
    GPIOC->BSRR = (GPIOC->ODR & (1U << IDLE_PIN)) ? (1U << (IDLE_PIN + 16U)) : (1U << IDLE_PIN);
}

void vApplicationStackOverflowHook(TaskHandle_t task, char *name) {
    (void)task;
    printf("BENCH15 stack overflow in %s\n", name);
    for (;;) { }
}

void vApplicationMallocFailedHook(void) {
    printf("BENCH15 heap exhausted\n");
    for (;;) { }
}

int main(void) {
    SystemCoreClockUpdate();
    RCC->AHB2ENR1 |= RCC_AHB2ENR1_GPIOAEN | RCC_AHB2ENR1_GPIOCEN;
    (void)RCC->AHB2ENR1;
    uart_init();
    output_pin(GPIOA, control.pin);
    output_pin(GPIOA, sensor.pin);
    output_pin(GPIOC, logger.pin);
    output_pin(GPIOC, IDLE_PIN);
    GPIOC->MODER &= ~(3U << (BTN_PIN * 2U));                                   /* B1: input */
    GPIOC->PUPDR = (GPIOC->PUPDR & ~(3U << (BTN_PIN * 2U))) | (2U << (BTN_PIN * 2U));   /* pull-down */

    DCB->DEMCR |= DCB_DEMCR_TRCENA_Msk;            /* the DWT needs trace enabled */
    DWT->CYCCNT = 0U;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

    printf("BENCH15 ready at %lu Hz: capture PA6, PA7, PC8, PC6; hold B1 for load\n",
           (unsigned long)SystemCoreClock);
    xTaskCreate(periodic_task, "control", 160U, &control, PRIO_CONTROL, NULL);
    xTaskCreate(periodic_task, "sensor", 160U, &sensor, PRIO_SENSOR, NULL);
    xTaskCreate(periodic_task, "logger", 160U, &logger, PRIO_LOGGER, NULL);
    xTaskCreate(report_task, "report", 320U, NULL, PRIO_REPORT, NULL);
    vTaskStartScheduler();
    for (;;) { }
}
