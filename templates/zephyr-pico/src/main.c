/* Zephyr blinky: the LED comes from the devicetree alias "led0". */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

int main(void)
{
    if (!gpio_is_ready_dt(&led) || gpio_pin_configure_dt(&led, GPIO_OUTPUT_ACTIVE) < 0) {
        return 0;
    }
    while (1) {
        gpio_pin_toggle_dt(&led);
        printk("LED toggled at %lld ms\n", k_uptime_get());
        k_msleep(500);
    }
    return 0;
}
