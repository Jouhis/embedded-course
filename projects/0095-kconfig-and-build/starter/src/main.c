/* Blinky with logging. Turn logging on in prj.conf first, then finish the TODOs. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/logging/log.h>
#include <zephyr/sys/printk.h>

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

    /* TODO(learner): log one LOG_INF line here saying "KCONFIG OK, blinking every 500 ms". */

    while (1) {
        gpio_pin_toggle_dt(&led);
        /* TODO(learner): add a LOG_DBG line that prints the LED level after the toggle. */
        printk("LED toggled at %lld ms\n", k_uptime_get());
        k_msleep(500);
    }
    return 0;
}
