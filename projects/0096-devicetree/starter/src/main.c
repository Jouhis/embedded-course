/* Blinky through the devicetree. led0 comes from the board; the second LED and the button
 * come from boards/rpi_pico.overlay, which you will write. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

static const struct gpio_dt_spec led0 = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

/* TODO(learner): once the overlay defines aliases led1 and sw0, add:
 *   static const struct gpio_dt_spec led1 = GPIO_DT_SPEC_GET(DT_ALIAS(led1), gpios);
 *   static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);
 * then configure them, and in the loop set led1 to gpio_pin_get_dt(&button). */

int main(void)
{
    if (!gpio_is_ready_dt(&led0) || gpio_pin_configure_dt(&led0, GPIO_OUTPUT_ACTIVE) < 0) {
        return 0;
    }
    while (1) {
        gpio_pin_toggle_dt(&led0);
        printk("LED toggled at %lld ms\n", k_uptime_get());
        k_msleep(500);
    }
    return 0;
}
