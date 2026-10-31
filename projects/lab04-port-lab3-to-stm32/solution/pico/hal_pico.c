/* hal_pico.c: the Raspberry Pi Pico implementation of hal.h, with the Pico SDK.
 *
 *   LED           GP25, the on-board LED (active high)
 *   Button A      GP14, to GND, internal pull-up
 *   Button B      GP15, to GND, internal pull-up
 *   I2C0 SDA/SCL  GP4 / GP5, 400 kHz, with the pull-ups on the board wiring
 *   Serial log    stdio over UART (stdio_init_all, pico_enable_stdio_uart in CMake)
 *
 * This file is the worked example for the Blue Pill port. The application in ../../app is
 * the same on both boards and calls only hal.h. */
#include <stdio.h>

#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "pico/stdlib.h"
#include "pico/time.h"
#include "hal.h"

#define LED_PIN          PICO_DEFAULT_LED_PIN   /* GP25 on the Pico board, active high */
#define BTN_A_PIN        14u
#define BTN_B_PIN        15u
#define I2C_BUS          i2c0
#define PIN_SDA          4u
#define PIN_SCL          5u
#define I2C_BAUD_HZ      400000u                /* fast mode; the Lab 3 bus rate */
#define I2C_TIMEOUT_US   10000u                 /* a missing device costs 10 ms, not forever */
#define I2C_MAX_LEN      0x7FFFu                /* the SDK returns an int byte count */

void hal_init(void) {
    stdio_init_all();

    gpio_init(LED_PIN);
    gpio_set_dir(LED_PIN, GPIO_OUT);

    gpio_init(BTN_A_PIN);
    gpio_set_dir(BTN_A_PIN, GPIO_IN);
    gpio_pull_up(BTN_A_PIN);
    gpio_init(BTN_B_PIN);
    gpio_set_dir(BTN_B_PIN, GPIO_IN);
    gpio_pull_up(BTN_B_PIN);

    i2c_init(I2C_BUS, I2C_BAUD_HZ);
    gpio_set_function(PIN_SDA, GPIO_FUNC_I2C);
    gpio_set_function(PIN_SCL, GPIO_FUNC_I2C);
    gpio_pull_up(PIN_SDA);
    gpio_pull_up(PIN_SCL);
}

void hal_gpio_write(hal_pin_t pin, uint8_t on) {
    if (pin == HAL_PIN_LED) {
        gpio_put(LED_PIN, on ? 1 : 0);      /* the Pico LED is active high */
    }
}

uint8_t hal_gpio_read(hal_pin_t pin) {
    if (pin == HAL_PIN_BTN_A) {
        return gpio_get(BTN_A_PIN) ? 0U : 1U;   /* pressed pulls the pin low */
    }
    if (pin == HAL_PIN_BTN_B) {
        return gpio_get(BTN_B_PIN) ? 0U : 1U;
    }
    return 0U;
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len) {
    if (len == 0U || len > I2C_MAX_LEN) {
        return -1;
    }
    int sent = i2c_write_timeout_us(I2C_BUS, addr7, data, len, false, I2C_TIMEOUT_US);
    return (sent == (int)len) ? 0 : -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len) {
    if (len == 0U || len > I2C_MAX_LEN) {
        return -1;
    }
    int got = i2c_read_timeout_us(I2C_BUS, addr7, data, len, false, I2C_TIMEOUT_US);
    return (got == (int)len) ? 0 : -1;
}

uint32_t hal_millis(void) {
    return to_ms_since_boot(get_absolute_time());
}

void hal_log(const char *line) {
    printf("%s\n", line);
}
