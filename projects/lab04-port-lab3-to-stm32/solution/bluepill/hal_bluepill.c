/* hal_bluepill.c: the STM32F103C8 Blue Pill implementation of hal.h.
 *
 *   LED           PC13, active low (the on-board LED)
 *   Button A      PB12, to GND, internal pull-up
 *   Button B      PB13, to GND, internal pull-up
 *   I2C1 SCL/SDA  PB6 / PB7 (the default I2C1 pins, RM0008 alternate function I/O)
 *   USART1 TX     PA9, 115200 baud (serial log)
 *
 * The clock is the default 8 MHz HSI. HAL_Init() starts SysTick at 1 kHz, and
 * SysTick_Handler() calls HAL_IncTick() so that HAL_GetTick() counts milliseconds. */
#include <string.h>
#include "hal.h"
#include "stm32f1xx_hal.h"

#define LED_PORT      GPIOC
#define LED_PIN       GPIO_PIN_13
#define BTN_A_PORT    GPIOB
#define BTN_A_PIN     GPIO_PIN_12
#define BTN_B_PORT    GPIOB
#define BTN_B_PIN     GPIO_PIN_13
#define I2C_TIMEOUT_MS 100U
#define UART_TIMEOUT_MS 100U

static I2C_HandleTypeDef hi2c1;
static UART_HandleTypeDef huart1;

void SysTick_Handler(void) {
    HAL_IncTick();
}

void hal_init(void) {
    HAL_Init();

    __HAL_RCC_GPIOA_CLK_ENABLE();
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOC_CLK_ENABLE();
    __HAL_RCC_USART1_CLK_ENABLE();
    __HAL_RCC_I2C1_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};

    /* LED: push-pull output. Start with the LED off (active low, so the pin is high). */
    g.Pin = LED_PIN;
    g.Mode = GPIO_MODE_OUTPUT_PP;
    g.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(LED_PORT, &g);
    HAL_GPIO_WritePin(LED_PORT, LED_PIN, GPIO_PIN_SET);

    /* Buttons: inputs with the internal pull-up. Pressed reads as 0. */
    g.Pin = BTN_A_PIN | BTN_B_PIN;
    g.Mode = GPIO_MODE_INPUT;
    g.Pull = GPIO_PULLUP;
    HAL_GPIO_Init(BTN_A_PORT, &g);

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

    /* I2C1 pins: alternate-function open-drain. The 4.7 kOhm pull-ups are on the board
     * wiring (see the diagram), because the open-drain bus cannot drive a line high. */
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

void hal_gpio_write(hal_pin_t pin, uint8_t on) {
    if (pin == HAL_PIN_LED) {
        /* Active low: drive the pin low to light the LED. */
        HAL_GPIO_WritePin(LED_PORT, LED_PIN, on ? GPIO_PIN_RESET : GPIO_PIN_SET);
    }
}

uint8_t hal_gpio_read(hal_pin_t pin) {
    GPIO_PinState s = GPIO_PIN_SET;
    if (pin == HAL_PIN_BTN_A) {
        s = HAL_GPIO_ReadPin(BTN_A_PORT, BTN_A_PIN);
    } else if (pin == HAL_PIN_BTN_B) {
        s = HAL_GPIO_ReadPin(BTN_B_PORT, BTN_B_PIN);
    }
    return (s == GPIO_PIN_RESET) ? 1U : 0U;   /* pressed = low = 1 */
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
    return HAL_GetTick();
}

void hal_log(const char *line) {
    HAL_UART_Transmit(&huart1, (uint8_t *)line, (uint16_t)strlen(line), UART_TIMEOUT_MS);
    HAL_UART_Transmit(&huart1, (uint8_t *)"\r\n", 2U, UART_TIMEOUT_MS);
}
