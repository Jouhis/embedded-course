/* Lesson 90: queues, a binary semaphore given from an interrupt, and a log task.
 *
 *   producer_task  sends three numbers into work_queue, 200 ms apart (queue, task to task)
 *   consumer_task  receives them and prints; prints "QUEUE OK" after the third
 *   button_task    waits on button_sem; the EXTI interrupt on PB12 gives it (ISR to task)
 *
 * The UART is shared by consumer_task and button_task, so every print takes uart_mutex.
 * Lesson 91 explains why that is a mutex and not a binary semaphore. */
#include <stdint.h>
#include "stm32f1xx.h"
#include "FreeRTOS.h"
#include "queue.h"
#include "semphr.h"
#include "task.h"

#define UART_BAUD         115200U
#define TASK_STACK_WORDS  160U
#define WORK_QUEUE_LEN    4U      /* items, not bytes */
#define DEMO_ITEMS        3U
#define PRODUCER_GAP_MS   200U
#define BUTTON_PIN        12U     /* PB12, active low, internal pull-up (same as Lab 4) */
/* The NVIC priority of an ISR that calls a FromISR API must be at or below
 * configMAX_SYSCALL_INTERRUPT_PRIORITY, which the template sets to 5 (FreeRTOSConfig.h).
 * CMSIS stores the priority in the top four bits, so 5 is written as 5 << 4. */
#define BUTTON_IRQ_PRIORITY 5U

static QueueHandle_t work_queue;
static SemaphoreHandle_t button_sem;
static SemaphoreHandle_t uart_mutex;

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull */
    USART1->BRR = SystemCoreClock / UART_BAUD;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

/* Caller must hold uart_mutex. */
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

static void log_line(const char *text, uint32_t value) {
    xSemaphoreTake(uart_mutex, portMAX_DELAY);
    uart_puts(text);
    uart_put_u32(value);
    uart_puts("\r\n");
    xSemaphoreGive(uart_mutex);
}

static void producer_task(void *arg) {
    (void)arg;
    for (uint32_t i = 1U; i <= DEMO_ITEMS; i++) {
        /* The queue copies the item, so passing &i is safe even though i changes next. */
        xQueueSend(work_queue, &i, portMAX_DELAY);
        vTaskDelay(pdMS_TO_TICKS(PRODUCER_GAP_MS));
    }
    for (;;) {
        vTaskDelay(pdMS_TO_TICKS(1000U));   /* the demo is over; park the task */
    }
}

static void consumer_task(void *arg) {
    (void)arg;
    for (;;) {
        uint32_t item = 0U;
        xQueueReceive(work_queue, &item, portMAX_DELAY);   /* blocks: no CPU while the queue is empty */
        log_line("QUEUE item=", item);
        /* TODO(learner): when item == DEMO_ITEMS, print "QUEUE OK" with the same mutex
         * pattern as log_line(). Then the solution's EXPECT line matches. */
    }
}

static void button_task(void *arg) {
    (void)arg;
    uint32_t presses = 0U;
    for (;;) {
        xSemaphoreTake(button_sem, portMAX_DELAY);   /* the ISR gives this once per press */
        presses++;
        log_line("BUTTON pressed n=", presses);
    }
}

/* EXTI line 12 (PB12). Runs in interrupt context: no printing, no blocking, only FromISR calls. */
void EXTI15_10_IRQHandler(void) {
    if ((EXTI->PR & EXTI_PR_PR12) != 0U) {
        EXTI->PR = EXTI_PR_PR12;           /* write 1 to clear, or the interrupt fires again forever */
        /* TODO(learner): give button_sem with xSemaphoreGiveFromISR(), passing &woken, then call
         * portYIELD_FROM_ISR(woken). Do not call xSemaphoreGive() here: it is not ISR-safe. */
    }
}

static void button_exti_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPBEN | RCC_APB2ENR_AFIOEN;
    /* PB12: input with pull-up (CNF = 10, MODE = 00, ODR = 1). */
    GPIOB->CRH = (GPIOB->CRH & ~(0xFU << ((BUTTON_PIN - 8U) * 4U))) | (0x8U << ((BUTTON_PIN - 8U) * 4U));
    GPIOB->ODR |= GPIO_ODR_ODR12;
    /* Route EXTI12 to port B (EXTICR4 holds lines 12 to 15, 4 bits each, 0 = port A, 1 = port B). */
    AFIO->EXTICR[3] = (AFIO->EXTICR[3] & ~(0xFU << 0)) | (0x1U << 0);
    EXTI->FTSR |= EXTI_FTSR_TR12;          /* trigger on the falling edge: the press */
    EXTI->IMR |= EXTI_IMR_MR12;            /* unmask line 12 */
    NVIC_SetPriority(EXTI15_10_IRQn, BUTTON_IRQ_PRIORITY);
    NVIC_EnableIRQ(EXTI15_10_IRQn);
}

void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

int main(void) {
    SystemCoreClockUpdate();
    uart_init();

    work_queue = xQueueCreate(WORK_QUEUE_LEN, sizeof(uint32_t));
    button_sem = xSemaphoreCreateBinary();   /* binary: at most one pending press is remembered */
    uart_mutex = xSemaphoreCreateMutex();

    button_exti_init();

    xTaskCreate(button_task, "button", TASK_STACK_WORDS, NULL, 3U, NULL);
    xTaskCreate(consumer_task, "consumer", TASK_STACK_WORDS, NULL, 2U, NULL);
    xTaskCreate(producer_task, "producer", TASK_STACK_WORDS, NULL, 1U, NULL);
    vTaskStartScheduler();
    for (;;) {}
}
