/* Lab 3 starter: environment monitor.
 * The skeleton runs a super-loop with three deadlines (sample, draw, log). The
 * subsystems are TODO(learner): sensor.c, display.c and ui.c. Work through the
 * milestones in the lab text, and the solution is in ../solution. */
#include <stdio.h>

#include "pico/stdlib.h"
#include "display.h"
#include "sensor.h"
#include "ui.h"

#define SAMPLE_PERIOD_MS  200u
#define DRAW_PERIOD_MS    500u
#define LOG_PERIOD_MS     1000u

/* Wrap-safe deadline check. Compare the signed difference, not the raw values. */
static bool due(uint32_t now, uint32_t deadline) {
    return (int32_t)(now - deadline) >= 0;
}

int main(void) {
    stdio_init_all();

    /* TODO(learner): call sensor_init(), display_init() and ui_init(). Print
     * "LAB3 OK" once, only when all three return true. Until then, report which one failed. */
    bool ready = false;
    (void)ready;
    printf("LAB3 starter: subsystems not initialised yet (TODO)\n");

    uint32_t start = to_ms_since_boot(get_absolute_time());
    uint32_t next_sample = start;
    uint32_t next_draw = start;
    uint32_t next_log = start;
    bool sensor_error = false;

    while (true) {
        /* TODO(learner): call ui_poll_buttons() here. It must never block. */

        uint32_t now = to_ms_since_boot(get_absolute_time());

        if (due(now, next_sample)) {
            next_sample += SAMPLE_PERIOD_MS;
            /* TODO(learner): poll the sensor. On SENSOR_NEW_SAMPLE call ui_on_sample();
             * on SENSOR_ERROR set sensor_error; on SENSOR_IDLE do nothing. */
            (void)sensor_error;
        }

        if (due(now, next_draw)) {
            next_draw += DRAW_PERIOD_MS;
            /* TODO(learner): ui_draw(sensor_error) and display_flush(). */
        }

        if (due(now, next_log)) {
            next_log += LOG_PERIOD_MS;
            /* TODO(learner): print one line with ui_status(). Use the format in the lab text:
             * LAB3 T=... MIN=... MAX=... ALARM=... SET=... SCREEN=... */
        }
    }
}
