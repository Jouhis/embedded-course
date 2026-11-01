/* Zephyr blinky on the Pico. The LED is found through the devicetree alias "led0", which the
 * board file maps to GP25. Nothing here names a pin or a register. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

/* TODO(learner): change this to 250 so the LED blinks twice as fast. */
#define BLINK_PERIOD_MS 500

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

int main(void)
{
    if (!gpio_is_ready_dt(&led)) {
        printk("LED not ready\n");
        return 0;
    }
    if (gpio_pin_configure_dt(&led, GPIO_OUTPUT_ACTIVE) < 0) {
        printk("LED configure failed\n");
        return 0;
    }

    /* TODO(learner): print the line "ZEPHYR SETUP OK" once, here, before the loop. */

    uint32_t toggles = 0U;
    while (1) {
        gpio_pin_toggle_dt(&led);
        /* TODO(learner): add 1 to toggles here, then print "toggle N at X ms" with
         * printk(), where N is toggles and X is k_uptime_get(). */
        k_msleep(BLINK_PERIOD_MS);
    }
    return 0;
}
