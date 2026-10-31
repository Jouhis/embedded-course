/* hal_zephyr.c: the Raspberry Pi Pico implementation of hal.h, on Zephyr's GPIO and I2C APIs.
 *
 * The pins and the devices come from the devicetree (boards/rpi_pico.overlay), so this file
 * names no GPIO port or pin number. It also starts the log thread: hal_log() queues a line,
 * and the thread prints it, so the UI thread never waits for the UART.
 *
 * Threading: the I2C bus is shared by the sensor thread and the UI thread, so each transfer
 * takes i2c_lock. The lock has a timeout, so a stuck device cannot stop the whole monitor. */
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

/* One full framebuffer flush at 400 kHz takes about 25 ms. The lock waits longer than that, so
 * a sensor read queued behind a display flush does not time out by mistake. */
#define I2C_LOCK_TIMEOUT_MS  100
#define LOG_LINE_MAX         96
#define LOG_QUEUE_DEPTH      8
#define LOG_STACK_SIZE       1024

/* The application's addresses (app/sensor.c, app/ssd1306.c) must match the devicetree. A wrong
 * reg value fails the build here, instead of showing up as "SENSOR ERR" on the screen. */
BUILD_ASSERT(DT_REG_ADDR(DT_NODELABEL(oled)) == 0x3C, "the Lab 4 application expects the OLED at 0x3C");
BUILD_ASSERT(DT_REG_ADDR(DT_NODELABEL(mystery)) == 0x48, "the Lab 4 application expects the MYS-1 at 0x48");

/* Indexed by hal_pin_t, so each HAL pin maps to one devicetree node. */
static const struct gpio_dt_spec pins[HAL_PIN_COUNT] = {
    [HAL_PIN_LED]   = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios),
    [HAL_PIN_BTN_A] = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios),
    [HAL_PIN_BTN_B] = GPIO_DT_SPEC_GET(DT_ALIAS(sw1), gpios),
};

static const struct device *const i2c_bus = DEVICE_DT_GET(DT_NODELABEL(i2c0));

K_MUTEX_DEFINE(i2c_lock);

struct log_line {
    char text[LOG_LINE_MAX];
};
K_MSGQ_DEFINE(log_q, sizeof(struct log_line), LOG_QUEUE_DEPTH, 4);
static volatile uint32_t log_dropped;   /* lines lost because the queue was full */

static void log_thread(void *p1, void *p2, void *p3)
{
    ARG_UNUSED(p1);
    ARG_UNUSED(p2);
    ARG_UNUSED(p3);
    struct log_line line;
    while (1) {
        /* Sleeps until hal_log() queues a line. The UART is slow, so it stays off the UI path. */
        k_msgq_get(&log_q, &line, K_FOREVER);
        printk("%s\n", line.text);
    }
}
K_THREAD_DEFINE(log_tid, LOG_STACK_SIZE, log_thread, NULL, NULL, NULL,
                K_PRIO_PREEMPT(8), 0, 0);

void hal_init(void)
{
    for (int i = 0; i < HAL_PIN_COUNT; i++) {
        if (!gpio_is_ready_dt(&pins[i])) {
            printk("hal: GPIO for pin %d is not ready\n", i);
        }
    }
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
        /* gpio_pin_set_dt() applies the active-high flag from the overlay, so 1 lights the LED. */
        gpio_pin_set_dt(&pins[pin], on ? 1 : 0);
    }
}

uint8_t hal_gpio_read(hal_pin_t pin)
{
    if (pin == HAL_PIN_BTN_A || pin == HAL_PIN_BTN_B) {
        /* The logical level: 1 while pressed, because the overlay marks the buttons active low. */
        return gpio_pin_get_dt(&pins[pin]) > 0 ? 1U : 0U;
    }
    return 0U;
}

int hal_i2c_write(uint8_t addr7, const uint8_t *data, size_t len)
{
    if (len == 0U || len > UINT32_MAX) {
        return -1;
    }
    if (k_mutex_lock(&i2c_lock, K_MSEC(I2C_LOCK_TIMEOUT_MS)) != 0) {
        return -1;
    }
    int rc = i2c_write(i2c_bus, data, (uint32_t)len, addr7);
    k_mutex_unlock(&i2c_lock);
    return rc == 0 ? 0 : -1;
}

int hal_i2c_read(uint8_t addr7, uint8_t *data, size_t len)
{
    if (len == 0U || len > UINT32_MAX) {
        return -1;
    }
    if (k_mutex_lock(&i2c_lock, K_MSEC(I2C_LOCK_TIMEOUT_MS)) != 0) {
        return -1;
    }
    int rc = i2c_read(i2c_bus, data, (uint32_t)len, addr7);
    k_mutex_unlock(&i2c_lock);
    return rc == 0 ? 0 : -1;
}

uint32_t hal_millis(void)
{
    return k_uptime_get_32();
}

void hal_log(const char *line)
{
    struct log_line item;
    size_t n = strlen(line);
    if (n >= sizeof item.text) {
        n = sizeof item.text - 1U;      /* truncate rather than overflow the queue slot */
    }
    memcpy(item.text, line, n);
    item.text[n] = '\0';
    /* K_NO_WAIT: a full queue drops the line and counts it, instead of blocking the caller. */
    if (k_msgq_put(&log_q, &item, K_NO_WAIT) != 0) {
        log_dropped++;
    }
}
