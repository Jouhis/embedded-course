/* hal_bluepill.c: the STM32F103C8 Blue Pill implementation of hal.h, on FreeRTOS (Lab 5).
 *
 *   LED           PC13, active low (the on-board LED)
 *   Button A      PB12, to GND, internal pull-up, falling edge on EXTI12
 *   Button B      PB13, to GND, internal pull-up, falling edge on EXTI13
 *   I2C1 SCL/SDA  PB6 / PB7 (the default I2C1 pins)
 *   USART1 TX     PA9, 115200 baud (serial log)
 *
 * Timekeeping: FreeRTOS owns SysTick (its handler is SysTick_Handler, see FreeRTOSConfig.h).
 * The HAL needs HAL_GetTick() for its I2C and UART timeouts, so vApplicationTickHook() calls
 * HAL_IncTick() once per tick. hal_millis() is the FreeRTOS tick count. */
#include <string.h>
#include "FreeRTOS.h"
#include "task.h"
#include "hal.h"
#include "stm32f1xx_hal.h"

#define LED_PORT       GPIOC
#define LED_PIN        GPIO_PIN_13
#define BTN_PORT       GPIOB
#define BTN_A_PIN      GPIO_PIN_12
#define BTN_B_PIN      GPIO_PIN_13
#define I2C_TIMEOUT_MS 100U
#define UART_TIMEOUT_MS 100U
/* Must not be higher than configMAX_SYSCALL_INTERRUPT_PRIORITY (5). A larger number is a
 * lower urgency, so 5 is the most urgent priority that may call FromISR functions. */
#define BUTTON_IRQ_PRIORITY 5U

static I2C_HandleTypeDef hi2c1;
static UART_HandleTypeDef huart1;
static hal_button_callback_t button_callback;

/* Runs once per FreeRTOS tick, from xPortSysTickHandler(). Keeps HAL timeouts counting. */
void vApplicationTickHook(void) {
    HAL_IncTick();
}

void hal_init(void) {
    HAL_Init();

    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    __HAL_RCC_USART1_CLK_ENABLE();
    __HAL_RCC_I2C1_CLK_ENABLE();
    __HAL_RCC_AFIO_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};

    /* LED: push-pull output, off (active low, so the pin is high). */
    g.Pin = LED_PIN;
    g.Mode = GPIO_MODE_OUTPUT_PP;
    g.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(LED_PORT, &g);
    HAL_GPIO_WritePin(LED_PORT, LED_PIN, GPIO_PIN_SET);

    /* Buttons: falling-edge interrupts with the internal pull-up. A press pulls the pin low. */
    g.Pin = BTN_A_PIN | BTN_B_PIN;
    g.Mode = GPIO_MODE_IT_FALLING;
    g.Pull = GPIO_PULLUP;
    HAL_GPIO_Init(BTN_PORT, &g);
    HAL_NVIC_SetPriority(EXTI15_10_IRQn, BUTTON_IRQ_PRIORITY, 0U);
    HAL_NVIC_EnableIRQ(EXTI15_10_IRQn);

    /* USART1 TX: alternate-function push-pull. */
    g.Pin = GPIO_PIN_9;
    g.Mode = GPIO_MODE_AF_PP;
    g.Pull = GPIO_NOPULL;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &g);

    huart1.Instance = USART1;
    huart1.Init.BaudRate = 115200;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    HAL_UART_Init(&huart1);

    /* I2C1 pins: alternate-function open-drain. The 4.7 kOhm pull-ups are on the board wiring. */
    g.Pin = GPIO_PIN_6 | GPIO_PIN_7;
    g.Mode = GPIO_MODE_AF_OD;
    g.Pull = GPIO_NOPULL;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOB, &g);

    hi2c1.Instance = I2C1;
    hi2c1.Init.ClockSpeed = 100000;          /* standard mode, 100 kHz */
    hi2c1.Init.DutyCycle = I2C_DUTYCYCLE_2;
    hi2c1.Init.OwnAddress1 = 0;
    hi2c1.Init.AddressingMode = I2C_ADDRESSINGMODE_7BIT;
    hi2c1.Init.DualAddressMode = I2C_DUALADDRESS_DISABLE;
    hi2c1.Init.GeneralCallMode = I2C_GENERALCALL_DISABLE;
    hi2c1.Init.NoStretchMode = I2C_NOSTRETCH_DISABLE;
    HAL_I2C_Init(&hi2c1);
}

void hal_set_button_callback(hal_button_callback_t callback) {
    button_callback = callback;
}

void hal_gpio_write(hal_pin_t pin, uint8_t on) {
    if (pin == HAL_PIN_LED) {
        /* Active low: drive the pin low to light the LED. */
        HAL_GPIO_WritePin(LED_PORT, LED_PIN, on ? GPIO_PIN_RESET : GPIO_PIN_SET);
    }
}

/* EXTI lines 10 to 15 share this handler. PB12 is EXTI12 and PB13 is EXTI13. */
void EXTI15_10_IRQHandler(void) {
    int woken = 0;
    /* TODO(learner): for each button line, check its pending flag with __HAL_GPIO_EXTI_GET_IT().
     * If it is set, clear it with __HAL_GPIO_EXTI_CLEAR_IT() (clear first, or the interrupt
     * repeats), then call button_callback(pin) and OR its result into woken. Pass
     * HAL_PIN_BTN_A for BTN_A_PIN and HAL_PIN_BTN_B for BTN_B_PIN. */
    (void)button_callback;
    portYIELD_FROM_ISR(woken);                   /* switch now if the press woke a more urgent task */
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    /* ST's HAL takes the 7-bit address shifted left by one, for reads and writes alike.
     * It sets the R/W bit itself (I2C_7BIT_ADD_READ / _WRITE in stm32f1xx_hal_i2c.h). */
    if (len > 0xFFFFU) {
        return -1;
    }
    return (HAL_I2C_Master_Transmit(&hi2c1, (uint16_t)(addr7 << 1), (uint8_t *)data,
                                    (uint16_t)len, I2C_TIMEOUT_MS) == HAL_OK) ? 0 : -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    if (len > 0xFFFFU) {
        return -1;
    }
    return (HAL_I2C_Master_Receive(&hi2c1, (uint16_t)(addr7 << 1), data,
                                   (uint16_t)len, I2C_TIMEOUT_MS) == HAL_OK) ? 0 : -1;
}

uint32_t hal_millis(void) {
    return (uint32_t)xTaskGetTickCount();
}

void hal_log(const char *line) {
    HAL_UART_Transmit(&huart1, (uint8_t *)line, (uint16_t)strlen(line), UART_TIMEOUT_MS);
    HAL_UART_Transmit(&huart1, (uint8_t *)"\r\n", 2U, UART_TIMEOUT_MS);
}
