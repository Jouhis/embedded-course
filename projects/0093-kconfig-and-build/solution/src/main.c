// EXPECT: KCONFIG OK
/* Blinky with logging. The Kconfig options that turn logging on live in prj.conf, and the
 * LOG_* macros below compile to nothing when CONFIG_LOG is off. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/logging/log.h>
#include <zephyr/sys/printk.h>

/* Each file names its own log module. The level here is the compile-time limit for this file;
 * LOG_DBG lines below it are removed from the binary. */
LOG_MODULE_REGISTER(app, LOG_LEVEL_DBG);

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

int main(void)
{
    if (!gpio_is_ready_dt(&led)) {
        LOG_ERR("LED device not ready");
        return 0;
    }
    if (gpio_pin_configure_dt(&led, GPIO_OUTPUT_ACTIVE) < 0) {
        LOG_ERR("LED configure failed");
        return 0;
    }

    LOG_INF("KCONFIG OK, blinking every 500 ms");

    while (1) {
        gpio_pin_toggle_dt(&led);
        /* Debug output for every toggle. printk() below is not filtered by log levels. */
        LOG_DBG("LED level now %d", gpio_pin_get_dt(&led));
        printk("LED toggled at %lld ms\n", k_uptime_get());
        k_msleep(500);
    }
    return 0;
}
