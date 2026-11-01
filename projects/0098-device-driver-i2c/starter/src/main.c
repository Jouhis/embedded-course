/* Driver model, GPIO and I2C. The button is set up below; the MYS-1 sensor is yours to add. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/sys/printk.h>
#include <zephyr/sys/util.h>

#define MYS_REG_WHO_AM_I    0x0Fu
#define MYS_WHO_AM_I_VALUE  0xA7u

static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);
static struct gpio_callback button_cb;
static volatile uint32_t presses;

/* TODO(learner): count presses here. The callback runs in interrupt context, so keep it to
 * an increment. */
static void button_pressed(const struct device *port, struct gpio_callback *cb, uint32_t pins)
{
    ARG_UNUSED(port);
    ARG_UNUSED(cb);
    ARG_UNUSED(pins);
}

int main(void)
{
    if (!gpio_is_ready_dt(&button)) {
        printk("button not ready\n");
        return 0;
    }
    if (gpio_pin_configure_dt(&button, GPIO_INPUT) < 0) {
        printk("button setup failed\n");
        return 0;
    }
    /* TODO(learner): call gpio_pin_interrupt_configure_dt(&button, GPIO_INT_EDGE_TO_ACTIVE),
     * then gpio_init_callback(&button_cb, button_pressed, BIT(button.pin)) and
     * gpio_add_callback_dt(&button, &button_cb). */

    /* TODO(learner): once the sensor node exists in the overlay, add
     *   static const struct i2c_dt_spec sensor = I2C_DT_SPEC_GET(DT_NODELABEL(mystery));
     * at file scope, and in main() check i2c_is_ready_dt(), write 0x0F, read one byte with
     * i2c_write_read_dt(), and print "MYSTERY WHO_AM_I 0x%02x" if it equals 0xA7. */

    while (1) {
        k_sleep(K_SECONDS(2));
        printk("button presses %u\n", presses);
    }
    return 0;
}
