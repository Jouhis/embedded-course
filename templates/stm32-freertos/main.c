/* Two FreeRTOS tasks on the Blue Pill: one blinks PC13, one prints over USART1 (PA9). */
#include "stm32f1xx.h"
#include "FreeRTOS.h"
#include "task.h"

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_USART1EN;
    GPIOA->CRH = (GPIOA->CRH & ~(0xFU << 4)) | (0xBU << 4);   /* PA9: AF push-pull */
    USART1->BRR = SystemCoreClock / 115200U;
    USART1->CR1 = USART_CR1_TE | USART_CR1_UE;
}

static void uart_puts(const char *s) {
    while (*s) {
        while ((USART1->SR & USART_SR_TXE) == 0) { }
        USART1->DR = (uint8_t)*s++;
    }
}

static void blink_task(void *arg) {
    (void)arg;
    for (;;) {
        GPIOC->ODR ^= GPIO_ODR_ODR13;
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}

static void hello_task(void *arg) {
    (void)arg;
    for (;;) {
        uart_puts("Hello from a FreeRTOS task\r\n");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void vApplicationStackOverflowHook(TaskHandle_t t, char *name) { (void)t; (void)name; for (;;) {} }
void vApplicationMallocFailedHook(void) { for (;;) {} }

int main(void) {
    SystemCoreClockUpdate();
    uart_init();
    RCC->APB2ENR |= RCC_APB2ENR_IOPCEN;
    GPIOC->CRH = (GPIOC->CRH & ~(0xFU << 20)) | (0x2U << 20);  /* PC13: output */

    xTaskCreate(blink_task, "blink", 128, NULL, 1, NULL);
    xTaskCreate(hello_task, "hello", 256, NULL, 1, NULL);
    vTaskStartScheduler();
    for (;;) {}   /* Only reached if there was not enough heap for the scheduler */
}
