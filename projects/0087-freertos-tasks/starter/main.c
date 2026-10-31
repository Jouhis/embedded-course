/* Lesson 87: tasks, priorities and two delay styles on the Blue Pill.
 *
 *   blink_task   priority 2, vTaskDelayUntil() every 500 ms: toggles the on-board LED (PC13)
 *   report_task  priority 1, vTaskDelay() every 1000 ms: prints the tick count over USART1 (PA9)
 *
 * The idle task (priority 0) is created by the kernel and runs whenever no task is ready. */
#include <stdint.h>
#include "stm32f1xx.h"
#include "FreeRTOS.h"
#include "task.h"

#define BLINK_PERIOD_MS   500U
#define REPORT_PERIOD_MS  1000U
#define BLINK_PRIORITY    2U      /* higher number = more urgent in FreeRTOS */
#define REPORT_PRIORITY   1U
#define UART_BAUD         115200U
#define TASK_STACK_WORDS  128U    /* words, not bytes: 128 words = 512 bytes on the Cortex-M3 */

static volatile uint32_t toggles;  /* written by blink_task, read by report_task */

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

/* Print an unsigned number without printf, which pulls in a large library on this target. */
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

static void blink_task(void *arg) {
    (void)arg;
    /* TODO(learner): replace the vTaskDelay below with vTaskDelayUntil(&last_wake, ...), so the
     * wake-up times stay at 0, 500, 1000 ms regardless of how long the toggle takes. */
    TickType_t last_wake = xTaskGetTickCount();
    (void)last_wake;
    for (;;) {
        GPIOC->ODR ^= GPIO_ODR_ODR13;
        toggles++;
        vTaskDelay(pdMS_TO_TICKS(1U));   /* placeholder: wrong period on purpose */
    }
}

static void report_task(void *arg) {
    (void)arg;
    for (;;) {
        /* TODO(learner): print "TASKS OK" here once blink_task has toggled the LED. */
        uart_puts("tick=");
        uart_put_u32(xTaskGetTickCount());          /* ticks at configTICK_RATE_HZ = 1000, so ms */
        uart_puts(" toggles=");
        uart_put_u32(toggles);
        uart_puts("\r\n");
        /* vTaskDelay is relative: the next wake-up is one period after this call returns. */
        vTaskDelay(pdMS_TO_TICKS(REPORT_PERIOD_MS));
    }
}

void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << 20)) | (0x2U << 20);   /* PC13: output */

    xTaskCreate(blink_task, "blink", TASK_STACK_WORDS, NULL, BLINK_PRIORITY, NULL);
    xTaskCreate(report_task, "report", TASK_STACK_WORDS, NULL, REPORT_PRIORITY, NULL);
    vTaskStartScheduler();
    for (;;) {}   /* only reached if the heap was too small for the idle task */
}
