/* app.c: the super-loop of the monitor, ported from Lab 3's main.c.
 *
 * Deadlines (milliseconds): sample the sensor every 200 ms, redraw every 500 ms, log every
 * second. Buttons are polled on every pass of the loop. No call waits for hardware except the
 * bounded I2C transfers, so a press is handled within one pass of the loop. */
#include <stdbool.h>
#include <stdint.h>

#include "app.h"
#include "display.h"
#include "format.h"
#include "hal.h"
#include "sensor.h"
#include "ui.h"

#define SAMPLE_PERIOD_MS  200u
#define DRAW_PERIOD_MS    500u
#define LOG_PERIOD_MS     1000u

/* Wrap-safe deadline check. The millisecond counter wraps after about 49 days, and the signed
 * difference still compares correctly across the wrap (lesson 73). */
static bool due(uint32_t now, uint32_t deadline) {
    return (int32_t)(now - deadline) >= 0;
}

/* One log line, in the same format as Lab 3 with the prefix LAB4. */
static void log_status(void) {
    ui_status_t s = ui_status();
    char num[16];
    char line[96];
    size_t len = 0U;

    line[0] = '\0';
    if (s.have_sample) {
        len = str_append(line, sizeof line, len, "LAB4 T=");
        fmt_centi(num, sizeof num, s.last);
        len = str_append(line, sizeof line, len, num);
        len = str_append(line, sizeof line, len, " MIN=");
        fmt_centi(num, sizeof num, s.min);
        len = str_append(line, sizeof line, len, num);
        len = str_append(line, sizeof line, len, " MAX=");
        fmt_centi(num, sizeof num, s.max);
        len = str_append(line, sizeof line, len, num);
        len = str_append(line, sizeof line, len, s.alarm ? " ALARM=1" : " ALARM=0");
    } else {
        len = str_append(line, sizeof line, len, "LAB4 T=none");
    }
    len = str_append(line, sizeof line, len, " SET=");
    fmt_int(num, sizeof num, s.setpoint);
    len = str_append(line, sizeof line, len, num);
    len = str_append(line, sizeof line, len, " SCREEN=");
    str_append(line, sizeof line, len, ui_screen_name(s.screen));
    hal_log(line);
}

void app_run(void) {
    hal_init();
    ui_init();

    /* The sensor first, because it is the device that the bus setup serves first. */
    if (!sensor_init() || !display_init()) {
        hal_log("LAB4 init failed");
        for (;;) {
            /* Halt here: the log says what failed, and nothing else runs. */
        }
    }
    hal_log("LAB4 OK");

    uint32_t start = hal_millis();
    uint32_t next_sample = start;
    uint32_t next_draw = start;
    uint32_t next_log = start;
    bool sensor_error = false;

    for (;;) {
        /* Button presses are handled here, in the loop, and never block it. */
        (void)ui_poll(hal_millis());

        uint32_t now = hal_millis();

        if (due(now, next_sample)) {
            next_sample += SAMPLE_PERIOD_MS;
            int32_t centi = 0;
            switch (sensor_poll(&centi)) {
                case SENSOR_NEW_SAMPLE:
                    ui_on_sample(centi);
                    sensor_error = false;
                    break;
                case SENSOR_ERROR:
                    sensor_error = true;
                    break;
                case SENSOR_IDLE:
                    break;
            }
        }

        if (due(now, next_draw)) {
            next_draw += DRAW_PERIOD_MS;
            ui_draw(sensor_error);
            (void)display_flush();              /* a failed transfer skips this frame */
            hal_gpio_write(HAL_PIN_LED, ui_status().alarm ? 1U : 0U);
        }

        if (due(now, next_log)) {
            next_log += LOG_PERIOD_MS;
            log_status();
        }
    }
}
