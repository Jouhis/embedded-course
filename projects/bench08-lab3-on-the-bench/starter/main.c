/* Bench lab 8: Lab 3 on a real Pico 2. Lab 3's main.c, unchanged except for this comment.
 * Sensor (an NTC on the ADC, sensor_ntc.c), OLED (SSD1306), two buttons with interrupts, a menu state machine,
 * non-blocking timing and UART logging. Every task runs from one super-loop with
 * deadlines, and no call waits for hardware except the bounded I2C transfers. */
#include <stdio.h>

#include "pico/stdlib.h"
#include "display.h"
#include "sensor.h"
#include "ui.h"

#define SAMPLE_PERIOD_MS  200u
#define DRAW_PERIOD_MS    500u
#define LOG_PERIOD_MS     1000u

/* Wrap-safe deadline check. The millisecond counter wraps after about 49 days, and
 * the signed difference still compares correctly across the wrap (lesson 55). */
static bool due(uint32_t now, uint32_t deadline) {
    return (int32_t)(now - deadline) >= 0;
}

int main(void) {
    stdio_init_all();

    /* Bring up each subsystem in order. The sensor first, because it sets up the I2C bus. */
    if (!sensor_init() || !display_init() || !ui_init()) {
        printf("LAB3 init failed\n");
        while (true) {
            sleep_ms(1000);
        }
    }
    printf("LAB3 OK\n");

    uint32_t start = to_ms_since_boot(get_absolute_time());
    uint32_t next_sample = start;
    uint32_t next_draw = start;
    uint32_t next_log = start;
    bool sensor_error = false;

    while (true) {
        /* Presses recorded by the ISR. This call never waits. */
        ui_poll_buttons();

        uint32_t now = to_ms_since_boot(get_absolute_time());

        if (due(now, next_sample)) {
            next_sample += SAMPLE_PERIOD_MS;
            float celsius = 0.0f;
            switch (sensor_poll(&celsius)) {
                case SENSOR_NEW_SAMPLE:
                    ui_on_sample(celsius);
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
            display_flush();
        }

        if (due(now, next_log)) {
            next_log += LOG_PERIOD_MS;
            ui_status_t s = ui_status();
            if (s.have_sample) {
                printf("LAB3 T=%.2f MIN=%.2f MAX=%.2f ALARM=%d SET=%d SCREEN=%s\n",
                       s.last, s.min, s.max, s.alarm ? 1 : 0, s.setpoint,
                       ui_screen_name(s.screen));
            } else {
                printf("LAB3 T=none SET=%d SCREEN=%s\n", s.setpoint, ui_screen_name(s.screen));
            }
        }
    }
}
