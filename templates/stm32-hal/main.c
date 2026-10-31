/* Blink + UART using the STM32 HAL on the Blue Pill (8 MHz HSI clock).
 * LED: PC13 (active low). Serial: USART1 TX on PA9, 115200 baud. */
#include <string.h>
#include "stm32f1xx_hal.h"

static UART_HandleTypeDef huart1;

void SysTick_Handler(void) { HAL_IncTick(); }   /* HAL's millisecond time base */

static void uart_print(const char *s) {
    HAL_UART_Transmit(&huart1, (uint8_t *)s, (uint16_t)strlen(s), HAL_MAX_DELAY);
}

int main(void) {
    HAL_Init();

    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    __HAL_RCC_USART1_CLK_ENABLE();

    GPIO_InitTypeDef led = { .Pin = GPIO_PIN_13, .Mode = GPIO_MODE_OUTPUT_PP,
                             .Pull = GPIO_NOPULL, .Speed = GPIO_SPEED_FREQ_LOW };
    HAL_GPIO_Init(GPIOC, &led);

    GPIO_InitTypeDef tx = { .Pin = GPIO_PIN_9, .Mode = GPIO_MODE_AF_PP,
                            .Speed = GPIO_SPEED_FREQ_HIGH };
    HAL_GPIO_Init(GPIOA, &tx);

    huart1.Instance = USART1;
    huart1.Init.BaudRate = 115200;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    HAL_UART_Init(&huart1);

    while (1) {
        HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
        uart_print(HAL_GPIO_ReadPin(GPIOC, GPIO_PIN_13) ? "LED off\r\n" : "LED on\r\n");
        HAL_Delay(500);
    }
}
