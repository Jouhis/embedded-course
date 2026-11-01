// EXPECT: ZEPHYR SETUP OK
/* Zephyr blinky on the Pico. The LED is found through the devicetree alias "led0", which the
 * board file maps to GP25. Nothing here names a pin or a register. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

/* Half a period is the time the LED stays in one state. 250 ms gives a 2 Hz blink. */
#define BLINK_PERIOD_MS 250

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

int main(void)
{
    /* device_is_ready() proves the GPIO driver probed. Without this check a missing driver
     * would fail silently, so we stop and say why. */
    if (!gpio_is_ready_dt(&led)) {
        printk("LED not ready\n");
        return 0;
    }
    if (gpio_pin_configure_dt(&led, GPIO_OUTPUT_ACTIVE) < 0) {
        printk("LED configure failed\n");
        return 0;
    }

    printk("ZEPHYR SETUP OK\n");

    uint32_t toggles = 0U;
    while (1) {
        gpio_pin_toggle_dt(&led);
        toggles++;
        printk("toggle %u at %lld ms\n", toggles, k_uptime_get());
        /* k_msleep() puts this thread to sleep, so the scheduler can run other threads. */
        k_msleep(BLINK_PERIOD_MS);
    }
    return 0;
}
