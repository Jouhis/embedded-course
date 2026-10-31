// EXPECT: DEVICETREE OK
/* Two LEDs and a button, all found through devicetree aliases. The C code never names a
 * pin number or a port: the pins are in boards/rpi_pico.overlay. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

#define BLINK_PERIOD_MS 500u
#define POLL_PERIOD_MS  10      /* the button is read every 10 ms; a press lasts far longer */

/* GPIO_DT_SPEC_GET() reads the "gpios" property of the node that the alias names, and makes
 * a struct with the port, the pin and the flags (active low, pull-up) from the overlay. */
static const struct gpio_dt_spec led0 = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);
static const struct gpio_dt_spec led1 = GPIO_DT_SPEC_GET(DT_ALIAS(led1), gpios);
static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);

int main(void)
{
    if (!gpio_is_ready_dt(&led0) || !gpio_is_ready_dt(&led1) || !gpio_is_ready_dt(&button)) {
        printk("a device is not ready\n");
        return 0;
    }
    if (gpio_pin_configure_dt(&led0, GPIO_OUTPUT_ACTIVE) < 0 ||
        gpio_pin_configure_dt(&led1, GPIO_OUTPUT_INACTIVE) < 0 ||
        gpio_pin_configure_dt(&button, GPIO_INPUT) < 0) {
        printk("pin configuration failed\n");
        return 0;
    }

    printk("DEVICETREE OK\n");

    /* Wrap-safe deadline, the same rule as lesson 73: compare signed differences. */
    uint32_t next_blink = k_uptime_get_32();
    while (1) {
        uint32_t now = k_uptime_get_32();
        if ((int32_t)(now - next_blink) >= 0) {
            next_blink += BLINK_PERIOD_MS;
            gpio_pin_toggle_dt(&led0);
        }
        /* gpio_pin_get_dt() returns the logical level. With GPIO_ACTIVE_LOW in the overlay,
         * a pressed button (pin low) reads as 1, so led1 follows the button directly. */
        gpio_pin_set_dt(&led1, gpio_pin_get_dt(&button));
        k_msleep(POLL_PERIOD_MS);
    }
    return 0;
}
