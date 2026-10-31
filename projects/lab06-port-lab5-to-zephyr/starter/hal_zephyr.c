/* hal_zephyr.c: the Pico implementation of hal.h on Zephyr's GPIO and I2C APIs.
 * Finish the TODO(learner) functions. The solution has the full versions. */
#include <stdbool.h>
#include <string.h>

#include <zephyr/device.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/kernel.h>
#include <zephyr/sys/printk.h>
#include <zephyr/sys/util.h>

#include "hal.h"

#define I2C_LOCK_TIMEOUT_MS  100

/* TODO(learner): once the overlay has the OLED and the mystery chip, un-comment these. They
 * fail the build if an address in the overlay differs from the one the application uses.
 * BUILD_ASSERT(DT_REG_ADDR(DT_NODELABEL(oled)) == 0x3C, "the OLED is at 0x3C");
 * BUILD_ASSERT(DT_REG_ADDR(DT_NODELABEL(mystery)) == 0x48, "the MYS-1 is at 0x48"); */

static const struct gpio_dt_spec pins[HAL_PIN_COUNT] = {
    [HAL_PIN_LED]   = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios),
    [HAL_PIN_BTN_A] = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios),
    [HAL_PIN_BTN_B] = GPIO_DT_SPEC_GET(DT_ALIAS(sw1), gpios),
};

static const struct device *const i2c_bus = DEVICE_DT_GET(DT_NODELABEL(i2c0));

/* TODO(learner): declare the mutex that guards the I2C bus: K_MUTEX_DEFINE(i2c_lock). */

void hal_init(void)
{
    if (gpio_pin_configure_dt(&pins[HAL_PIN_LED], GPIO_OUTPUT_INACTIVE) < 0 ||
        gpio_pin_configure_dt(&pins[HAL_PIN_BTN_A], GPIO_INPUT) < 0 ||
        gpio_pin_configure_dt(&pins[HAL_PIN_BTN_B], GPIO_INPUT) < 0) {
        printk("hal: pin configuration failed\n");
    }
    if (!device_is_ready(i2c_bus)) {
        printk("hal: i2c0 is not ready\n");
    }
}

void hal_gpio_write(hal_pin_t pin, uint8_t on)
{
    if (pin == HAL_PIN_LED) {
        gpio_pin_set_dt(&pins[pin], on ? 1 : 0);
    }
}

uint8_t hal_gpio_read(hal_pin_t pin)
{
    /* TODO(learner): for the two buttons, return 1 while pressed. gpio_pin_get_dt() already
     * gives the logical level (the overlay marks the buttons active low). */
    (void)pin;
    return 0U;
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len)
{
    /* TODO(learner): take i2c_lock with K_MSEC(I2C_LOCK_TIMEOUT_MS) before the transfer, and
     * unlock it after. Return -1 if the lock times out. */
    if (len == 0U || len > UINT32_MAX) {
        return -1;
    }
    int rc = i2c_write(i2c_bus, data, (uint32_t)len, addr7);
    return rc == 0 ? 0 : -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len)
{
    /* TODO(learner): the same locking as hal_i2c_write(). */
    if (len == 0U || len > UINT32_MAX) {
        return -1;
    }
    int rc = i2c_read(i2c_bus, data, (uint32_t)len, addr7);
    return rc == 0 ? 0 : -1;
}

uint32_t hal_millis(void)
{
    return k_uptime_get_32();
}

void hal_log(const char *line)
{
    /* TODO(learner): queue the line on a message queue, and let a log thread print it, so the
     * UI thread never waits for the UART. For now it prints directly. */
    printk("%s\n", line);
}
