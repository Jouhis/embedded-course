/* Logging and a shell. The shell and the logger are turned on in prj.conf. Finish the TODOs,
 * then type "help" in the serial monitor to see your commands. */
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
    /* TODO(learner): drive the LED high with gpio_pin_set_dt(), and print "LED on". */
    shell_print(sh, "LED on (TODO)");
    return 0;
}

static int cmd_led_off(const struct shell *sh, size_t argc, char **argv)
{
    ARG_UNUSED(argc);
    ARG_UNUSED(argv);
    /* TODO(learner): drive the LED low, and print "LED off". */
    shell_print(sh, "LED off (TODO)");
    return 0;
}

/* TODO(learner): add a SHELL_CMD(toggle, ...) entry for gpio_pin_toggle_dt(). */
SHELL_STATIC_SUBCMD_SET_CREATE(sub_led,
    SHELL_CMD(on, NULL, "Turn the LED on", cmd_led_on),
    SHELL_CMD(off, NULL, "Turn the LED off", cmd_led_off),
    SHELL_SUBCMD_SET_END
);
SHELL_CMD_REGISTER(led, &sub_led, "Control the LED", NULL);

static int cmd_temp(const struct shell *sh, size_t argc, char **argv)
{
    /* TODO(learner): check argc, parse argv[1] with strtol(argv[1], NULL, 0), convert with
     * mys_raw_to_centi_c(), then print "<degrees>.<hundredths> C" with shell_print(). */
    ARG_UNUSED(argc);
    ARG_UNUSED(argv);
    shell_print(sh, "temp: TODO");
    return -EINVAL;
}
SHELL_CMD_ARG_REGISTER(temp, NULL, "Convert a MYS-1 raw count to degrees C", cmd_temp, 2, 0);

int main(void)
{
    if (!gpio_is_ready_dt(&led) || gpio_pin_configure_dt(&led, GPIO_OUTPUT_INACTIVE) < 0) {
        LOG_ERR("LED setup failed");
        return 0;
    }
    /* TODO(learner): log "shell ready" with LOG_INF(). It appears before the shell prompt. */
    return 0;
}
