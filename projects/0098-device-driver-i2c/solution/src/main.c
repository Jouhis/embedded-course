// EXPECT: MYSTERY WHO_AM_I 0xa7
// SIM: skip Zephyr's RP2040 I2C driver gets no answer from the chip in Wokwi (timeout -116); the Pico SDK version (0063) runs
/* Read the MYS-1 sensor over I2C through the driver model, and count button presses with a
 * GPIO interrupt. Both devices are described in boards/rpi_pico.overlay. */
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/sys/printk.h>
#include <zephyr/sys/util.h>

#define MYS_REG_WHO_AM_I    0x0Fu   /* datasheet section 3.1 */
#define MYS_WHO_AM_I_VALUE  0xA7u   /* fixed identity value, reset value of WHO_AM_I */

/* I2C_DT_SPEC_GET() bundles the bus device (the parent of the node, i2c0) and the address
 * (the reg property, 0x48) into one struct. */
static const struct i2c_dt_spec sensor = I2C_DT_SPEC_GET(DT_NODELABEL(mystery));
static const struct gpio_dt_spec button = GPIO_DT_SPEC_GET(DT_ALIAS(sw0), gpios);

static struct gpio_callback button_cb;
static volatile uint32_t presses;

/* GPIO callbacks run in interrupt context. Keep them to a counter increment. */
static void button_pressed(const struct device *port, struct gpio_callback *cb, uint32_t pins)
{
    ARG_UNUSED(port);
    ARG_UNUSED(cb);
    ARG_UNUSED(pins);
    presses++;
}

/* Write the register pointer, then read one byte. i2c_write_read_dt() sends a repeated start
 * between the two phases, as the datasheet's "read one register" sequence requires. */
static int read_who_am_i(uint8_t *id)
{
    uint8_t reg = MYS_REG_WHO_AM_I;
    return i2c_write_read_dt(&sensor, &reg, 1, id, 1);
}

int main(void)
{
    /* Ready checks: the bus driver and the GPIO driver must have probed. */
    if (!i2c_is_ready_dt(&sensor)) {
        printk("I2C bus not ready\n");
        return 0;
    }
    if (!gpio_is_ready_dt(&button)) {
        printk("button not ready\n");
        return 0;
    }
    if (gpio_pin_configure_dt(&button, GPIO_INPUT) < 0 ||
        gpio_pin_interrupt_configure_dt(&button, GPIO_INT_EDGE_TO_ACTIVE) < 0) {
        printk("button setup failed\n");
        return 0;
    }
    /* The callback is registered for this pin only: BIT(pin) is the pin's bit in the mask. */
    gpio_init_callback(&button_cb, button_pressed, BIT(button.pin));
    gpio_add_callback_dt(&button, &button_cb);

    uint8_t id = 0;
    int rc = read_who_am_i(&id);
    if (rc != 0) {
        printk("MYSTERY no answer, error %d\n", rc);
    } else if (id != MYS_WHO_AM_I_VALUE) {
        printk("MYSTERY wrong id 0x%02x\n", id);
    } else {
        printk("MYSTERY WHO_AM_I 0x%02x\n", id);
    }

    while (1) {
        k_sleep(K_SECONDS(2));
        printk("button presses %u\n", presses);
    }
    return 0;
}
