// EXPECT: shell ready
/* Logging and a shell over the Pico's UART. Type "help" in the serial monitor to see the
 * commands. "led on|off|toggle" drives the LED, and "temp <raw>" converts a MYS-1 count. */
#include <errno.h>
#include <stdlib.h>
#include <zephyr/kernel.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/logging/log.h>
#include <zephyr/shell/shell.h>
#include "temp_format.h"

LOG_MODULE_REGISTER(app, LOG_LEVEL_INF);

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

static int cmd_led_on(const struct shell *sh, size_t argc, char **argv)
{
    ARG_UNUSED(argc);
    ARG_UNUSED(argv);
    gpio_pin_set_dt(&led, 1);
    shell_print(sh, "LED on");
    return 0;
}

static int cmd_led_off(const struct shell *sh, size_t argc, char **argv)
{
    ARG_UNUSED(argc);
    ARG_UNUSED(argv);
    gpio_pin_set_dt(&led, 0);
    shell_print(sh, "LED off");
    return 0;
}

static int cmd_led_toggle(const struct shell *sh, size_t argc, char **argv)
{
    ARG_UNUSED(argc);
    ARG_UNUSED(argv);
    gpio_pin_toggle_dt(&led);
    shell_print(sh, "LED toggled");
    return 0;
}

/* A subcommand set: "led" is the parent, and on/off/toggle are its children. */
SHELL_STATIC_SUBCMD_SET_CREATE(sub_led,
    SHELL_CMD(on, NULL, "Turn the LED on", cmd_led_on),
    SHELL_CMD(off, NULL, "Turn the LED off", cmd_led_off),
    SHELL_CMD(toggle, NULL, "Toggle the LED", cmd_led_toggle),
    SHELL_SUBCMD_SET_END
);
SHELL_CMD_REGISTER(led, &sub_led, "Control the LED", NULL);

static int cmd_temp(const struct shell *sh, size_t argc, char **argv)
{
    if (argc != 2) {
        shell_error(sh, "usage: temp <raw count>");
        return -EINVAL;
    }
    long raw = strtol(argv[1], NULL, 0);     /* base 0: accepts 1440 or 0x5a0 */
    if (raw < INT16_MIN || raw > INT16_MAX) {
        shell_error(sh, "raw count must fit in 16 bits");
        return -ERANGE;
    }
    int32_t centi = mys_raw_to_centi_c((int16_t)raw);
    int32_t mag = centi < 0 ? -centi : centi;
    LOG_DBG("raw %ld -> %d centi-C", raw, (int)centi);
    shell_print(sh, "%s%ld.%02ld C", centi < 0 ? "-" : "",
                (long)(mag / 100), (long)(mag % 100));
    return 0;
}
SHELL_CMD_ARG_REGISTER(temp, NULL, "Convert a MYS-1 raw count to degrees C", cmd_temp, 2, 0);

int main(void)
{
    if (!gpio_is_ready_dt(&led) || gpio_pin_configure_dt(&led, GPIO_OUTPUT_INACTIVE) < 0) {
        LOG_ERR("LED setup failed");
        return 0;
    }
    /* With the shell on, the log goes out through the shell's log backend, so this line
     * appears in the serial monitor just before the prompt. */
    LOG_INF("shell ready");
    /* The shell runs in its own thread, started by the kernel. main() can return. */
    return 0;
}
