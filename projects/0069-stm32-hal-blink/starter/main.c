/* Two LEDs at different rates, plus a UART message on each button press, using the STM32 HAL.
 *
 *   PC13  onboard LED, active low.                    toggles every 500 ms
 *   PB0   external LED through a resistor, active high toggles every 150 ms
 *   PA0   push button to GND, internal pull-up        pressed = low
 *   PA9   USART1 TX, 115200 baud (to the serial monitor)
 *
 * HAL_Init() starts a 1 ms time base on SysTick, and HAL_GetTick() counts those milliseconds.
 * Each LED has its own deadline, so neither one waits for the other. */
#include <string.h>
#include "stm32f1xx_hal.h"

#define LED_ONBOARD_HALF_MS   500U
#define LED_EXTERNAL_HALF_MS  150U
#define BUTTON_LOCKOUT_MS      20U   /* ignore bounces for 20 ms after a press */

static UART_HandleTypeDef huart1;

/* HAL_Init() starts SysTick, but the tick count advances only when SysTick_Handler calls
 * HAL_IncTick(). Without this definition, the startup file's default handler would catch
 * the first SysTick interrupt and stop the program. */
void SysTick_Handler(void) { HAL_IncTick(); }

/* HAL functions return HAL_StatusTypeDef. Check it: a silent failure here stops the
 * program later, far from its cause. */
static void Error_Handler(void) {
    __disable_irq();
    while (1) { }
}

static void gpio_init(void) {
    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();

    GPIO_InitTypeDef led_onboard = { .Pin = GPIO_PIN_13, .Mode = GPIO_MODE_OUTPUT_PP,
                                     .Pull = GPIO_NOPULL, .Speed = GPIO_SPEED_FREQ_LOW };
    HAL_GPIO_Init(GPIOC, &led_onboard);

    /* TODO(learner) 1: initialise PB0 as a push-pull output, the same way as PC13 above.
     * Its LED is active high, so PB0 high lights it. */

    /* TODO(learner) 2: initialise PA0 as an input with the pull-up. The button pulls the pin
     * to GND when pressed. Use GPIO_MODE_INPUT and GPIO_PULLUP. */
}

static HAL_StatusTypeDef uart_init(void) {
    __HAL_RCC_USART1_CLK_ENABLE();
    GPIO_InitTypeDef tx = { .Pin = GPIO_PIN_9, .Mode = GPIO_MODE_AF_PP, .Speed = GPIO_SPEED_FREQ_HIGH };
    HAL_GPIO_Init(GPIOA, &tx);

    huart1.Instance = USART1;
    huart1.Init.BaudRate = 115200;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX;             /* this lesson only transmits */
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    return HAL_UART_Init(&huart1);
}

static void uart_print(const char *s) {
    HAL_UART_Transmit(&huart1, (uint8_t *)s, (uint16_t)strlen(s), HAL_MAX_DELAY);
}

int main(void) {
    HAL_Init();
    gpio_init();
    if (uart_init() != HAL_OK) {
        Error_Handler();
    }

    uart_print("HAL starter: serial link works\r\n");
    /* TODO(learner) 5: when PB0 blinks and the button prints, print "HAL OK\r\n" here, after the line above. */

    /* Deadlines use the wrap-safe form: (now - deadline) is correct across the 32-bit wrap. */
    uint32_t now;
    uint32_t next_onboard = HAL_GetTick() + LED_ONBOARD_HALF_MS;
    uint32_t next_external = HAL_GetTick() + LED_EXTERNAL_HALF_MS;
    uint32_t last_press = 0U;
    GPIO_PinState last_button = GPIO_PIN_SET;     /* released */

    while (1) {
        now = HAL_GetTick();

        if ((int32_t)(now - next_onboard) >= 0) {
            next_onboard += LED_ONBOARD_HALF_MS;
            HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
        }
        /* TODO(learner) 3: toggle PB0 when its deadline passes, the same way as PC13 above,
         * using next_external and LED_EXTERNAL_HALF_MS. */

        /* TODO(learner) 4: read PA0 and print "button pressed\r\n" on a falling edge, with
         * the lockout. Keep last_button up to date, as the solution's loop does. */

        HAL_Delay(1);                  /* poll about once per millisecond */
    }
}
