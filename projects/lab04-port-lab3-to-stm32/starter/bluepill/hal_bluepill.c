/* hal_bluepill.c: the STM32F103C8 Blue Pill implementation of hal.h. This is the STARTER.
 * Your task: fill in every TODO(learner). hal_pico.c in ../pico is the finished example,
 * so compare with it when you are stuck. The pin plan is:
 *
 *   LED           PC13, active low (the on-board LED)
 *   Button A      PB12, to GND, internal pull-up
 *   Button B      PB13, to GND, internal pull-up
 *   I2C1 SCL/SDA  PB6 / PB7 (the I2C1 pins on the default mapping, STM32F103x8 datasheet pinout)
 *   USART1 TX     PA9, 115200 baud (serial log)
 *
 * The clock is the default 8 MHz HSI. HAL_Init() starts SysTick at 1 kHz, and
 * SysTick_Handler() calls HAL_IncTick() so that HAL_GetTick() counts milliseconds. */
#include <string.h>
#include "hal.h"
#include "stm32f1xx_hal.h"

#define LED_PORT       GPIOC
#define LED_PIN        GPIO_PIN_13
#define BTN_A_PORT     GPIOB
#define BTN_A_PIN      GPIO_PIN_12
#define BTN_B_PORT     GPIOB
#define BTN_B_PIN      GPIO_PIN_13
#define I2C_TIMEOUT_MS  100U
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

    /* TODO(learner): configure the LED (PC13, push-pull output, start it off: the LED is
     * active low, so the pin must go high), then the two buttons (PB12 and PB13, inputs
     * with the pull-up). Use a GPIO_InitTypeDef, as the USART block below does. */

    /* TODO(learner): configure USART1 TX (PA9) and the baud rate, then HAL_UART_Init().
     * The pico board file gets its serial log from stdio_init_all(), so this step is the
     * Blue Pill equivalent. */

    /* TODO(learner): configure PB6 (SCL) and PB7 (SDA) as alternate-function open-drain, then
     * set up hi2c1 for 100 kHz, 7-bit addressing, and call HAL_I2C_Init(&hi2c1). Without this
     * the display and the sensor do not answer. */
}

void hal_gpio_write(hal_pin_t pin, uint8_t on) {
    /* TODO(learner): drive the LED pin. Active low: on = 1 must drive the pin low. */
    (void)pin;
    (void)on;
}

uint8_t hal_gpio_read(hal_pin_t pin) {
    /* TODO(learner): read BTN_A_PIN or BTN_B_PIN with HAL_GPIO_ReadPin. A pressed button
     * reads low, so return 1 when the pin is GPIO_PIN_RESET. Until you write this, the
     * buttons never register a press. */
    (void)pin;
    return 0U;
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    /* TODO(learner): send len bytes to addr7 with HAL_I2C_Master_Transmit. The HAL takes the
     * 8-bit address, so shift addr7 left by one. Return 0 on HAL_OK and -1 otherwise. */
    (void)addr7;
    (void)data;
    (void)len;
    return -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    /* TODO(learner): the receive side, with HAL_I2C_Master_Receive. Set the read bit
     * (bit 0) in the 8-bit address. */
    (void)addr7;
    (void)data;
    (void)len;
    return -1;
}

uint32_t hal_millis(void) {
    return HAL_GetTick();
}

void hal_log(const char *line) {
    /* TODO(learner): send the line over USART1 with HAL_UART_Transmit, then the CRLF line
     * ending. Until this works the serial monitor prints nothing. */
    (void)line;
}
